// Functions for handling ZIP files and resources
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
      let fileType = "string";
      if (zipEntry.name.endsWith("_content") || /\.(zip|jar)$/i.test(zipEntry.name)) {
        fileType = "arraybuffer";
      }
      const promise = zipEntry.async(fileType).then((content) => {
        fileContents[zipEntry.name] = content;
      });
      promises.push(promise);
    });

    Promise.all(promises).then(() => {
      const resourcesCnt = getFileContent("resources.cnt");
      const contentMetadata = getFileContent("contentmetadata.md");

      if (resourcesCnt) {
        processFile("resources.cnt", resourcesCnt);
      }
      if (contentMetadata) {
        processFile("contentmetadata.md", contentMetadata);
      }

      if (!resourcesCnt && !contentMetadata) {
        displayIflowFileList();
      }

      if (downloadSection) {
        if (resourcesCnt || contentMetadata) {
          downloadSection.style.display = "block";
        } else {
          downloadSection.style.display = "none";
        }
      }
    });
  });
}

function openResourceInMonaco(resourceId, resourceName, resourceType) {
  let content;
  let fileName = resourceName;

  if (resourceType && resourceType.toUpperCase() === "CONTENTPACKAGE") {
    if (!resourcesCntDecoded) {
      alert(t("no_resources"));
      return;
    }
    content = resourcesCntDecoded;
    fileName = "resources.cnt.json";
  } else {
    const contentFileName = resourceId + "_content";
    content = getFileContent(contentFileName);
    if (!content) {
      alert(t("no_content"));
      return;
    }
  }

  modalTitle.textContent = `📄 ${resourceName}`;
  modal.style.display = "block";
  modal.classList.add("show");
  modal.querySelector(".modal-content").classList.add("show");

  if (!monacoEditor) {
    require(["vs/editor/editor.main"], function () {
      initializeMonacoEditor(content, fileName, fileContents);
    });
  } else {
    loadContentIntoMonaco(content, fileName, fileContents);
  }
}

function openIflowFile(filePath) {
  const content = getFileContent(filePath);
  if (!content) {
    alert(t("file_not_found") + filePath);
    return;
  }

  modalTitle.textContent = `📄 ${filePath}`;
  modal.style.display = "block";
  modal.classList.add("show");
  modal.querySelector(".modal-content").classList.add("show");

  if (!monacoEditor) {
    require(["vs/editor/editor.main"], function () {
      initializeMonacoEditor(content, filePath);
    });
  } else {
    loadContentIntoMonaco(content, filePath);
  }
}

function downloadFileResource(resourceId, resourceName) {
  const contentFileName = resourceId + "_content";
  const content = getFileContent(contentFileName);
  if (!content) {
    alert(t("no_content"));
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

function processFile(fileName, content) {
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-section";
  let processedContent = "";
  let title = "";
  try {
    if (fileName === "contentmetadata.md") {
      title = t("content_metadata_title");
      const decoded = atob(content.trim());
      processedContent = `<div class="code-block">${escapeHtml(decoded)}</div>`;
    } else if (fileName === "resources.cnt") {
      title = t("package_resources_title");
      const decoded = atob(content.trim());
      const jsonData = JSON.parse(decoded);
      resourcesCntDecoded = JSON.stringify(jsonData, null, 2);
      processedContent = `<div class="json-viewer">${formatPackageInfo(jsonData)}</div>`;
    }
    if (title) {
      resultDiv.innerHTML = `<div class="result-title">${title}</div>${processedContent}`;
      results.appendChild(resultDiv);
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="result-title error">${t("processing_error_title")}${fileName}</div>` +
      `<div class="error">${t("error_label")}${error.message}</div>` +
      `<div class="code-block">${escapeHtml(String(content).substring(0, 500))}...</div>`;
    results.appendChild(resultDiv);
  }
}

function displayIflowFileList() {
  const files = Object.keys(fileContents).filter((name) => !name.endsWith("/"));
  if (files.length === 0) return;
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-section";
  let html = `<div class="result-title">${t("iflow_files_title")}</div>`;
  html += '<ul class="script-list">';
  files.forEach((fn) => {
    const displayName = fn.split("/").pop();
    html += `<li class="script-item" data-file-path="${fn}">` +
            `<div class="script-name">${displayName}</div>` +
            `<div class="script-type">${fn}</div>` +
            `</li>`;
  });
  html += '</ul>';
  html += `<p style="margin-top: 15px; color: #666; font-style: italic;">${t("file_click_hint")}</p>`;
  resultDiv.innerHTML = html;
  results.appendChild(resultDiv);
}

function formatPackageInfo(data) {
  let html = "";
  if (data.resources) {
    html += `<h5>${t("resources_found")}</h5>`;
    html += '<ul class="script-list">';
    data.resources.forEach((resource) => {
      const urlDataAttr = resource.additionalAttributes.url
        ? ` data-resource-url="${resource.additionalAttributes.url.attributeValues}"`
        : "";
      html += `<li class="script-item" data-resource-id="${resource.id}" data-resource-type="${resource.resourceType}"${urlDataAttr}>` +
              `<div class="script-name">${resource.displayName || resource.name}</div>` +
              `<div class="script-type">${t("resource_details")
                .replace('{type}', resource.resourceType)
                .replace('{version}', resource.semanticVersion || resource.version)
                .replace('{user}', resource.modifiedBy)}</div>` +
              `</li>`;
    });
    html += "</ul>";
    html += `<p style="margin-top: 15px; color: #666; font-style: italic;">${t("resource_click_hint")}</p>`;
  }
  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function downloadResources() {
  if (!resourcesCntDecoded) {
    alert(t("no_resources_download"));
    return;
  }

  const packageInfo = JSON.parse(resourcesCntDecoded);
  const outZip = new JSZip();
  const tasks = [];

  if (packageInfo.resources) {
    packageInfo.resources.forEach((resource) => {
      const id = resource.id;
      const name = (resource.displayName || resource.name || id).replace(/[\s/\\?%*:|"<>]/g, "_");
      const content = getFileContent(id + "_content");
      if (!content) return;
      if (resource.resourceType === "ScriptCollection" ||
          resource.contentType.includes("zip") ||
          resource.contentType.includes("octet-stream")) {
        const inner = new JSZip();
        const task = inner
          .loadAsync(content)
          .then((innerZip) => {
            const innerTasks = [];
            innerZip.forEach((relPath, entry) => {
              if (!entry.dir) {
                innerTasks.push(entry.async("arraybuffer").then((data) => {
                  outZip.file(name + "/" + relPath, data);
                }));
              }
            });
            return Promise.all(innerTasks);
          })
          .catch(() => {
            outZip.file(name, content);
          });
        tasks.push(task);
      } else {
        let fileExtension = ".txt";
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
