const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");
const modal = document.getElementById("editorModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const languageSelect = document.getElementById("languageSelect");
const fileSelect = document.getElementById("fileSelect");
const formatBtn = document.getElementById("formatBtn");
const copyBtn = document.getElementById("copyBtn");
const bpmnBtn = document.getElementById("bpmnBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const downloadBtn = document.getElementById("downloadBtn");
const bpmnModal = document.getElementById("bpmnModal");
const bpmnFrame = document.getElementById("bpmnFrame");
const closeBpmnModal = document.getElementById("closeBpmnModal");

let fileContents = {}; // Armazena o conteúdo dos arquivos do ZIP principal
let resourcesCntDecoded = "";
let monacoEditor = null;
let isFullscreen = false;
let currentFiles = {};
let originalZipName = "";
let currentFileName = "";

function getFileContent(fileName) {
  if (fileContents[fileName]) {
    return fileContents[fileName];
  }
  const foundKey = Object.keys(fileContents).find(
    (key) => key === fileName || key.endsWith("/" + fileName)
  );
  return foundKey ? fileContents[foundKey] : null;
}

// Initialize Monaco Editor
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  console.log("Monaco Editor loaded successfully");
});

// --- Funcionalidades de Drag and Drop e Seleção de Arquivo ---
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    handleZipFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleZipFile(e.target.files[0]);
  }
});

// --- Modal Event Listeners ---
closeModal.addEventListener("click", closeEditorModal);
closeBpmnModal.addEventListener("click", closeBpmnViewer);

// Close BPMN modal when clicking outside
bpmnModal.addEventListener("click", (e) => {
  if (e.target === bpmnModal) {
    closeBpmnViewer();
  }
});

// Close modal when clicking outside
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeEditorModal();
  }
});

// Language selector change
languageSelect.addEventListener("change", (e) => {
  if (monacoEditor) {
    monaco.editor.setModelLanguage(monacoEditor.getModel(), e.target.value);
  }
});

fileSelect.addEventListener("change", (e) => {
  const fileName = e.target.value;
  if (currentFiles[fileName]) {
    setEditorContent(currentFiles[fileName], fileName);
  }
});

// Copy button
copyBtn.addEventListener("click", () => {
  if (monacoEditor) {
    const content = monacoEditor.getValue();
    navigator.clipboard
      .writeText(content)
      .then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 2000);
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        copyBtn.textContent = "✅";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 2000);
      });
  }
});

// Visualizar BPMN
bpmnBtn.addEventListener("click", () => {
  if (!monacoEditor) return;
  const ext = currentFileName.split(".").pop().toLowerCase();
  if (ext !== "iflw" && ext !== "bpmn" && ext !== "xml") {
    alert("Arquivo atual não é um IFLW/BPMN.");
    return;
  }
  const xml = monacoEditor.getValue();
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  const encoded = encodeURIComponent(base64);
  bpmnFrame.src = `bpmn_viewer.html?data=${encoded}`;
  bpmnModal.style.display = "block";
  bpmnModal.classList.add("show");
  bpmnModal.querySelector(".modal-content").classList.add("show");
});

// Format/Pretty Print button
function prettyPrintXML(xml) {
  const PADDING = "  ";
  xml = xml.replace(/(>)(<)(\/?)/g, "$1\n$2$3");
  let formatted = "";
  let pad = 0;
  xml.split(/\n/).forEach((node) => {
    node = node.trim()
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

formatBtn.addEventListener("click", () => {
  if (monacoEditor) {
    const model = monacoEditor.getModel();
    const language = model ? model.getLanguageId() : "";
    if (language === "xml") {
      const formatted = prettyPrintXML(monacoEditor.getValue());
      monacoEditor.setValue(formatted);
    } else {
      const action = monacoEditor.getAction("editor.action.formatDocument");
      if (action) {
        action.run();
      }
    }
  }
});

// Fullscreen button
fullscreenBtn.addEventListener("click", toggleFullscreen);
downloadBtn.addEventListener("click", downloadResources);

// ESC key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "block") {
    closeEditorModal();
  }
});

// --- Listener de Eventos Generalizado ---
results.addEventListener("click", function (e) {
  const scriptItem = e.target.closest(".script-item");
  if (scriptItem && scriptItem.dataset.resourceId) {
    const resourceId = scriptItem.dataset.resourceId;
    const resourceName = scriptItem.querySelector(".script-name").textContent;
    const resourceType = scriptItem.dataset.resourceType;
    const resourceUrl = scriptItem.dataset.resourceUrl;

    if (resourceType && resourceType.toUpperCase() === "URL" && resourceUrl) {
      window.open(resourceUrl, "_blank");
      return;
    }

    if (resourceType && resourceType.toUpperCase() === "FILE") {
      downloadFileResource(resourceId, resourceName, resourceType);
      return;
    }

    openResourceInMonaco(resourceId, resourceName, resourceType);
  }
});

/**
 * Processa o arquivo ZIP principal carregado pelo usuário.
 */
function handleZipFile(file) {
  originalZipName = file.name;
  results.innerHTML = "";
  fileContents = {};
  resourcesCntDecoded = "";
  const downloadSection = document.getElementById("downloadSection");
  if (downloadSection) {
    downloadSection.style.display = "none";
  }

  const zip = new JSZip();
  zip.loadAsync(file).then((zip) => {
    const promises = [];
    zip.forEach((relativePath, zipEntry) => {
      // Diferencia o conteúdo binário (_content) do conteúdo de texto
      const fileType = zipEntry.name.endsWith("_content")
        ? "arraybuffer"
        : "string";
      const promise = zipEntry.async(fileType).then((content) => {
        fileContents[zipEntry.name] = content;
      });
      promises.push(promise);
    });

    // Após carregar todos os arquivos, processa os principais
    Promise.all(promises).then(() => {
      const resourcesCnt = getFileContent("resources.cnt");
      if (resourcesCnt) {
        processFile("resources.cnt", resourcesCnt);
      }
      const contentMetadata = getFileContent("contentmetadata.md");
      if (contentMetadata) {
        processFile("contentmetadata.md", contentMetadata);
      }

      if (downloadSection) {
        downloadSection.style.display = "block";
      }
    });
  });
}

/**
 * Abre o conteúdo de um recurso no Monaco Editor
 */
function openResourceInMonaco(resourceId, resourceName, resourceType) {
  let content;
  let fileName = resourceName;

  if (resourceType && resourceType.toUpperCase() === "CONTENTPACKAGE") {
    if (!resourcesCntDecoded) {
      alert("resources.cnt não encontrado ou não processado.");
      return;
    }
    content = resourcesCntDecoded;
    fileName = "resources.cnt.json";
  } else {
    const contentFileName = resourceId + "_content";
    content = getFileContent(contentFileName);

    if (!content) {
      alert("Nenhum conteúdo associado a este recurso.");
      return;
    }
  }

  modalTitle.textContent = `📄 ${resourceName}`;
  modal.style.display = "block";
  modal.classList.add("show");
  modal.querySelector(".modal-content").classList.add("show");

  // Initialize Monaco Editor if not already done
  if (!monacoEditor) {
    require(["vs/editor/editor.main"], function () {
      initializeMonacoEditor(content, fileName);
    });
  } else {
    loadContentIntoMonaco(content, fileName);
  }
}

/**
 * Faz o download direto de um recurso do tipo File
 */
function downloadFileResource(resourceId, resourceName) {
  const contentFileName = resourceId + "_content";
  const content = getFileContent(contentFileName);

  if (!content) {
    alert("Nenhum conteúdo associado a este recurso.");
    return;
  }

  const sanitized = (resourceName || resourceId).replace(/[\s/\\?%*:|"<>]/g, "_");
  const blob = new Blob([content]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = sanitized;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/**
 * Inicializa o Monaco Editor
 */
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

/**
 * Carrega o conteúdo no Monaco Editor
 */
function loadContentIntoMonaco(content, resourceName) {
  currentFiles = {};
  fileSelect.style.display = "none";
  fileSelect.innerHTML = "";

  const zip = new JSZip();

  // Tenta carregar o conteúdo como um ZIP
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
      // Se não for um ZIP, trata como texto simples
      const reader = new FileReader();
      reader.onload = function (e) {
        const textContent = e.target.result;
        setEditorContent(textContent, resourceName);
      };
      reader.readAsText(new Blob([content]));
    });
}

/**
 * Detecta a linguagem baseada no nome do arquivo
 */
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
    wsdl: "xml"
  };

  return languageMap[ext] || "plaintext";
}

function setEditorContent(content, fileName) {
  const language = detectLanguage(fileName);
  languageSelect.value = language;
  monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
  monacoEditor.setValue(content);
  currentFileName = fileName;
  if (fileName.toLowerCase().endsWith('.iflw') || fileName.toLowerCase().endsWith('.bpmn')) {
    bpmnBtn.style.display = 'inline-block';
  } else {
    bpmnBtn.style.display = 'none';
  }
}

/**
 * Fecha o modal do editor
 */
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

/**
 * Toggle fullscreen mode
 */
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

/**
 * Processa os arquivos de metadados e recursos para exibição inicial.
 */
function processFile(fileName, content) {
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-section";
  let processedContent = "";
  let title = "";

  try {
    if (fileName === "contentmetadata.md") {
      title = "📋 Metadados do Conteúdo (contentmetadata.md)";
      const decoded = atob(content.trim());
      processedContent = `<div class="code-block">${escapeHtml(decoded)}</div>`;
    } else if (fileName === "resources.cnt") {
      title = "📦 Recursos do Pacote (resources.cnt)";
      const decoded = atob(content.trim());
      const jsonData = JSON.parse(decoded);
      resourcesCntDecoded = JSON.stringify(jsonData, null, 2);
      processedContent = `<div class="json-viewer">${formatPackageInfo(
        jsonData
      )}</div>`;
    }

    if (title) {
      resultDiv.innerHTML = `<div class="result-title">${title}</div>${processedContent}`;
      results.appendChild(resultDiv);
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="result-title error">❌ Erro ao processar ${fileName}</div>
                               <div class="error">Erro: ${error.message}</div>
                               <div class="code-block">${escapeHtml(
                                 String(content).substring(0, 500)
                               )}...</div>`;
    results.appendChild(resultDiv);
  }
}

/**
 * Formata as informações dos recursos para exibição em uma lista.
 */
function formatPackageInfo(data) {
  let html = "";
  if (data.resources) {
    html += "<h5>📋 Recursos encontrados:</h5>";
    html += '<ul class="script-list">';
    data.resources.forEach((resource) => {
      const urlDataAttr = resource.additionalAttributes.url
        ? ` data-resource-url="${resource.additionalAttributes.url.attributeValues}"`
        : "";
      html += `
              <li class="script-item" data-resource-id="${
                resource.id
              }" data-resource-type="${resource.resourceType}"${urlDataAttr}>
                  <div class="script-name">${
                    resource.displayName || resource.name
                  }</div>
                  <div class="script-type">
                      Tipo: ${resource.resourceType} |
                      Versão: ${resource.semanticVersion || resource.version} |
                      Modificado por: ${resource.modifiedBy}
                  </div>
              </li>`;
    });
    html += "</ul>";
    html +=
      '<p style="margin-top: 15px; color: #666; font-style: italic;">💡 Clique em qualquer recurso para visualizar seu conteúdo no editor. Recursos do tipo URL serão abertos em nova janela</p>';
  }
  return html;
}

/**
 * Escapa caracteres HTML para exibição segura.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Função de download corrigida
 */
function downloadResources() {
  if (!resourcesCntDecoded) {
    alert("Nenhum recurso processado para download.");
    return;
  }

  const packageInfo = JSON.parse(resourcesCntDecoded);
  const outZip = new JSZip();
  const tasks = [];

  if (packageInfo.resources) {
    packageInfo.resources.forEach((resource) => {
      const id = resource.id;

      // Sanitiza o nome para ser seguro para nomes de arquivo/pasta
      const name = (resource.displayName || resource.name || id).replace(
        /[\s/\\?%*:|"<>]/g,
        "_"
      );
      const content = getFileContent(id + "_content");

      if (!content) return;

      // Verifica se o recurso é uma ScriptCollection ou outro tipo de arquivo compactado
      if (
        resource.resourceType === "ScriptCollection" ||
        resource.contentType.includes("zip") ||
        resource.contentType.includes("octet-stream")
      ) {
        const inner = new JSZip();
        const task = inner
          .loadAsync(content)
          .then((innerZip) => {
            // Se for um ZIP válido (ScriptCollection), extrai os arquivos para uma pasta
            const innerTasks = [];
            innerZip.forEach((relPath, entry) => {
              if (!entry.dir) {
                innerTasks.push(
                  entry.async("arraybuffer").then((data) => {
                    outZip.file(name + "/" + relPath, data);
                  })
                );
              }
            });
            return Promise.all(innerTasks);
          })
          .catch(() => {
            // Se não for um ZIP (provavelmente um recurso binário), salva o arquivo diretamente
            outZip.file(name, content);
          });
        tasks.push(task);
      } else {
        // Para outros tipos de recursos (XML, Groovy, etc.), adiciona o conteúdo diretamente
        let fileExtension = ".txt"; // Extensão padrão
        const resourceName = resource.name || resource.displayName;
        const extensionMatch = resourceName.match(/\.([^.]+)$/);
        if (extensionMatch) {
          fileExtension = `.${extensionMatch[1]}`;
        } else if (resource.contentType) {
          const ct = resource.contentType;
          if (ct.includes("groovy")) fileExtension = ".groovy";
          else if (ct.includes("javascript")) fileExtension = ".js";
          else if (ct.includes("xml")) fileExtension = ".xml";
        }
        outZip.file(`${name}${extensionMatch ? "" : fileExtension}`, content);
      }
    });
  }

  Promise.all(tasks).then(() => {

    // Adiciona os metadados decodificados para conveniência
    try {
      const metadataContent = getFileContent("contentmetadata.md");
      if (metadataContent) {
        const decodedMetadata = atob(metadataContent.trim());
        outZip.file("contentmetadata_decoded.md", decodedMetadata);
      }
    } catch (e) {
      console.error("Erro ao decodificar metadados para o ZIP", e);
    }

    if (resourcesCntDecoded) {
      outZip.file("resources_decoded.json", resourcesCntDecoded);
    }

    // Gera o ZIP final e inicia o download
    outZip.generateAsync({ type: "blob" }).then((blob) => {
      const a = document.createElement("a");

      a.href = URL.createObjectURL(blob);

      const decodedName = originalZipName.replace(/\.zip$/i, "_decoded.zip");
      a.download = decodedName;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  });
}
