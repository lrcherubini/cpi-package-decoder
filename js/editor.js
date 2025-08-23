/**
 * editor.js
 *
 * Gerencia o Monaco Editor, o modal de visualização e a lógica de alternância de visualizações.
 * Delega a análise e a construção de HTML para os módulos analyzer.js e viewBuilder.js.
 */

let isRenderedView = false;

function initializeMonacoEditor(
  content,
  resourceName,
  baseFiles = {},
  guidelineReport = null
) {
  if (!monacoEditor) {
    monacoEditor = monaco.editor.create(
      document.getElementById("monacoEditor"),
      {
        value: "",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        readOnly: true,
        minimap: { enabled: true },
      }
    );
  }
  loadContentIntoMonaco(content, resourceName, baseFiles, guidelineReport);
}

function loadContentIntoMonaco(
  content,
  resourceName,
  baseFiles = {},
  guidelineReport = null
) {
  currentFiles = { ...baseFiles };
  if (guidelineReport) {
    currentFiles["guideline_report"] = guidelineReport;
  }

  fileSelect.style.display = "none";
  fileSelect.innerHTML = "";

  const zip = new JSZip();
  zip
    .loadAsync(content)
    .then((innerZip) => {
      const files = Object.keys(innerZip.files).filter(
        (name) => !innerZip.files[name].dir
      );
      const loadPromises = files.map((fileName) =>
        innerZip
          .file(fileName)
          .async("string")
          .then((scriptContent) => {
            currentFiles[fileName] = scriptContent;
          })
      );
      return Promise.all(loadPromises).then(() => files);
    })
    .catch(() => {
      currentFiles[resourceName] =
        typeof content === "string"
          ? content
          : new TextDecoder().decode(content);
      return [resourceName];
    })
    .then((files) => {
      const allFilesToShow = Object.keys(currentFiles).filter(
        (k) => k.startsWith("guideline_report") || files.includes(k)
      );
      if (allFilesToShow.length > 1) {
        fileSelect.innerHTML = "";
        allFilesToShow.forEach((fn) => {
          const opt = document.createElement("option");
          opt.value = fn;
          opt.textContent = fn.startsWith("guideline_report")
            ? "📋 Relatório de Guidelines"
            : fn;
          fileSelect.appendChild(opt);
        });
        fileSelect.style.display = "inline-block";
        const initialFile = guidelineReport ? "guideline_report" : files[0];
        fileSelect.value = initialFile;
        setEditorContent(currentFiles[initialFile], initialFile);
      } else if (allFilesToShow.length === 1) {
        setEditorContent(currentFiles[allFilesToShow[0]], allFilesToShow[0]);
      }
    });
}

function setEditorContent(content, fileName) {
  const language = detectLanguage(fileName);
  monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
  languageSelect.value = language;
  monacoEditor.setValue(
    typeof content === "object" ? JSON.stringify(content, null, 2) : content
  );
  currentFileName = fileName;

  const hasRenderedView = [
    "iflw",
    "prop",
    "propdef",
    "guideline_report",
  ].includes(fileName.split(".").pop().toLowerCase());
  viewSwitchBtn.style.display = hasRenderedView ? "inline-block" : "none";

  if (hasRenderedView) {
    isRenderedView = true;
    viewSwitchBtn.textContent = t("view_code");
    showRenderedView(content, fileName);
  } else {
    isRenderedView = false;
    renderedView.style.display = "none";
    document.getElementById("monacoEditor").style.display = "block";
  }
}

async function showRenderedView(content, fileName) {
  renderedView.innerHTML = "";
  renderedView.className = "rendered-container";
  const ext = fileName.split(".").pop().toLowerCase();

  try {
    let viewContent = "";
    switch (ext) {
      case "iflw":
        viewContent = document.createElement("iframe");
        viewContent.src = "bpmn_viewer.html";
        viewContent.onload = () =>
          viewContent.contentWindow.postMessage(content, "*");
        break;
      case "prop":
        const propDefContent = Object.values(currentFiles).find(
          (c) => typeof c === "string" && c.includes("<param_references>")
        );
        const iflowContent = Object.values(currentFiles).find(
          (c) => typeof c === "string" && c.includes("<bpmn2:definitions")
        );
        const analysisResult = await analyzeFlowParameters(
          propDefContent,
          content,
          iflowContent
        );
        viewContent = buildPropView(analysisResult);
        break;
      case "guideline_report":
        viewContent = buildGuidelineReportView(content);
        break;
      // Adicionar outros cases para 'propdef', 'mf', etc., usando o viewBuilder.js
      default:
        viewContent = t("no_view_available");
    }

    if (typeof viewContent === "string") {
      renderedView.innerHTML = viewContent;
    } else {
      renderedView.appendChild(viewContent);
    }
  } catch (e) {
    console.error("Error rendering file:", e);
    renderedView.innerHTML = `<div class="error">${t("render_error")
      .replace("{file}", fileName)
      .replace("{error}", e.message)}</div>`;
  } finally {
    renderedView.style.display = "block";
    document.getElementById("monacoEditor").style.display = "none";
  }
}

function toggleViewMode() {
  isRenderedView = !isRenderedView;
  if (isRenderedView) {
    showRenderedView(monacoEditor.getValue(), currentFileName);
    viewSwitchBtn.textContent = t("view_code");
  } else {
    renderedView.style.display = "none";
    document.getElementById("monacoEditor").style.display = "block";
    viewSwitchBtn.textContent = t("view_rendered");
  }
}

function detectLanguage(fileName) {
  if (fileName === "guideline_report") return "json";
  const ext = fileName.split(".").pop().toLowerCase().trim();
  const languageMap = {
    groovy: "groovy",
    js: "javascript",
    xml: "xml",
    iflw: "xml",
    propdef: "xml",
    json: "json",
    prop: "properties",
  };
  return languageMap[ext] || "plaintext";
}

function closeEditorModal() {
  modal.style.display = "none";
  if (isFullscreen) exitFullscreen();
}

function toggleFullscreen() {
  isFullscreen ? exitFullscreen() : enterFullscreen();
}

function enterFullscreen() {
  const modalContent = modal.querySelector(".modal-content");
  Object.assign(modalContent.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    margin: "0",
    borderRadius: "0",
  });
  fullscreenBtn.textContent = "🗗";
  isFullscreen = true;
  monacoEditor.layout();
}

function exitFullscreen() {
  const modalContent = modal.querySelector(".modal-content");
  Object.assign(modalContent.style, {
    position: "",
    top: "",
    left: "",
    width: "95%",
    height: "90%",
    margin: "2% auto",
    borderRadius: "12px",
  });
  fullscreenBtn.textContent = "⛶";
  isFullscreen = false;
  monacoEditor.layout();
}
