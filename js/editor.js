// Editor related functions
let isRenderedView = false;
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
  isRenderedView = false;
  document.getElementById("monacoEditor").style.display = "block";
  renderedView.style.display = "none";
  const ext = fileName.split(".").pop().toLowerCase();
  if (["iflw", "project", "mf", "prop", "propdef", "mmap", "json"].includes(ext)) {
    viewSwitchBtn.style.display = "inline-block";
  } else {
    viewSwitchBtn.style.display = "none";
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

function toggleViewMode() {
  if (!monacoEditor) return;
  if (isRenderedView) {
    renderedView.style.display = "none";
    document.getElementById("monacoEditor").style.display = "block";
    isRenderedView = false;
  } else {
    showRenderedView(monacoEditor.getValue(), currentFileName);
    renderedView.style.display = "block";
    document.getElementById("monacoEditor").style.display = "none";
    isRenderedView = true;
  }
}

function showRenderedView(content, fileName) {
  renderedView.innerHTML = "";
  renderedView.className = "rendered-container";
  const lowerName = fileName.toLowerCase();
  const ext = lowerName.split(".").pop();
  if (lowerName === "resources_decoded.json") {
    try {
      const obj = JSON.parse(content);
      renderedView.innerHTML = buildResourcesTable(obj);
      const tbl = renderedView.querySelector("table");
      if (tbl) enableResourceTableInteraction(tbl);
    } catch (e) {
      renderedView.textContent = t("error_label") + e.message;
    }
  } else if (ext === "iflw") {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    const encoded = encodeURIComponent(base64);
    renderedView.innerHTML = `<iframe src="bpmn_viewer.html?data=${encoded}&lang=${currentLang}"></iframe>`;
  } else if (ext === "json") {
    try {
      const obj = JSON.parse(content);
      renderedView.classList.add("tree-view");
      renderedView.appendChild(buildJsonTree(obj));
    } catch (e) {
      renderedView.textContent = t("error_label") + e.message;
    }
  } else if (ext === "mmap") {
    try {
      renderedView.appendChild(buildMmapView(content));
    } catch (e) {
      renderedView.textContent = t("error_label") + e.message;
    }
  } else if (["project", "mf", "prop", "propdef"].includes(ext)) {
    if (ext === "project") {
      renderedView.innerHTML = buildMetadataTableFromXml(content);
    } else {
      renderedView.innerHTML = buildMetadataTableFromLines(content);
    }
  }
}

function buildJsonTree(obj) {
  const ul = document.createElement("ul");
  for (const key in obj) {
    const li = document.createElement("li");
    if (typeof obj[key] === "object" && obj[key] !== null) {
      li.textContent = key;
      li.appendChild(buildJsonTree(obj[key]));
    } else {
      li.textContent = `${key}: ${obj[key]}`;
    }
    ul.appendChild(li);
  }
  return ul;
}

function buildXmlTree(node) {
  const li = document.createElement("li");
  let text = node.nodeName;
  if (node.attributes && node.attributes.length) {
    const attrs = [];
    for (const attr of node.attributes) {
      attrs.push(`${attr.name}=${attr.value}`);
    }
    text += ` [${attrs.join(", ")}]`;
  }
  li.textContent = text;
  const children = Array.from(node.childNodes).filter((n) => n.nodeType === 1);
  if (children.length) {
    const ul = document.createElement("ul");
    children.forEach((child) => ul.appendChild(buildXmlTree(child)));
    li.appendChild(ul);
  }
  const wrapper = document.createElement("ul");
  wrapper.appendChild(li);
  return wrapper;
}

function buildTableView(text) {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
  let html = "<table><tbody>";
  rows.forEach((line) => {
    const parts = line.split(/[:=]/);
    if (parts.length >= 2) {
      const key = escapeHtml(parts.shift());
      const val = escapeHtml(parts.join("="));
      html += `<tr><td>${key}</td><td>${val}</td></tr>`;
    } else {
      html += `<tr><td colspan="2">${escapeHtml(line)}</td></tr>`;
    }
  });
  html += "</tbody></table>";
  return html;
}

function buildMetadataTableFromLines(text) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l);
  let html =
    '<table class="metadata-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
  rows.forEach((line) => {
    const match = line.match(/^([^:=]+)[:=](.*)$/);
    if (match) {
      const key = escapeHtml(match[1].trim());
      const val = escapeHtml(match[2].trim());
      html += `<tr><td>${key}</td><td>${val}</td></tr>`;
    }
  });
  html += "</tbody></table>";
  return html;
}

function buildMetadataTableFromXml(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const nodes = Array.from(xmlDoc.documentElement.children);
  let html =
    '<table class="metadata-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
  nodes.forEach((node) => {
    const key = escapeHtml(node.nodeName);
    const val = escapeHtml(node.textContent.trim());
    html += `<tr><td>${key}</td><td>${val}</td></tr>`;
  });
  html += "</tbody></table>";
  return html;
}

function buildResourcesTable(obj) {
  const resources = obj.resources || [];
  let html =
    '<table class="resources-table"><thead><tr><th>Display Name</th><th>Type</th><th>Version</th><th>Modified By</th><th>Modified At</th></tr></thead><tbody>';
  resources.forEach((r) => {
    html += `<tr><td>${escapeHtml(r.displayName || r.name || "")}</td>` +
            `<td>${escapeHtml(r.resourceType || "")}</td>` +
            `<td>${escapeHtml(r.semanticVersion || r.version || "")}</td>` +
            `<td>${escapeHtml(r.modifiedBy || "")}</td>` +
            `<td>${escapeHtml(r.modifiedAt || "")}</td></tr>`;
  });
  html += "</tbody></table>";
  return html;
}

function enableResourceTableInteraction(table) {
  table.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row) return;
    Array.from(table.querySelectorAll(".selected-row")).forEach((r) =>
      r.classList.remove("selected-row")
    );
    row.classList.add("selected-row");
  });
}

function buildMmapView(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const bricks = Array.from(xmlDoc.getElementsByTagName("brick"));
  const srcBricks = bricks.filter((b) => b.getAttribute("type") === "Src");
  const dstBricks = bricks.filter((b) => b.getAttribute("type") === "Dst");

  function buildHierarchy(paths) {
    const root = {};
    paths.forEach((p) => {
      if (!p) return;
      const parts = p.split(/[\/]/).filter(Boolean);
      let node = root;
      parts.forEach((part) => {
        node[part] = node[part] || {};
        node = node[part];
      });
    });
    return root;
  }

  function buildTree(obj, prefix = "") {
    const ul = document.createElement("ul");
    Object.keys(obj).forEach((key) => {
      const li = document.createElement("li");
      li.textContent = key;
      const full = prefix ? prefix + "/" + key : key;
      li.dataset.path = full;
      if (Object.keys(obj[key]).length) {
        const icon = document.createElement("span");
        icon.textContent = "►";
        icon.className = "tree-node-icon";
        li.prepend(icon);
        const child = buildTree(obj[key], full);
        child.style.display = "none";
        li.appendChild(child);
        icon.addEventListener("click", (e) => {
          e.stopPropagation();
          if (child.style.display === "none") {
            child.style.display = "block";
            icon.textContent = "▼";
          } else {
            child.style.display = "none";
            icon.textContent = "►";
          }
        });
      }
      ul.appendChild(li);
    });
    return ul;
  }

  const srcPaths = srcBricks.map((b) => b.getAttribute("path"));
  const dstPaths = dstBricks.map((b) => b.getAttribute("path"));
  const srcTree = buildHierarchy(srcPaths);
  const dstTree = buildHierarchy(dstPaths);

  const mapping = {};
  function addMapping(a, b) {
    if (!a || !b) return;
    mapping[a] = mapping[a] || new Set();
    mapping[a].add(b);
  }
  bricks.forEach((b) => {
    const sp = b.getAttribute("srcPath") || (b.getAttribute("type") === "Src" ? b.getAttribute("path") : null);
    const dp = b.getAttribute("dstPath") || (b.getAttribute("type") === "Dst" ? b.getAttribute("path") : null);
    if (sp && dp) {
      addMapping(sp, dp);
      addMapping(dp, sp);
    }
  });

  const container = document.createElement("div");
  container.className = "tree-panel";

  const left = document.createElement("div");
  const right = document.createElement("div");
  left.appendChild(buildTree(srcTree));
  right.appendChild(buildTree(dstTree));
  container.appendChild(left);
  container.appendChild(right);

  container.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li || !li.dataset.path) return;
    const paths = new Set([li.dataset.path]);
    const related = mapping[li.dataset.path];
    if (related) {
      related.forEach((p) => paths.add(p));
    }
    container.querySelectorAll(".highlight").forEach((el) =>
      el.classList.remove("highlight")
    );
    const escapeCSS = (s) => (CSS && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"'));
    paths.forEach((p) => {
      const selector = `li[data-path="${escapeCSS(p)}"]`;
      container.querySelectorAll(selector).forEach((node) => {
        node.classList.add("highlight");
      });
    });
  });

  return container;
}
