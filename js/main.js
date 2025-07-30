const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");

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
    handleFiles(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files[0]);
  }
});

function handleFiles(file) {
  results.innerHTML = "";
  const zip = new JSZip();
  zip.loadAsync(file).then((zip) => {
    zip.forEach((relativePath, zipEntry) => {
      if (
        zipEntry.name.endsWith(".md") ||
        zipEntry.name.endsWith(".cnt") ||
        zipEntry.name.endsWith(".groovy") ||
        zipEntry.name.endsWith(".js")
      ) {
        zipEntry.async("string").then((content) => {
          processFile(zipEntry.name, content);
        });
      }
    });
  });
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
      processedContent = `<div class="code-block">${decoded}</div>`;
    } else if (fileName === "resources.cnt") {
      title = "📦 Recursos do Pacote (resources.cnt)";
      const decoded = atob(content.trim());
      const jsonData = JSON.parse(decoded);

      processedContent = `
                        <div class="json-viewer">
                            <h4>Informações do Pacote:</h4>
                            ${formatPackageInfo(jsonData)}
                        </div>
                    `;
    } else if (fileName.endsWith(".groovy")) {
      title = `🔧 Script Groovy: ${fileName}`;
      processedContent = `<div class="code-block">${escapeHtml(content)}</div>`;
    } else if (fileName.endsWith(".js")) {
      title = `⚡ Script JavaScript: ${fileName}`;
      processedContent = `<div class="code-block">${escapeHtml(content)}</div>`;
    } else {
      title = `📄 Arquivo: ${fileName}`;
      processedContent = `<div class="code-block">${escapeHtml(content)}</div>`;
    }

    resultDiv.innerHTML = `
                    <div class="result-title">${title}</div>
                    ${processedContent}
                `;
  } catch (error) {
    resultDiv.innerHTML = `
                    <div class="result-title error">❌ Erro ao processar ${fileName}</div>
                    <div class="error">Erro: ${error.message}</div>
                    <div class="code-block">${escapeHtml(
                      content.substring(0, 500)
                    )}...</div>
                `;
  }

  results.appendChild(resultDiv);
}

function formatPackageInfo(data) {
  let html = "";

  if (data.resources) {
    html += "<h5>📋 Recursos encontrados:</h5>";
    html += '<ul class="script-list">';

    data.resources.forEach((resource) => {
      html += `
                        <li class="script-item">
                            <div class="script-name">${
                              resource.displayName || resource.name
                            }</div>
                            <div class="script-type">
                                Tipo: ${resource.resourceType} |
                                Versão: ${
                                  resource.semanticVersion || resource.version
                                } |
                                Modificado por: ${resource.modifiedBy}
                            </div>
                            ${
                              resource.additionalAttributes &&
                              resource.additionalAttributes.Description
                                ? `<div style="margin-top: 8px; color: #666;">${resource.additionalAttributes.Description.attributeValues[0]}</div>`
                                : ""
                            }
                        </li>
                    `;
    });

    html += "</ul>";
  }

  if (data.relations) {
    html += "<h5>🔗 Relações:</h5>";
    html += "<ul>";
    data.relations.forEach((relation) => {
      html += `<li>Tipo: ${relation.relationType} - ${relation.RelationName}</li>`;
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