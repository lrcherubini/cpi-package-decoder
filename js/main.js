const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");
const modal = document.getElementById("editorModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const languageSelect = document.getElementById("languageSelect");
const fileSelect = document.getElementById("fileSelect");
const copyBtn = document.getElementById("copyBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

let fileContents = {}; // Armazena o conteúdo dos arquivos do ZIP principal
let monacoEditor = null;
let isFullscreen = false;
let currentFiles = {};

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  console.log('Monaco Editor loaded successfully');
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
    navigator.clipboard.writeText(content).then(() => {
      copyBtn.textContent = "✅";
      setTimeout(() => {
        copyBtn.textContent = "📋";
      }, 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      copyBtn.textContent = "✅";
      setTimeout(() => {
        copyBtn.textContent = "📋";
      }, 2000);
    });
  }
});

// Fullscreen button
fullscreenBtn.addEventListener("click", toggleFullscreen);

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
    const resourceName = scriptItem.querySelector('.script-name').textContent;
    openResourceInMonaco(resourceId, resourceName);
  }
});

/**
 * Processa o arquivo ZIP principal carregado pelo usuário.
 */
function handleZipFile(file) {
  results.innerHTML = "";
  fileContents = {};
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
      if (fileContents["resources.cnt"]) {
        processFile("resources.cnt", fileContents["resources.cnt"]);
      }
      if (fileContents["contentmetadata.md"]) {
        processFile("contentmetadata.md", fileContents["contentmetadata.md"]);
      }
    });
  });
}

/**
 * Abre o conteúdo de um recurso no Monaco Editor
 */
function openResourceInMonaco(resourceId, resourceName) {
  const contentFileName = resourceId + "_content";
  const content = fileContents[contentFileName];

  if (!content) {
    alert('Nenhum conteúdo associado a este recurso.');
    return;
  }

  modalTitle.textContent = `📄 ${resourceName}`;
  modal.style.display = "block";
  modal.classList.add("show");
  modal.querySelector('.modal-content').classList.add("show");

  // Initialize Monaco Editor if not already done
  if (!monacoEditor) {
    require(['vs/editor/editor.main'], function () {
      initializeMonacoEditor(content, resourceName);
    });
  } else {
    loadContentIntoMonaco(content, resourceName);
  }
}

/**
 * Inicializa o Monaco Editor
 */
function initializeMonacoEditor(content, resourceName) {
  monacoEditor = monaco.editor.create(document.getElementById('monacoEditor'), {
    value: '',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    readOnly: false,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    wordWrap: 'on'
  });

  loadContentIntoMonaco(content, resourceName);
}

/**
 * Carrega o conteúdo no Monaco Editor
 */
function loadContentIntoMonaco(content, resourceName) {
  currentFiles = {};
  fileSelect.style.display = 'none';
  fileSelect.innerHTML = '';

  const zip = new JSZip();

  // Tenta carregar o conteúdo como um ZIP
  zip.loadAsync(content)
    .then(innerZip => {
      const files = [];
      innerZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          files.push(relativePath);
        }
      });

      if (files.length === 1) {
        return innerZip.file(files[0]).async("string").then(scriptContent => {
          setEditorContent(scriptContent, files[0]);
        });
      } else if (files.length > 1) {
        const promises = files.map(fileName => {
          return innerZip.file(fileName).async("string").then(scriptContent => {
            currentFiles[fileName] = scriptContent;
          });
        });

        return Promise.all(promises).then(() => {
          fileSelect.innerHTML = '';
          files.forEach(fn => {
            const opt = document.createElement('option');
            opt.value = fn;
            opt.textContent = fn;
            fileSelect.appendChild(opt);
          });
          fileSelect.style.display = 'inline-block';
          fileSelect.value = files[0];
          setEditorContent(currentFiles[files[0]], files[0]);
        });
      }
    })
    .catch(() => {
      // Se não for um ZIP, trata como texto simples
      const reader = new FileReader();
      reader.onload = function(e) {
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
  const ext = fileName.toLowerCase().split('.').pop();
  const languageMap = {
    'groovy': 'groovy',
    'gsh': 'groovy',
    'js': 'javascript',
    'javascript': 'javascript',
    'xml': 'xml',
    'json': 'json',
    'java': 'java',
    'py': 'python',
    'sql': 'sql',
    'properties': 'properties',
    'yaml': 'yaml',
    'yml': 'yaml'
  };
  
  return languageMap[ext] || 'plaintext';
}

function setEditorContent(content, fileName) {
  const language = detectLanguage(fileName);
  languageSelect.value = language;
  monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
  monacoEditor.setValue(content);
}

/**
 * Fecha o modal do editor
 */
function closeEditorModal() {
  modal.style.display = "none";
  modal.classList.remove("show");
  modal.querySelector('.modal-content').classList.remove("show");

  fileSelect.style.display = 'none';
  fileSelect.innerHTML = '';
  currentFiles = {};

  if (isFullscreen) {
    exitFullscreen();
  }
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
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.position = 'fixed';
  modalContent.style.top = '0';
  modalContent.style.left = '0';
  modalContent.style.width = '100vw';
  modalContent.style.height = '100vh';
  modalContent.style.margin = '0';
  modalContent.style.borderRadius = '0';
  modalContent.style.zIndex = '10001';
  
  fullscreenBtn.textContent = '🗗';
  fullscreenBtn.title = 'Sair da tela cheia';
  isFullscreen = true;
  
  if (monacoEditor) {
    setTimeout(() => monacoEditor.layout(), 100);
  }
}

function exitFullscreen() {
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.position = '';
  modalContent.style.top = '';
  modalContent.style.left = '';
  modalContent.style.width = '95%';
  modalContent.style.height = '90%';
  modalContent.style.margin = '2% auto';
  modalContent.style.borderRadius = '12px';
  modalContent.style.zIndex = '';
  
  fullscreenBtn.textContent = '⛶';
  fullscreenBtn.title = 'Tela cheia';
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
            processedContent = `<div class="json-viewer">${formatPackageInfo(jsonData)}</div>`;
        }

        if (title) {
            resultDiv.innerHTML = `<div class="result-title">${title}</div>${processedContent}`;
            results.appendChild(resultDiv);
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="result-title error">❌ Erro ao processar ${fileName}</div>
                               <div class="error">Erro: ${error.message}</div>
                               <div class="code-block">${escapeHtml(String(content).substring(0, 500))}...</div>`;
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
      html += `
              <li class="script-item" data-resource-id="${resource.id}">
                  <div class="script-name">${resource.displayName || resource.name}</div>
                  <div class="script-type">
                      Tipo: ${resource.resourceType} |
                      Versão: ${resource.semanticVersion || resource.version} |
                      Modificado por: ${resource.modifiedBy}
                  </div>
              </li>`;
    });
    html += "</ul>";
    html += '<p style="margin-top: 15px; color: #666; font-style: italic;">💡 Clique em qualquer recurso para visualizar seu conteúdo no editor</p>';
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