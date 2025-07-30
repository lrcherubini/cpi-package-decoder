const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");
let fileContents = {};

// Drag and drop functionality
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
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleZipFile(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleZipFile(e.target.files[0]);
  }
});

results.addEventListener("click", function (e) {
  const scriptItem = e.target.closest(".script-item");
  if (scriptItem && scriptItem.dataset.resourceId) {
    const resourceId = scriptItem.dataset.resourceId;
    const resourceType = scriptItem.dataset.resourceType;
    if (resourceType === "ScriptCollection") {
      displayScriptCollectionContent(resourceId, scriptItem);
    }
  }
});

function handleZipFile(file) {
  results.innerHTML = "";
  fileContents = {}; // Limpa o conteúdo anterior
  const zip = new JSZip();
  zip.loadAsync(file).then((zip) => {
    const promises = [];
    zip.forEach((relativePath, zipEntry) => {
      // Define o tipo de conteúdo com base no nome do arquivo
      const fileType = zipEntry.name.endsWith("_content")
        ? "arraybuffer"
        : "string";
      const promise = zipEntry.async(fileType).then((content) => {
        fileContents[zipEntry.name] = content;
      });
      promises.push(promise);
    });

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

function displayScriptCollectionContent(resourceId, scriptItemElement) {
  const contentFileName = resourceId + "_content";
  const innerZipContent = fileContents[contentFileName]; // Agora é um ArrayBuffer

  let contentDiv = scriptItemElement.querySelector(".script-content-area");
  if (contentDiv.style.display === "block") {
    contentDiv.style.display = "none";
    return;
  }

  if (innerZipContent) {
    const zip = new JSZip();
    zip
      .loadAsync(innerZipContent) // Carrega o ArrayBuffer diretamente
      .then(function (zip) {
        const scriptPromises = [];
        zip.forEach(function (relativePath, zipEntry) {
          if (!zipEntry.dir) {
            const scriptPromise = zipEntry
              .async("string")
              .then(function (scriptContent) {
                return `
                  <div class="result-section">
                      <div class="result-title">📄 ${zipEntry.name}</div>
                      <div class="code-block">${escapeHtml(
                        scriptContent
                      )}</div>
                  </div>`;
              });
            scriptPromises.push(scriptPromise);
          }
        });
        return Promise.all(scriptPromises);
      })
      .then(function (scriptsHtml) {
        contentDiv.innerHTML =
          '<div class="inner-scripts">' + scriptsHtml.join("") + "</div>";
        contentDiv.style.display = "block";
      })
      .catch(function (err) {
        contentDiv.innerHTML = `<div class="error">❌ Erro ao descompactar o ScriptCollection: ${err.message}</div>`;
        contentDiv.style.display = "block";
      });
  }
}

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
      processedContent = `<div class="json-viewer">
                                <h4>Informações do Pacote:</h4>
                                ${formatPackageInfo(jsonData)}
                           </div>`;
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

function formatPackageInfo(data) {
  let html = "";
  if (data.resources) {
    html += "<h5>📋 Recursos encontrados:</h5>";
    html += '<ul class="script-list">';
    data.resources.forEach((resource) => {
      html += `
              <li class="script-item" 
                  data-resource-id="${resource.id}" 
                  data-resource-name="${resource.name}" 
                  data-resource-type="${resource.resourceType}">
                  <div class="script-name-wrapper">
                    <div class="script-name">${
                      resource.displayName || resource.name
                    }</div>
                    <div class="script-type">
                        Tipo: ${resource.resourceType} |
                        Versão: ${resource.semanticVersion || resource.version} |
                        Modificado por: ${resource.modifiedBy}
                    </div>
                  </div>
                  ${
                    resource.additionalAttributes &&
                    resource.additionalAttributes.Description
                      ? `<div class="script-description">${resource.additionalAttributes.Description.attributeValues[0]}</div>`
                      : ""
                  }
                  <div class="script-content-area" style="display: none;"></div>
              </li>
          `;
    });
    html += "</ul>";
  }
  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}