// Editor related functions
function initializeMonacoEditor(content, resourceName) {
  monacoEditor = monaco.editor.create(document.getElementById("monacoEditor"), {
    value: "",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    readOnly: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: "on",
    renderWhitespace: "selection",
    wordWrap: "on",
  });

  loadContentIntoMonaco(content, resourceName);
}

function loadContentIntoMonaco(content, resourceName) {
  currentFiles = {};
  fileSelect.style.display = "none";
  fileSelect.innerHTML = "";

  const zip = new JSZip();
  zip
    .loadAsync(content)
    .then((innerZip) => {
      const files = [];
      innerZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          files.push(relativePath);
        }
      });

      if (files.length === 1) {
        return innerZip
          .file(files[0])
          .async("string")
          .then((scriptContent) => {
            setEditorContent(scriptContent, files[0]);
          });
      } else if (files.length > 1) {
        const promises = files.map((fileName) => {
          return innerZip
            .file(fileName)
            .async("string")
            .then((scriptContent) => {
              currentFiles[fileName] = scriptContent;
            });
        });
        return Promise.all(promises).then(() => {
          fileSelect.innerHTML = "";
          files.forEach((fn) => {
            const opt = document.createElement("option");
            opt.value = fn;
            opt.textContent = fn;
            fileSelect.appendChild(opt);
          });
          fileSelect.style.display = "inline-block";
          fileSelect.value = files[0];
          setEditorContent(currentFiles[files[0]], files[0]);
        });
      }
    })
    .catch(() => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const textContent = e.target.result;
        setEditorContent(textContent, resourceName);
      };
      reader.readAsText(new Blob([content]));
    });
}

function detectLanguage(fileName) {
  const ext = fileName.split(".").pop().toLowerCase().trim();
  const languageMap = {
    groovy: "groovy",
    gsh: "groovy",
    js: "javascript",
    javascript: "javascript",
    xml: "xml",
    iflw: "xml",
    xsl: "xml",
    xsd: "xml",
    edmx: "xml",
    xslt: "xml",
    mmap: "xml",
    propdef: "xml",
    project: "xml",
    json: "json",
    java: "java",
    py: "python",
    sql: "sql",
    properties: "properties",
    yaml: "yaml",
    yml: "yaml",
    wsdl: "xml",
  };
  return languageMap[ext] || "plaintext";
}

function setEditorContent(content, fileName) {
  const language = detectLanguage(fileName);
  languageSelect.value = language;
  monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
  monacoEditor.setValue(content);
  currentFileName = fileName;
  if (fileName.toLowerCase().endsWith(".iflw") || fileName.toLowerCase().endsWith(".bpmn")) {
    bpmnBtn.style.display = "inline-block";
  } else {
    bpmnBtn.style.display = "none";
  }
}

function closeEditorModal() {
  modal.style.display = "none";
  modal.classList.remove("show");
  modal.querySelector(".modal-content").classList.remove("show");

  fileSelect.style.display = "none";
  fileSelect.innerHTML = "";
  currentFiles = {};
  bpmnBtn.style.display = "none";

  if (isFullscreen) {
    exitFullscreen();
  }
}

function closeBpmnViewer() {
  bpmnModal.style.display = "none";
  bpmnModal.classList.remove("show");
  bpmnModal.querySelector(".modal-content").classList.remove("show");
  bpmnFrame.src = "";
}

function toggleFullscreen() {
  if (!isFullscreen) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
}

function enterFullscreen() {
  const modalContent = modal.querySelector(".modal-content");
  modalContent.style.position = "fixed";
  modalContent.style.top = "0";
  modalContent.style.left = "0";
  modalContent.style.width = "100vw";
  modalContent.style.height = "100vh";
  modalContent.style.margin = "0";
  modalContent.style.borderRadius = "0";
  modalContent.style.zIndex = "10001";

  fullscreenBtn.textContent = "🗗";
  fullscreenBtn.title = "Sair da tela cheia";
  isFullscreen = true;

  if (monacoEditor) {
    setTimeout(() => monacoEditor.layout(), 100);
  }
}

function exitFullscreen() {
  const modalContent = modal.querySelector(".modal-content");
  modalContent.style.position = "";
  modalContent.style.top = "";
  modalContent.style.left = "";
  modalContent.style.width = "95%";
  modalContent.style.height = "90%";
  modalContent.style.margin = "2% auto";
  modalContent.style.borderRadius = "12px";
  modalContent.style.zIndex = "";

  fullscreenBtn.textContent = "⛶";
  fullscreenBtn.title = "Tela cheia";
  isFullscreen = false;

  if (monacoEditor) {
    setTimeout(() => monacoEditor.layout(), 100);
  }
}

function prettyPrintXML(xml) {
  const PADDING = "  ";
  xml = xml.replace(/(>)(<)(\/?)/g, "$1\n$2$3");
  let formatted = "";
  let pad = 0;
  xml.split(/\n/).forEach((node) => {
    node = node.trim();
    if (node.match(/^<\/.+/)) {
      pad -= 1;
    }
    formatted += PADDING.repeat(pad) + node + "\n";
    if (node.match(/^<[^!?]+[^\/]>/) && !node.match(/<\/.+>/)) {
      pad += 1;
    }
  });
  return formatted.trim();
}
