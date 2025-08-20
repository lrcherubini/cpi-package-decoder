// Editor related functions
let isRenderedView = false;

function initializeMonacoEditor(content, resourceName, baseFiles = {}, guidelineReport = null) {
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
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: "on",
        renderWhitespace: "selection",
        wordWrap: "on",
      }
    );
  }

  loadContentIntoMonaco(content, resourceName, baseFiles, guidelineReport);
}

function loadContentIntoMonaco(content, resourceName, baseFiles = {}, guidelineReport = null) {
  currentFiles = { ...baseFiles };
  if (guidelineReport) {
      currentFiles['guideline_report'] = guidelineReport;
  }
  
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

      const loadPromises = files.map(fileName => 
        innerZip.file(fileName).async("string").then(scriptContent => {
          currentFiles[fileName] = scriptContent;
        })
      );
      
      return Promise.all(loadPromises).then(() => files);

    }).catch(() => {
        // Se não for um zip, trata como arquivo de texto
        if (typeof content !== 'string') {
            const reader = new FileReader();
            reader.onload = function (e) {
                currentFiles[resourceName] = e.target.result;
            };
            reader.readAsText(new Blob([content]));
        } else {
            currentFiles[resourceName] = content;
        }
        return [resourceName];
    })
    .then(files => {
        const allFilesToShow = Object.keys(currentFiles).filter(k => k.startsWith('guideline_report') || files.includes(k));

        if (allFilesToShow.length > 1 || guidelineReport) {
            fileSelect.innerHTML = "";
            if (guidelineReport) {
                const opt = document.createElement("option");
                opt.value = 'guideline_report';
                opt.textContent = '📋 Relatório de Guidelines';
                fileSelect.appendChild(opt);
            }
            files.forEach((fn) => {
                const opt = document.createElement("option");
                opt.value = fn;
                opt.textContent = fn;
                fileSelect.appendChild(opt);
            });
            fileSelect.style.display = "inline-block";
            
            const initialFile = guidelineReport ? 'guideline_report' : files[0];
            fileSelect.value = initialFile;
            setEditorContent(currentFiles[initialFile], initialFile);
        } else if (files.length === 1) {
            setEditorContent(currentFiles[files[0]], files[0]);
        }
    });
}

function detectLanguage(fileName) {
    if (fileName === 'guideline_report') return 'json';
    const ext = fileName.split(".").pop().toLowerCase().trim();
    const languageMap = {
      groovy: "groovy",
      gsh: "groovy",
      js: "javascript",
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
      prop: "properties",
      yaml: "yaml",
      yml: "yaml",
      wsdl: "xml",
      mf: "plaintext",
    };
    return languageMap[ext] || "plaintext";
  }

function setEditorContent(content, fileName) {
  const language = detectLanguage(fileName);
  const model = monacoEditor.getModel();
  if (model) {
    monaco.editor.setModelLanguage(model, language);
  }

  // Define o valor do seletor de idioma
  const languageOptions = Array.from(languageSelect.options).map(option => option.value);
  if (languageOptions.includes(language)) {
    languageSelect.value = language;
  } else {
    languageSelect.value = "plaintext";
  }

  monacoEditor.setValue(typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
  currentFileName = fileName;

  const hasRenderedView = ["iflw", "project", "mf", "prop", "propdef", "mmap", "json", "guideline_report"].includes(fileName.split('.').pop().toLowerCase()) || fileName === 'guideline_report';

  viewSwitchBtn.style.display = hasRenderedView ? "inline-block" : "none";
  
  if (hasRenderedView) {
    isRenderedView = true;
    viewSwitchBtn.textContent = t("view_code"); 
    showRenderedView(content, currentFileName);
  } else {
    isRenderedView = false;
    renderedView.style.display = "none";
    document.getElementById("monacoEditor").style.display = "block";
  }
}

function closeEditorModal() {
  modal.style.display = "none";
  modal.classList.remove("show");
  modal.querySelector(".modal-content").classList.remove("show");

  fileSelect.style.display = "none";
  fileSelect.innerHTML = "";
  currentFiles = {};
  viewSwitchBtn.style.display = "none";

  if (isFullscreen) {
    exitFullscreen();
  }
}

function toggleFullscreen() {
    if (isFullscreen) {
        exitFullscreen();
    } else {
        enterFullscreen();
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
  fullscreenBtn.title = t("exit_fullscreen");
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
  fullscreenBtn.title = t("fullscreen");
  isFullscreen = false;

  if (monacoEditor) {
    setTimeout(() => monacoEditor.layout(), 100);
  }
}

function prettyPrintXML(xml) {
    const PADDING = "  ";
    const xmlWithoutGaps = xml.replace(/>\s*</g, '><');
    const indentedXml = xmlWithoutGaps.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3');
    let formatted = '';
    let pad = 0;
  
    indentedXml.split('\r\n').forEach(node => {
        let indent = 0;
        if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else if (node.match(/^<\/\w/)) {
            if (pad > 0) {
                pad -= 1;
            }
        }
        
        let padding = '';
        for (let i = 0; i < pad; i++) {
            padding += PADDING;
        }
        
        formatted += padding + node + '\r\n';
        pad += indent;
    });
  
    return formatted.trim();
  }

function toggleViewMode() {
    if (!monacoEditor) return;
  
    isRenderedView = !isRenderedView;
  
    if (isRenderedView) {
        showRenderedView(monacoEditor.getValue(), currentFileName);
    } else {
        renderedView.style.display = "none";
        document.getElementById("monacoEditor").style.display = "block";
        viewSwitchBtn.textContent = t("view_rendered");
    }
  }

function showRenderedView(content, fileName) {
    renderedView.innerHTML = "";
    renderedView.className = "rendered-container";
    const ext = fileName.split(".").pop().toLowerCase();
  
    try {
        let viewFunction;
        switch (ext) {
            case 'iflw': viewFunction = buildIflowView; break;
            case 'propdef': viewFunction = buildPropDefView; break;
            case 'mf': viewFunction = buildManifestView; break;
            case 'project': viewFunction = buildProjectView; break;
            case 'prop': viewFunction = (c, f) => buildPropView(c, currentFiles); break;
            case 'json': viewFunction = buildJsonView; break;
            case 'mmap': viewFunction = buildMmapView; break;
            case 'guideline_report': viewFunction = buildGuidelineReportView; break;
            default: renderedView.textContent = t("no_view_available"); return;
        }
        
        const viewContent = viewFunction(content, fileName);
        if (viewContent instanceof Node) {
            renderedView.appendChild(viewContent);
        } else {
            renderedView.innerHTML = viewContent;
        }

    } catch (e) {
      console.error("Erro ao renderizar arquivo:", e);
      renderedView.innerHTML = `<div class="error">${t("render_error")
        .replace("{file}", fileName)
        .replace("{error}", e.message)}</div>`;
    } finally {
        renderedView.style.display = "block";
        document.getElementById("monacoEditor").style.display = "none";
        viewSwitchBtn.textContent = t("view_code");
    }
}

function buildIflowView(content) {
    const iframe = document.createElement("iframe");
    iframe.src = "bpmn_viewer.html";
    iframe.onload = () => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(content, "*");
        }
    };
    return iframe;
}

function buildJsonView(content) {
    try {
        const obj = JSON.parse(content);
        if (obj.resources && Array.isArray(obj.resources)) {
            const container = document.createElement('div');
            buildContentPackageView(obj, currentFiles).then(view => {
                container.appendChild(view);
            });
            return container;
        } else {
            return buildJsonTree(obj, "JSON");
        }
    } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
    }
}

function buildPropDefView(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const parameters = xmlDoc.querySelectorAll("parameter");

  if (parameters.length === 0)
    return `<p>${t("no_param_defined")}</p>`;

  let table = `<h3>${t("param_defs_title")}</h3>
                 <table class="metadata-table">
                   <thead>
                     <tr>
                       <th>${t("param_table_name")}</th>
                       <th>${t("param_table_type")}</th>
                       <th>${t("param_table_required")}</th>
                       <th>${t("param_table_description")}</th>
                     </tr>
                   </thead>
                   <tbody>`;

  parameters.forEach((param) => {
    const name = param.querySelector("name")?.textContent || "N/A";
    const type = param.querySelector("type")?.textContent || "N/A";
    const isRequired =
      param.querySelector("isRequired")?.textContent || "false";
    const description = param.querySelector("description")?.textContent || "";
    table += `<tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(type)}</td>
                    <td>${escapeHtml(isRequired)}</td>
                    <td>${escapeHtml(description)}</td>
                  </tr>`;
  });

  table += "</tbody></table>";
  return table;
}

function buildManifestView(textContent) {
  const lines = textContent.split(/\r?\n/);
  const properties = {};
  let lastKey = "";

  lines.forEach((line) => {
    if (line.startsWith(" ")) {
      if (lastKey && properties[lastKey]) {
        properties[lastKey] += line.substring(1);
      }
    } else {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex > 0) {
        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();
        properties[key] = value;
        lastKey = key;
      }
    }
  });

  let table = `<h3>${t("manifest_metadata_title")}</h3>
                 <table class="metadata-table">
                   <thead>
                     <tr><th>${t("manifest_table_key")}</th><th>${t("manifest_table_value")}</th></tr>
                   </thead>
                   <tbody>`;

  for (const key in properties) {
    if (
      Object.prototype.hasOwnProperty.call(properties, key) &&
      properties[key]
    ) {
      table += `<tr><td><strong>${escapeHtml(
        key
      )}</strong></td><td>${escapeHtml(properties[key])}</td></tr>`;
    }
  }

  table += "</tbody></table>";
  return table;
}

function buildProjectView(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  
    const projectName =
      xmlDoc.querySelector("name")?.textContent || "Nome não encontrado";
    const comment = xmlDoc.querySelector("comment")?.textContent || "";
    const natures = Array.from(xmlDoc.querySelectorAll("nature")).map(
      (n) => n.textContent
    );
  
    let html = `<h3>${t("project_details_title")}</h3>
                  <p><strong>${t("project_name_label")}</strong> ${escapeHtml(
                    projectName
                  )}</p>`;
  
    if (comment) {
      html += `<p><strong>${t("project_comment_label")}</strong> ${escapeHtml(comment)}</p>`;
    }
  
    if (natures.length > 0) {
      html += `<h4>${t("project_natures_title")}</h4>
                   <ul class="script-list">`;
      natures.forEach((nature) => {
        html += `<li class="script-item">${escapeHtml(nature)}</li>`;
      });
      html += "</ul>";
    }
  
    return html;
}

function buildPropView(propContent, allFiles) {
    const paramTypes = {};
  
    const parsePropDefForTypes = (xmlContent) => {
      const typesMap = {};
      if (!xmlContent) return typesMap;
  
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
        const parameters = xmlDoc.querySelectorAll("parameter");
  
        parameters.forEach((param) => {
          const name = param.querySelector("name")?.textContent;
          const type = param.querySelector("type")?.textContent;
          if (name && type) {
            typesMap[name] = type;
          }
        });
      } catch (e) {
        console.error("Erro ao parsear o arquivo .propdef:", e);
      }
      return typesMap;
    };
  
    const propDefFileName = Object.keys(allFiles).find((f) =>
      f.endsWith(".propdef")
    );
    if (propDefFileName) {
      Object.assign(paramTypes, parsePropDefForTypes(allFiles[propDefFileName]));
    }
  
    let html = `<h3>${t("param_values_title")}</h3>`;
    const lines = propContent
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("#") && line.includes("="));
  
    if (lines.length === 0) {
      return html + `<p>${t("no_param_configured")}</p>`;
    }
  
    lines.forEach((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
  
      html += `<div class="result-section">`;
      html += `<h4 class="result-title">${t("param_label").replace("{param}", escapeHtml(key))}</h4>`;
  
      if (paramTypes[key] === "custom:schedule" && value.includes("<row>")) {
        const timerData = {};
        const rows = value.match(/<row>(.*?)<\/row>/g) || [];
        rows.forEach((row) => {
          const cells = row.match(/<cell>(.*?)<\/cell>/g);
          if (cells && cells.length === 2) {
            const cellKey = cells[0]
              .replace(/<\/?cell>/g, "")
              .replace(/\\:/g, ":");
            const cellValue = cells[1]
              .replace(/<\/?cell>/g, "")
              .replace(/\\:/g, ":");
            timerData[cellKey] = cellValue;
          }
        });
  
        const cronExpression = timerData.schedule1
          ? timerData.schedule1.split("&")[0].replace(/\+/g, " ")
          : "N/A";
  
        html += `<table class="metadata-table">
                          <tbody>
                              <tr><td><strong>${t("trigger_type_label")}</strong></td><td>${escapeHtml(
                                timerData.triggerType || "N/A"
                              )}</td></tr>
                              <tr><td><strong>${t("schedule_date_label")}</strong></td><td>${escapeHtml(
                                timerData.yearValue || "????"
                              )}-${escapeHtml(
          timerData.monthValue || "??"
        )}-${escapeHtml(timerData.dayValue || "??")}</td></tr>
                              <tr><td><strong>${t("schedule_time_label")}</strong></td><td>${escapeHtml(
                                timerData.hourValue || "??"
                              )}:${escapeHtml(
          timerData.minutesValue || "??"
        )}</td></tr>
                              <tr><td><strong>${t("timezone_label")}</strong></td><td>${escapeHtml(
                                timerData.timeZone || "N/A"
                              )}</td></tr>
                              <tr><td><strong>${t("cron_expression_label")}</strong></td><td><div class="code-block">${escapeHtml(
                                cronExpression
                              )}</div></td></tr>
                          </tbody>
                       </table>`;
      } else {
        html += `<div class="code-block">${escapeHtml(value)}</div>`;
      }
  
      html += `</div>`;
    });
  
    return html;
}

function buildJsonTree(obj, name = "") {
    const li = document.createElement("li");
    const hasChildren =
      typeof obj === "object" && obj !== null && Object.keys(obj).length > 0;
  
    let contentWrapper = document.createElement("span");
    let content = `<span class="json-key">${name}</span>`;
    if (hasChildren) {
      const icon = `<span class="tree-node-icon">▼</span>`;
      content = icon + content;
      content += ` <span class="json-info">${
        Array.isArray(obj) ? `[${obj.length}]` : `{${Object.keys(obj).length}}`
      }</span>`;
    } else {
      content += `: <span class="json-value">${escapeHtml(
        JSON.stringify(obj)
      )}</span>`;
    }
    contentWrapper.innerHTML = content;
    li.appendChild(contentWrapper);
  
    if (hasChildren) {
      const childrenContainer = document.createElement("ul");
      childrenContainer.style.display = "block";
      for (const key in obj) {
        childrenContainer.appendChild(buildJsonTree(obj[key], key));
      }
      li.appendChild(childrenContainer);
      contentWrapper
        .querySelector(".tree-node-icon")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          const isVisible = childrenContainer.style.display !== "none";
          childrenContainer.style.display = isVisible ? "none" : "block";
          e.target.textContent = isVisible ? "►" : "▼";
        });
    }
  
    if (name === "JSON") {
      const root = document.createElement("ul");
      root.className = "tree-view";
      root.appendChild(li);
      return root;
    }
    return li;
}

function buildMmapView(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
  
    const container = document.createElement("div");
    container.className = "mmap-container";
  
    const leftPanel = document.createElement("div");
    leftPanel.className = "tree-panel";
    const rightPanel = document.createElement("div");
    rightPanel.className = "tree-panel";
  
    const srcHierarchy = {},
      dstHierarchy = {},
      mapping = {};
    const nodeMap = new Map();
  
    function buildHierarchyForPath(root, path) {
      if (!path) return;
      const parts = path.split("/").filter(Boolean);
      let node = root;
      parts.forEach((part) => {
        node[part] = node[part] || {};
        node = node[part];
      });
    }
  
    const dstBricks = Array.from(xmlDoc.querySelectorAll('brick[type="Dst"]'));
    dstBricks.forEach((dstBrick) => {
      const rawDstPath = dstBrick.getAttribute("path");
      if (!rawDstPath) return;
  
      const dstPath = rawDstPath.replace(/^\//, "");
  
      buildHierarchyForPath(dstHierarchy, dstPath);
  
      const srcBricksInside = Array.from(
        dstBrick.querySelectorAll('arg > brick[type="Src"]')
      );
      srcBricksInside.forEach((srcBrick) => {
        const rawSrcPath = srcBrick.getAttribute("path");
        if (!rawSrcPath) return;
  
        const srcPath = rawSrcPath.replace(/^\//, "");
  
        buildHierarchyForPath(srcHierarchy, srcPath);
        if (!mapping[srcPath]) mapping[srcPath] = new Set();
        mapping[srcPath].add(dstPath);
      });
    });
  
    function buildHtmlTree(obj, panel) {
      const ul = document.createElement("ul");
      Object.keys(obj).forEach((key) => {
        const li = document.createElement("li");
        const hasChildren = Object.keys(obj[key]).length > 0;
        let content = `<span>${escapeHtml(key)}</span>`;
        if (hasChildren) {
          content = `<span class="tree-node-icon">▼</span>` + content;
        }
        li.innerHTML = content;
        const currentPath =
          (panel.dataset.path ? panel.dataset.path + "/" : "") + key;
        li.dataset.path = currentPath;
        if (hasChildren) {
          const childPanel = document.createElement("div");
          childPanel.dataset.path = currentPath;
          childPanel.appendChild(buildHtmlTree(obj[key], childPanel));
          li.appendChild(childPanel);
          li.querySelector(".tree-node-icon").addEventListener("click", (e) => {
            e.stopPropagation();
            const childrenContainer = li.querySelector("div");
            const isVisible = childrenContainer.style.display !== "none";
            childrenContainer.style.display = isVisible ? "none" : "block";
            e.target.textContent = isVisible ? "►" : "▼";
          });
        }
        ul.appendChild(li);
      });
      return ul;
    }
  
    leftPanel.appendChild(buildHtmlTree(srcHierarchy, leftPanel));
    rightPanel.appendChild(buildHtmlTree(dstHierarchy, rightPanel));
    container.appendChild(leftPanel);
    container.appendChild(rightPanel);
  
    container
      .querySelectorAll("li[data-path]")
      .forEach((li) => nodeMap.set(li.dataset.path, li));
  
    container.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li || !li.dataset.path) return;
  
      container
        .querySelectorAll(".highlight")
        .forEach((el) => el.classList.remove("highlight"));
  
      const clickedPath = li.dataset.path;
      const pathsToHighlight = new Set([clickedPath]);
  
      if (mapping[clickedPath]) {
        mapping[clickedPath].forEach((p) => pathsToHighlight.add(p));
      }
      for (const srcPath in mapping) {
        if (mapping[srcPath].has(clickedPath)) {
          pathsToHighlight.add(srcPath);
        }
      }
  
      pathsToHighlight.forEach((path) => {
        const node = nodeMap.get(path);
        if (node) node.classList.add("highlight");
      });
    });

    const observer = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
            // Lógica de desenho das linhas pode ser adicionada aqui se necessário
            obs.disconnect();
        }
      }, { threshold: 0.1 });
    
      observer.observe(container);
  
    return container;
  }
  
function buildResourcesTable(obj) {
    const resources = obj.resources || [];
    let html =
      '<table class="resources-table"><thead><tr><th>Display Name</th><th>Type</th><th>Version</th><th>Modified By</th><th>Modified At</th></tr></thead><tbody>';
    resources.forEach((r, index) => {
      html +=
        `<tr data-index="${index}"><td>${escapeHtml(
          r.displayName || r.name || ""
        )}</td>` +
        `<td>${escapeHtml(r.resourceType || "")}</td>` +
        `<td>${escapeHtml(r.semanticVersion || r.version || "")}</td>` +
        `<td>${escapeHtml(r.modifiedBy || "")}</td>` +
        `<td>${escapeHtml(
          r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : ""
        )}</td></tr>`;
    });
    html += "</tbody></table>";
    return html;
  }

function enableResourceTableInteraction(table, resources, onRowClick) {
    if (!onRowClick) return;

    table.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      if (!row || !row.dataset.index) return;
  
      Array.from(table.querySelectorAll(".selected-row")).forEach((r) =>
        r.classList.remove("selected-row")
      );
      row.classList.add("selected-row");
  
      const resourceIndex = parseInt(row.dataset.index, 10);
      if (resources && resources[resourceIndex]) {
        onRowClick(resources[resourceIndex]);
      }
    });
  }

async function buildContentPackageView(packageData, allFilesContent) {
    const container = document.createElement("div");
    container.className = "package-view-container";
  
    const packageInfo = packageData.resources.find(
      (r) => r.resourceType === "ContentPackage"
    );
    const artifacts = packageData.resources.filter(
      (r) => r.resourceType !== "ContentPackage"
    );
    const relations = packageData.relations || [];
  
    if (packageInfo) {
      const infoHeader = document.createElement("h2");
      infoHeader.textContent = t("package_info_header");
      container.appendChild(infoHeader);
  
      const infoTable = document.createElement("table");
      infoTable.className = "metadata-table";
      let infoHtml = "<tbody>";
      infoHtml += `<tr><td class="main-key">${t("package_name_label")}</td><td>${escapeHtml(
        packageInfo.displayName
      )}</td></tr>`;
      infoHtml += `<tr><td class="main-key">${t("version_label")}</td><td>${escapeHtml(
        packageInfo.semanticVersion
      )}</td></tr>`;
  
      if (packageInfo.additionalAttributes?.shortText?.attributeValues[0]) {
        infoHtml += `<tr><td class="main-key">${t("description_label")}</td><td>${escapeHtml(
          packageInfo.additionalAttributes.shortText.attributeValues[0]
        )}</td></tr>`;
      }
      if (packageInfo.additionalAttributes?.Vendor?.attributeValues[0]) {
        infoHtml += `<tr><td class="main-key">${t("vendor_label")}</td><td>${escapeHtml(
          packageInfo.additionalAttributes.Vendor.attributeValues[0]
        )}</td></tr>`;
      }
      infoHtml += "</tbody>";
      infoTable.innerHTML = infoHtml;
      container.appendChild(infoTable);
    }
  
    if (artifacts.length > 0) {
      const artifactsHeader = document.createElement("h2");
      artifactsHeader.textContent = t("package_artifacts_header");
      container.appendChild(artifactsHeader);
  
      const artifactsTableHtml = buildResourcesTable({ resources: artifacts });
      const artifactsDiv = document.createElement("div");
      artifactsDiv.innerHTML = artifactsTableHtml;
      const artifactsTable = artifactsDiv.querySelector("table");
      if (artifactsTable) {
        enableResourceTableInteraction(artifactsTable, artifacts, (resource) => {
          openResourceInMonaco(
            resource.id,
            resource.displayName || resource.name,
            resource.resourceType
          );
        });
        container.appendChild(artifactsTable);
      }
    }
  
    if (relations.length > 0) {
      const relationsHeader = document.createElement("h2");
      relationsHeader.textContent = t("relations_header");
      container.appendChild(relationsHeader);
      container.appendChild(
        buildRelationsTable(relations, packageData.resources)
      );
    }
  
    const iFlows = artifacts.filter(
      (a) => a.resourceType === "IFlow" && allFilesContent[a.id + "_content"]
    );
  
    if (iFlows.length > 0) {
      const endpointsHeader = document.createElement("h2");
      endpointsHeader.textContent = t("iflow_endpoints_header");
      container.appendChild(endpointsHeader);
  
      const endpointsTable = document.createElement("table");
      endpointsTable.className = "metadata-table endpoints-table";
      let html =
        `<thead><tr><th>${t("endpoint_table_iflow")}</th><th>${t("endpoint_table_participant")}</th><th>${t("endpoint_table_role")}</th><th>${t("endpoint_table_protocol")}</th><th>${t("endpoint_table_address")}</th></tr></thead><tbody>`;
  
      for (const iflow of iFlows) {
        const iflowContent = allFilesContent[iflow.id + "_content"];
        const endpoints = await extractIFlowEndpoints(iflowContent);
  
        if (endpoints.length > 0) {
          endpoints.forEach((endpoint, index) => {
            html += `<tr>
                          ${
                            index === 0
                              ? `<td rowspan="${endpoints.length}">${escapeHtml(
                                  iflow.displayName
                                )}</td>`
                              : ""
                          }
                          <td>${escapeHtml(endpoint.name)}</td>
                          <td>${escapeHtml(endpoint.role)}</td>
                          <td>${escapeHtml(endpoint.protocol)}</td>
                          <td>${escapeHtml(endpoint.address)}</td>
                      </tr>`;
          });
        } else {
          html += `<tr><td>${escapeHtml(
            iflow.displayName
          )}</td><td colspan="4"><i>${t("no_participants")}</i></td></tr>`;
        }
      }
  
      html += "</tbody>";
      endpointsTable.innerHTML = html;
      container.appendChild(endpointsTable);
    }
  
    return container;
}
  
function buildRelationsTable(relations, resources) {
    const resourceMap = new Map(resources.map((r) => [r.id, r.displayName]));
  
    const table = document.createElement("table");
    table.className = "metadata-table relations-table";
    let html =
      `<thead><tr><th>${t("relations_table_source")}</th><th>${t("relations_table_target")}</th><th>${t("relations_table_type")}</th></tr></thead><tbody>`;
  
    relations.forEach((rel) => {
      const sourceName = resourceMap.get(rel.sourceId) || rel.sourceId;
      const targetName = resourceMap.get(rel.targetId) || rel.targetId;
      html += `<tr>
              <td>${escapeHtml(sourceName)}</td>
              <td>${escapeHtml(targetName)}</td>
              <td>${escapeHtml(rel.relationType)}</td>
          </tr>`;
    });
  
    html += "</tbody>";
    table.innerHTML = html;
    return table;
}
  
async function extractIFlowEndpoints(iflowZipContent) {
    const BpmnJS = window.BpmnJS;
    const JSZip = window.JSZip;
    if (!BpmnJS || !JSZip) {
      console.error("Bibliotecas necessárias não encontradas (bpmn-js, jszip).");
      return [];
    }
  
    let iflowXml = "";
    try {
      const zip = await new JSZip().loadAsync(iflowZipContent);
      const xmlFile = Object.values(zip.files).find(
        (file) => !file.dir && /\.(iflw|bpmn|xml)$/i.test(file.name)
      );
  
      if (!xmlFile) {
        console.error("Arquivo BPMN/XML não encontrado no iFlow.");
        return [];
      }
      iflowXml = await xmlFile.async("string");
    } catch (e) {
      if (
        typeof iflowZipContent === "string" &&
        iflowZipContent.trim().startsWith("<")
      ) {
        iflowXml = iflowZipContent;
      } else {
        console.error("Erro ao descompactar ou ler o conteúdo do iFlow:", e);
        return [];
      }
    }
  
    const bpmnViewer = new BpmnJS();
  
    try {
      await bpmnViewer.importXML(iflowXml);
      const elementRegistry = bpmnViewer.get("elementRegistry");
      const participants = [];
  
      const participantElements = elementRegistry.filter(
        (el) => el.type === "bpmn:Participant" && !el.businessObject.processRef
      );
  
      participantElements.forEach((p) => {
        const endpoint = {
          name: p.businessObject.name || p.id,
          role: "Indefinido",
          protocol: "N/A",
          address: "N/A",
        };
  
        if (p.incoming?.length > 0) {
          endpoint.role = "Receiver";
        }
        if (p.outgoing?.length > 0) {
            endpoint.role = (endpoint.role === "Receiver") ? "Sender/Receiver" : "Sender";
        }
  
        const messageFlow = p.incoming?.[0] || p.outgoing?.[0];
  
        if (messageFlow?.businessObject?.extensionElements?.values) {
          const properties = messageFlow.businessObject.extensionElements.values;
          let messageProtocol = "",
              transportProtocol = "",
              componentType = "",
              addressParticipant = "",
              httpAddrParticipant = "";
  
          for (const prop of properties) {
            if (prop.$type === "ifl:property" && prop.$children) {
              const keyNode = prop.$children.find((c) => c.$type === "key");
              const valueNode = prop.$children.find((c) => c.$type === "value");
  
              if (keyNode && valueNode) {
                const key = keyNode.$body;
                const value = valueNode.$body;
  
                if (key === "MessageProtocol") messageProtocol = value;
                if (key === "TransportProtocol") transportProtocol = value;
                if (key === "ComponentType") componentType = value;
                if (key.toLowerCase() === "address") addressParticipant = value;
                if (key === "httpAddressWithoutQuery") httpAddrParticipant = value;
              }
            }
          }
          
          endpoint.protocol = [messageProtocol, transportProtocol, componentType].find(p => p && !["None", "Not Applicable"].includes(p)) || 'N/A';
          endpoint.address = [addressParticipant, httpAddrParticipant].find(a => a && !["None", "Not Applicable"].includes(a)) || 'N/A';
        }
        participants.push(endpoint);
      });
  
      return participants;
    } catch (err) {
      console.error("Erro ao processar o diagrama BPMN:", err);
      return [];
    } finally {
      bpmnViewer.destroy();
    }
}
  
function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") {
      return unsafe;
    }
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
  
function buildGuidelineReportView(report) {
    let html = `<div class="guideline-report-view">`;
    html += `<h2>${t('guideline_report_title')}</h2>`;
    html += `<div class="summary-grid">
        <div class="summary-box pass"><strong>${report.summary.pass}</strong><span>${t('guideline_pass')}</span></div>
        <div class="summary-box warn"><strong>${report.summary.warn}</strong><span>${t('guideline_warn')}</span></div>
        <div class="summary-box fail"><strong>${report.summary.fail}</strong><span>${t('guideline_fail')}</span></div>
    </div>`;
    
    html += '<h3>Detalhes das Verificações</h3>';
    report.results.forEach(res => {
        html += `<div class="guideline-item ${res.result}">
            <div class="guideline-header">
                <span class="guideline-icon"></span>
                <strong>${escapeHtml(res.name)}</strong>
            </div>
            <p class="guideline-desc">${escapeHtml(res.description)}</p>
            <p class="guideline-message">${escapeHtml(res.message)}</p>
        </div>`;
    });

    html += `</div>`;
    return html;
}