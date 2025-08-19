// Functions for handling ZIP files and resources
async function handleZipFile(file) {
  const packageIndex = packagesData.length;
  let localFileContents = {};
  let localResourcesCntDecoded = "";
  let localOriginalZipName = file.name;

  const packageDiv = document.createElement("div");
  packageDiv.className = "package-section";
  packageDiv.dataset.packageIndex = packageIndex;
  const header = document.createElement("h4");
  header.className = "result-title";
  header.textContent = `📦 ${file.name}`;
  packageDiv.appendChild(header);

  const zip = new JSZip();
  const fileBuffer = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(fileBuffer);

  const promises = [];
  loadedZip.forEach((relativePath, zipEntry) => {
    let fileType = "string";
    if (
      zipEntry.name.endsWith("_content") ||
      /\.(zip|jar)$/i.test(zipEntry.name)
    ) {
      fileType = "arraybuffer";
    }
    const promise = zipEntry.async(fileType).then((content) => {
      localFileContents[zipEntry.name] = content;
    });
    promises.push(promise);
  });

  await Promise.all(promises);

  const getLocalFile = (name) => {
    if (localFileContents[name]) return localFileContents[name];
    const foundKey = Object.keys(localFileContents).find((key) =>
      key.endsWith("/" + name)
    );
    return foundKey ? localFileContents[foundKey] : null;
  };

  let resourcesCnt = getLocalFile("resources.cnt");
  let contentMetadata = getLocalFile("contentmetadata.md");

  if (!resourcesCnt && !contentMetadata) {
    createTemporaryIflowPackage(file.name, fileBuffer, localFileContents);
    resourcesCnt = getLocalFile("resources.cnt");
    contentMetadata = getLocalFile("contentmetadata.md");
  }

  let guidelineReports = {};

  if (resourcesCnt) {
    try {
      const decoded = atob(resourcesCnt.trim());
      const jsonData = JSON.parse(decoded);
      localResourcesCntDecoded = JSON.stringify(jsonData, null, 2);

      for (const resource of jsonData.resources || []) {
        if (resource.resourceType === "IFlow") {
          const contentFile = resource.id + "_content";
          const iflowContent = localFileContents[contentFile];
          if (iflowContent) {
            const iflowXml = await new JSZip()
              .loadAsync(iflowContent)
              .then((zip) => {
                const xmlFile = Object.values(zip.files).find((f) =>
                  f.name.endsWith(".iflw")
                );
                return xmlFile ? xmlFile.async("string") : null;
              });
            if (iflowXml) {
              guidelineReports[resource.id] = await checkGuidelines(iflowXml);
            }
          }
        }
      }
      processFile(
        "resources.cnt",
        resourcesCnt,
        packageDiv,
        packageIndex,
        guidelineReports,
        localResourcesCntDecoded
      );
    } catch (e) {
      console.error("Error processing resources.cnt", e);
    }
  }

  if (contentMetadata) {
    processFile(
      "contentmetadata.md",
      contentMetadata,
      packageDiv,
      packageIndex,
      null,
      localResourcesCntDecoded
    );
  }

  if (!resourcesCnt && !contentMetadata) {
    displayIflowFileList(packageDiv, packageIndex);
  }

  const downloadSection = document.getElementById("downloadSection");
  if (downloadSection) {
    downloadSection.style.display = "block";
  }

  results.appendChild(packageDiv);
  packagesData.push({
    fileContents: localFileContents,
    resourcesCntDecoded: localResourcesCntDecoded,
    originalZipName: localOriginalZipName,
    guidelineReports,
  });
}

function openResourceInMonaco(resourceId, resourceName, resourceType) {
  const pkgIndex = document.querySelector(`[data-resource-id="${resourceId}"]`)
    .dataset.packageIndex;
  const pkgData = packagesData[pkgIndex];

  let content;
  let fileName = resourceName;

  if (resourceType && resourceType.toUpperCase() === "CONTENTPACKAGE") {
    if (!pkgData.resourcesCntDecoded) {
      alert(t("no_resources"));
      return;
    }
    content = pkgData.resourcesCntDecoded;
    fileName = "resources.cnt.json";
  } else {
    const contentFileName = resourceId + "_content";
    content = pkgData.fileContents[contentFileName];
    if (!content) {
      alert(t("no_content"));
      return;
    }
  }

  modalTitle.textContent = `📄 ${resourceName}`;
  modal.style.display = "block";
  modal.classList.add("show");
  modal.querySelector(".modal-content").classList.add("show");

  const guidelineReport = pkgData.guidelineReports
    ? pkgData.guidelineReports[resourceId]
    : null;

  if (!monacoEditor) {
    require(["vs/editor/editor.main"], function () {
      initializeMonacoEditor(
        content,
        fileName,
        pkgData.fileContents,
        guidelineReport
      );
    });
  } else {
    loadContentIntoMonaco(
      content,
      fileName,
      pkgData.fileContents,
      guidelineReport
    );
  }
}

function openIflowFile(filePath) {
  const pkgIndex = document.querySelector(`[data-file-path="${filePath}"]`)
    .dataset.packageIndex;
  const pkgData = packagesData[pkgIndex];

  const content = pkgData.fileContents[filePath];
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
  const pkgIndex = document.querySelector(`[data-resource-id="${resourceId}"]`)
    .dataset.packageIndex;
  const pkgData = packagesData[pkgIndex];
  const contentFileName = resourceId + "_content";
  const content = pkgData.fileContents[contentFileName];
  if (!content) {
    alert(t("no_content"));
    return;
  }
  const sanitized = (resourceName || resourceId).replace(
    /[\s/\\?%*:|"<>]/g,
    "_"
  );
  const blob = new Blob([content]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = sanitized;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function processFile(
  fileName,
  content,
  container,
  packageIndex,
  guidelineReports,
  localResourcesCntDecoded
) {
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-section";
  let processedContent = "";
  let title = "";
  try {
    if (fileName === "contentmetadata.md") {
      title = t("content_metadata_title");
      const decoded = atob(content.trim());
      processedContent = `<div class=\"code-block\">${escapeHtml(
        decoded
      )}</div>`;
    } else if (fileName === "resources.cnt") {
      title = t("package_resources_title");
      const decoded = atob(content.trim());
      const jsonData = JSON.parse(decoded);
      processedContent = `<div class=\"json-viewer\">${formatPackageInfo(
        jsonData,
        packageIndex,
        guidelineReports
      )}</div>`;
    }
    if (title) {
      resultDiv.innerHTML = `<div class=\"result-title\">${title}</div>${processedContent}`;
      container.appendChild(resultDiv);
    }
  } catch (error) {
    resultDiv.innerHTML =
      `<div class=\"result-title error\">${t(
        "processing_error_title"
      )}${fileName}</div>` +
      `<div class=\"error\">${t("error_label")}${error.message}</div>` +
      `<div class=\"code-block\">${escapeHtml(
        String(content).substring(0, 500)
      )}...</div>`;
    container.appendChild(resultDiv);
  }
}

function createTemporaryIflowPackage(zipName, buffer, localFileContents) {
  const resourceId = zipName.replace(/\.zip$/i, "");
  const tempPackage = {
    resources: [
      {
        version: 1,
        revision: 0,
        masterId: "",
        globalModifiedDate: 0,
        isValidHash: 0,
        id: resourceId,
        name: zipName,
        createdBy: "",
        createdAt: 0,
        uniqueId: zipName,
        modifiedBy: "",
        modifiedAt: 0,
        additionalAttributes: {},
        auxilaryProperties: {},
        resourceType: "IFlow",
        displayName: resourceId,
        semanticVersion: "1.0.0",
        privilegeState: "EDIT_ALLOWED",
        isRestricted: false,
        isGroupDefault: false,
        resourceReferences: [],
      },
    ],
  };
  localFileContents["resources.cnt"] = btoa(JSON.stringify(tempPackage));
  localFileContents["contentmetadata.md"] = btoa(
    `Temporary package generated for ${zipName}`
  );
  localFileContents[`${resourceId}_content`] = buffer;
}

function displayIflowFileList(container, packageIndex) {
  const files = Object.keys(packagesData[packageIndex].fileContents).filter(
    (name) => !name.endsWith("/")
  );
  if (files.length === 0) return;
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-section";
  let html = `<div class=\"result-title\">${t("iflow_files_title")}</div>`;
  html += '<ul class="script-list">';
  files.forEach((fn) => {
    const displayName = fn.split("/").pop();
    html +=
      `<li class=\"script-item\" data-file-path=\"${fn}\" data-package-index=\"${packageIndex}\">` +
      `<div class=\"script-name\">${displayName}</div>` +
      `<div class=\"script-type\">${fn}</div>` +
      `</li>`;
  });
  html += "</ul>";
  html += `<p style=\"margin-top: 15px; color: #666; font-style: italic;\">${t(
    "file_click_hint"
  )}</p>`;
  resultDiv.innerHTML = html;
  container.appendChild(resultDiv);
}

function formatPackageInfo(data, packageIndex, guidelineReports) {
  let html = "";
  if (data.resources) {
    html += `<h5>${t("resources_found")}</h5>`;
    html += '<ul class="script-list">';
    data.resources.forEach((resource) => {
      const urlDataAttr = resource.additionalAttributes.url
        ? ` data-resource-url="${resource.additionalAttributes.url.attributeValues}"`
        : "";

      let semaphore = "";
      if (
        resource.resourceType === "IFlow" &&
        guidelineReports &&
        guidelineReports[resource.id]
      ) {
        const report = guidelineReports[resource.id];
        if (report.summary.fail > 0) {
          semaphore =
            '<span class="semaphore red" title="Falhas graves de guidelines"></span>';
        } else if (report.summary.warn > 0) {
          semaphore =
            '<span class="semaphore yellow" title="Avisos de guidelines"></span>';
        } else {
          semaphore =
            '<span class="semaphore green" title="Guidelines aprovadas"></span>';
        }
      }

      html +=
        `<li class="script-item" data-resource-id="${resource.id}" data-resource-type="${resource.resourceType}" data-package-index="${packageIndex}"${urlDataAttr}>` +
        `<div class="script-name">${semaphore} ${
          resource.displayName || resource.name
        }</div>` +
        `<div class="script-type">${t("resource_details")
          .replace("{type}", resource.resourceType)
          .replace("{version}", resource.semanticVersion || resource.version)
          .replace("{user}", resource.modifiedBy)}</div>` +
        `</li>`;
    });
    html += "</ul>";
    html += `<p style="margin-top: 15px; color: #666; font-style: italic;">${t(
      "resource_click_hint"
    )}</p>`;
  }
  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function downloadResources() {
  // This function needs to be adapted to select the correct package data.
  // For simplicity, let's assume it works on the last loaded package.
  const pkgData = packagesData[packagesData.length - 1];
  if (!pkgData || !pkgData.resourcesCntDecoded) {
    alert(t("no_resources_download"));
    return;
  }

  const packageInfo = JSON.parse(pkgData.resourcesCntDecoded);
  const outZip = new JSZip();
  const tasks = [];

  if (packageInfo.resources) {
    packageInfo.resources.forEach((resource) => {
      const id = resource.id;
      const name = (resource.displayName || resource.name || id).replace(
        /[\s/\\?%*:|"<>]/g,
        "_"
      );
      const content = pkgData.fileContents[id + "_content"];
      if (!content) return;
      if (
        resource.resourceType === "ScriptCollection" ||
        resource.contentType.includes("zip") ||
        resource.contentType.includes("octet-stream")
      ) {
        const inner = new JSZip();
        const task = inner
          .loadAsync(content)
          .then((innerZip) => {
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
      const metadataContent = pkgData.fileContents["contentmetadata.md"];
      if (metadataContent) {
        const decodedMetadata = atob(metadataContent.trim());
        outZip.file("contentmetadata_decoded.md", decodedMetadata);
      }
    } catch (e) {
      console.error("Erro ao decodificar metadados para o ZIP", e);
    }

    if (pkgData.resourcesCntDecoded) {
      outZip.file("resources_decoded.json", pkgData.resourcesCntDecoded);
    }

    outZip.generateAsync({ type: "blob" }).then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const decodedName = pkgData.originalZipName.replace(
        /\.zip$/i,
        "_decoded.zip"
      );
      a.download = decodedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  });
}
