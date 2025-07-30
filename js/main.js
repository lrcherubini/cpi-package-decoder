const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");
let fileContents = {}; // Armazena o conteúdo dos arquivos do ZIP principal

// --- Funcionalidades de Drag and Drop e Seleção de Arquivo (sem alterações) ---
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

// --- Listener de Eventos Generalizado ---
results.addEventListener("click", function (e) {
  const scriptItem = e.target.closest(".script-item");
  if (scriptItem && scriptItem.dataset.resourceId) {
    const resourceId = scriptItem.dataset.resourceId;
    toggleResourceContent(resourceId, scriptItem); // Chama uma função genérica
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
 * Controla a exibição (mostrar/ocultar) do conteúdo de um recurso.
 */
function toggleResourceContent(resourceId, scriptItemElement) {
  const contentArea = scriptItemElement.querySelector(".script-content-area");
  const isVisible = contentArea.style.display === "block";

  // Se estiver visível, oculta e para a execução
  if (isVisible) {
    contentArea.style.display = "none";
    return;
  }

  // Se o conteúdo já foi carregado antes, apenas o exibe
  if (contentArea.innerHTML.trim() !== "") {
    contentArea.style.display = "block";
    return;
  }

  // Se não, carrega e exibe o conteúdo
  displayResourceContent(resourceId, contentArea);
}

/**
 * Exibe o conteúdo de um recurso, tentando descompactá-lo ou mostrá-lo como texto.
 */
function displayResourceContent(resourceId, contentArea) {
  const contentFileName = resourceId + "_content";
  const content = fileContents[contentFileName];

  if (!content) {
    contentArea.innerHTML =
      '<div class="error">Nenhum conteúdo associado a este recurso.</div>';
    contentArea.style.display = "block";
    return;
  }

  const zip = new JSZip();
  // Tenta carregar o conteúdo como um ZIP
  zip.loadAsync(content)
    .then(innerZip => {
      // Se for um ZIP (como ScriptCollection), extrai os arquivos
      const scriptPromises = [];
      innerZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const scriptPromise = zipEntry.async("string").then(scriptContent =>
            `<div class="result-section">
                <div class="result-title">📄 ${zipEntry.name}</div>
                <div class="code-block">${escapeHtml(scriptContent)}</div>
             </div>`
          );
          scriptPromises.push(scriptPromise);
        }
      });
      return Promise.all(scriptPromises);
    })
    .then(scriptsHtml => {
      contentArea.innerHTML = '<div class="inner-scripts">' + scriptsHtml.join("") + '</div>';
      contentArea.style.display = "block";
    })
    .catch(() => {
      // Se não for um ZIP, trata como texto simples (ex: script Groovy, XML)
      const reader = new FileReader();
      reader.onload = function(e) {
          contentArea.innerHTML = `<div class="code-block">${escapeHtml(e.target.result)}</div>`;
          contentArea.style.display = "block";
      };
      // Usa um Blob para ler o ArrayBuffer como texto
      reader.readAsText(new Blob([content]));
    });
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
                  <div class="script-content-area" style="display: none;"></div>
              </li>`;
    });
    html += "</ul>";
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