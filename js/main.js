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
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  results.innerHTML = "";

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      processFile(file.name, e.target.result);
    };
    reader.readAsText(file);
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

// Decode base64 sample on load
window.onload = function () {
  // Automatically decode the sample data you provided
  const sampleContentMetadata =
    "LS0gbGlzdGluZyBwcm9wZXJ0aWVzIC0tCkhhc2hWZXJzaW9uPTIuMC4wCkVuY29kaW5nVmVyc2lvbj0xLjAuMApPcmdhbml6YXRpb249VEVTVApFbnZpcm9ubWVudD1pdC1kYi1kZXNpZ24uanZzNmd3ZGxtazhneWpydwpSZWxhdGlvbkNsYXNzVmVyc2lvbj0xLjAuMApSZXNvdXJjZUNsYXNzVmVyc2lvbj0xLjIuMApFeHBvcnRNb2RlbFZlcnNpb249MS4wLjAK";

  processFile("contentmetadata.md", sampleContentMetadata);

  const sampleResources =
    "eyJyZXNvdXJjZXMiOlt7InZlcnNpb24iOjgsInJldmlzaW9uIjowLCJtYXN0ZXJJZCI6IjY0YjhhZTkwZmRmODRlZGRhMTZkMDlhNzlhMTcyZDdiOjdkOTkzMWViZDQyNjQ0NmQ4MTkyOGQ5M2I1Y2JlYzhiOjgiLCJ2ZXJzaW9uQ29tbWVudCI6InJlbW92ZWQgOiIsImdsb2JhbE1vZGlmaWVkRGF0ZSI6NzExMzYzMTgwMjY5NjU3LCJpc1ZhbGlkSGFzaCI6MCwiaWQiOiI3ZDk5MzFlYmQ0MjY0NDZkODE5MjhkOTNiNWNiZWM4YiIsIm5hbWUiOiJHRU4gU2NyaXB0cy56aXAiLCJjcmVhdGVkQnkiOiJsZWFuZHJvLmNoZXJ1YmluaUBjYXN0Z3JvdXBwYXJ0bmVyLmNvbS5iciIsImNyZWF0ZWRBdCI6MTc0ODAyNTE2MzEzNiwidW5pcXVlSWQiOiJHRU5fU2NyaXB0cyIsIm1vZGlmaWVkQnkiOiJsZWFuZHJvLmNoZXJ1YmluaUBjYXN0Z3JvdXBwYXJ0bmVyLmNvbS5iciIsIm1vZGlmaWVkQXQiOjE3NTI4Njg0OTk1NTEsImFkZGl0aW9uYWxBdHRyaWJ1dGVzIjp7IkRlc2NyaXB0aW9uIjp7ImlzRXh0ZW5kZWRMYXJnZUF0dHJpYnV0ZSI6dHJ1ZSwiYXR0cmlidXRlVmFsdWVzIjpbIiJdfSwiT3JpZ2luQnVuZGxlU3ltYm9saWNOYW1lIjp7ImlzRXh0ZW5kZWRMYXJnZUF0dHJpYnV0ZSI6ZmFsc2UsImF0dHJpYnV0ZVZhbHVlcyI6WyJHRU5fU2NyaXB0cyJdfSwiQnVuZGxlVmVyc2lvbiI6eyJpc0V4dGVuZGVkTGFyZ2VBdHRyaWJ1dGUiOmZhbHNlLCJhdHRyaWJ1dGVWYWx1ZXMiOlsiMS4wLjciXX0sIkJ1bmRsZVN5bWJvbGljTmFtZSI6eyJpc0V4dGVuZGVkTGFyZ2VBdHRyaWJ1dGUiOmZhbHNlLCJhdHRyaWJ1dGVWYWx1ZXMiOlsiR0VOX1NjcmlwdHMiXX0sIlNBUC1SdW50aW1lUHJvZmlsZSI6eyJpc0V4dGVuZGVkTGFyZ2VBdHRyaWJ1dGUiOmZhbHNlLCJhdHRyaWJ1dGVWYWx1ZXMiOlsiaWZsbWFwIl19LCJPcmlnaW5CdW5kbGVOYW1lIjp7ImlzRXh0ZW5kZWRMYXJnZUF0dHJpYnV0ZSI6ZmFsc2UsImF0dHJpYnV0ZVZhbHVlcyI6WyJHRU4gU2NyaXB0cyJdfX0sInJlc291cmNlVHlwZSI6IlNjcmlwdENvbGxlY3Rpb24iLCJjb250ZW50VHlwZSI6ImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSIsImRpc3BsYXlOYW1lIjoiR0VOIFNjcmlwdHMiLCJzZW1hbnRpY1ZlcnNpb24iOiIxLjAuNyIsInByaXZpbGVnZVN0YXRlIjoiRURJVF9BTExPV0VEIiwiaXNSZXN0cmljdGVkIjpmYWxzZSwiaXNHcm91cERlZmF1bHQiOmZhbHNlLCJyZXNvdXJjZVJlZmVyZW5jZXMiOltdfSx7InZlcnNpb24iOjEsInJldmlzaW9uIjowLCJtYXN0ZXJJZCI6IjY0YjhhZTkwZmRmODRlZGRhMTZkMDlhNzlhMTcyZDdiOmU1ZGNhOGQ3NTFlNzRlOGQ5Zjg2N2MzOWYxMDBkYjZiOjEiLCJnbG9iYWxNb2RpZmllZERhdGUiOjcxMjI1NzQwNzU5OTIyMiwiaXNWYWxpZEhhc2giOjAsImlkIjoiZTVkY2E4ZDc1MWU3NGU4ZDlmODY3YzM5ZjEwMGRiNmIiLCJuYW1lIjoiLkdFTkdsb2JhbEdlbmVyYWxQYWNrYWdlIiwiY3JlYXRlZEJ5IjoibGVhbmRyby5jaGVydWJpbmlAY2FzdGdyb3VwcGFydG5lci5jb20uYnIiLCJjcmVhdGVkQXQiOjE3NDgwMjUxMzYzODUsInVuaXF1ZUlkIjoiLkdFTkdsb2JhbEdlbmVyYWxQYWNrYWdlIiwibW9kaWZpZWRCeSI6ImxlYW5kcm8uY2hlcnViaW5pQGNhc3Rncm91cHBhcnRuZXIuY29tLmJyIiwibW9kaWZpZWRBdCI6MTc0ODAyNTEzNjM4OCwiYWRkaXRpb25hbEF0dHJpYnV0ZXMiOnsiRGVzY3JpcHRpb24iOnsiaXNFeHRlbmRlZExhcmdlQXR0cmlidXRlIjpmYWxzZSwiYXR0cmlidXRlVmFsdWVzIjpbIiJdfSwic2hvcnRUZXh0Ijp7ImlzRXh0ZW5kZWRMYXJnZUF0dHJpYnV0ZSI6ZmFsc2UsImF0dHJpYnV0ZVZhbHVlcyI6WyJQYWNvdGUgcGFyYSBhZGnDp8OjbyBkZSBhcnRlZmF0b3MgdXRpbGl6YWRvcyBlbSBtw7psdGlwbHVzIHBhY290ZXMiXX0sIlByb2R1Y3QiOnsiaXNFeHRlbmRlZExhcmdlQXR0cmlidXRlIjpmYWxzZSwiYXR0cmlidXRlVmFsdWVzIjpbIiJdfSwiY2F0ZWdvcnkiOnsiaXNFeHRlbmRlZExhcmdlQXR0cmlidXRlIjpmYWxzZSwiYXR0cmlidXRlVmFsdWVzIjpbIkludGVncmF0aW9uIl19LCJTdXBwb3J0ZWRQbGF0Zm9ybSI6eyJpc0V4dGVuZGVkTGFyZ2VBdHRyaWJ1dGUiOmZhbHNlLCJhdHRyaWJ1dGVWYWx1ZXMiOlsiU0FQIEhBTkEgQ2xvdWQgSW50ZWdyYXRpb24iXX19LCJhdXhpbGFyeVByb3BlcnRpZXMiOnt9LCJyZXNvdXJjZVR5cGUiOiJDb250ZW50UGFja2FnZSIsImRpc3BsYXlOYW1lIjoiLkdFTiBHbG9iYWwgR2VuZXJhbCBQYWNrYWdlIiwic2VtYW50aWNWZXJzaW9uIjoiMS4wLjAiLCJwcml2aWxlZ2VTdGF0ZSI6IkVESVRfQUxMT1dFRCIsImlzUmVzdHJpY3RlZCI6ZmFsc2UsImlzR3JvdXBEZWZhdWx0IjpmYWxzZSwicmVzb3VyY2VSZWZlcmVuY2VzIjpbXX1dLCJyZWxhdGlvbnMiOlt7InNvdXJjZUlkIjoiZTVkY2E4ZDc1MWU3NGU4ZDlmODY3YzM5ZjEwMGRiNmIiLCJ0YXJnZXRJZCI6IjdkOTkzMWViZDQyNjQ0NmQ4MTkyOGQ5M2I1Y2JlYzhiIiwicmVsYXRpb25UeXBlIjoiQUdHUkVHQVRJT04iLCJSZWxhdGlvbk5hbWUiOiJEZWZhdWx0In1dfQ==";

  processFile("resources.cnt", sampleResources);
};
