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
  if (
    ["iflw", "project", "mf", "prop", "propdef", "mmap", "json"].includes(ext)
  ) {
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

// ==================================================================
// ======== INÍCIO DA SEÇÃO DE CÓDIGO CORRIGIDO E MELHORADO ========
// ==================================================================

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
      if (tbl) {
        // Interação da tabela agora é funcional
        enableResourceTableInteraction(tbl, obj.resources, (resource) => {
          console.log("Recurso selecionado:", resource);
          alert(`Você clicou em: ${resource.displayName}`);
          // Futuramente, você pode adicionar uma ação aqui, como carregar o artefato.
        });
      }
    } catch (e) {
      renderedView.textContent = "Erro ao processar JSON: " + e.message;
    }
  } else if (ext === "iflw") {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    const encoded = encodeURIComponent(base64);
    renderedView.innerHTML = `<iframe src="bpmn_viewer.html?data=${encoded}&lang=${currentLang}"></iframe>`;
  } else if (ext === "json") {
    try {
      const obj = JSON.parse(content);
      renderedView.innerHTML = ""; // Limpa antes de adicionar a árvore
      renderedView.appendChild(buildJsonTree(obj, "JSON"));
    } catch (e) {
      renderedView.textContent = "Erro ao processar JSON: " + e.message;
    }
  } else if (ext === "mmap") {
    try {
      renderedView.innerHTML = ""; // Limpa antes de adicionar a visualização
      renderedView.appendChild(buildMmapView(content));
    } catch (e) {
      renderedView.textContent = "Erro ao processar MMAP: " + e.message;
    }
  } else if (["project", "mf", "prop", "propdef"].includes(ext)) {
    if (ext === "project") {
      renderedView.innerHTML = buildMetadataTableFromXml(content);
    } else {
      renderedView.innerHTML = buildMetadataTableFromLines(content);
    }
  }
}

/**
 * [CORRIGIDO] Constrói uma árvore JSON interativa com funcionalidade de expandir/recolher.
 */
function buildJsonTree(obj, name = "") {
  const li = document.createElement("li");
  const hasChildren =
    typeof obj === "object" && obj !== null && Object.keys(obj).length > 0;

  let contentWrapper = document.createElement("span");

  let content = `<span class="json-key">${name}</span>`;
  if (hasChildren) {
    const icon = `<span class="tree-node-icon">▼</span>`;
    content = icon + content;
    if (Array.isArray(obj)) {
      content += ` <span class="json-info">[${obj.length} items]</span>`;
    } else {
      content += ` <span class="json-info">{${
        Object.keys(obj).length
      } keys}</span>`;
    }
  } else {
    content += `: <span class="json-value">${escapeHtml(
      JSON.stringify(obj)
    )}</span>`;
  }
  contentWrapper.innerHTML = content;
  li.appendChild(contentWrapper);

  if (hasChildren) {
    const childrenContainer = document.createElement("ul");
    childrenContainer.style.display = "block"; // Começa expandido
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

  // Se for o nó raiz, retorna a lista completa
  if (name === "JSON") {
    const root = document.createElement("ul");
    root.appendChild(li);
    return root;
  }
  return li;
}

/**
 * Constrói a visualização de mapeamento com lógica de conexão e destaque de clique corretos.
 */
function buildMmapView(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    const container = document.createElement("div");
    container.className = "mmap-container";

    const leftPanel = document.createElement("div");
    leftPanel.className = "tree-panel";
    const rightPanel = document.createElement("div");
    rightPanel.className = "tree-panel";

    const srcHierarchy = {}, dstHierarchy = {}, mapping = {};
    const nodeMap = new Map();
    const lineMap = new Map(); // Otimização para encontrar linhas rapidamente

    function buildHierarchyForPath(root, path) {
        if (!path) return;
        const parts = path.split('/').filter(Boolean);
        let node = root;
        parts.forEach(part => {
            node[part] = node[part] || {};
            node = node[part];
        });
    }

    const dstBricks = Array.from(xmlDoc.querySelectorAll('brick[type="Dst"]'));
    dstBricks.forEach(dstBrick => {
        const rawDstPath = dstBrick.getAttribute("path");
        if (!rawDstPath) return;
        
        // CORREÇÃO CRÍTICA AQUI: Remove a barra inicial para padronizar o path.
        const dstPath = rawDstPath.replace(/^\//, '');
        
        buildHierarchyForPath(dstHierarchy, dstPath);

        const srcBricksInside = Array.from(dstBrick.querySelectorAll('arg > brick[type="Src"]'));
        srcBricksInside.forEach(srcBrick => {
            const rawSrcPath = srcBrick.getAttribute("path");
            if (!rawSrcPath) return;

            // CORREÇÃO CRÍTICA AQUI: Remove a barra inicial também no path de origem.
            const srcPath = rawSrcPath.replace(/^\//, '');

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
            const currentPath = (panel.dataset.path ? panel.dataset.path + "/" : "") + key;
            li.dataset.path = currentPath;
            if (hasChildren) {
                const childPanel = document.createElement("div");
                childPanel.dataset.path = currentPath;
                childPanel.appendChild(buildHtmlTree(obj[key], childPanel));
                li.appendChild(childPanel);
                li.querySelector('.tree-node-icon').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const childrenContainer = li.querySelector('div');
                    const isVisible = childrenContainer.style.display !== 'none';
                    childrenContainer.style.display = isVisible ? 'none' : 'block';
                    e.target.textContent = isVisible ? '►' : '▼';
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

    container.querySelectorAll('li[data-path]').forEach(li => nodeMap.set(li.dataset.path, li));
    
    container.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li || !li.dataset.path) return;

        container.querySelectorAll(".highlight").forEach((el) => el.classList.remove("highlight"));
        
        const clickedPath = li.dataset.path;
        const pathsToHighlight = new Set([clickedPath]);
        
        if (mapping[clickedPath]) {
            mapping[clickedPath].forEach(p => pathsToHighlight.add(p));
        }
        for (const srcPath in mapping) {
            if (mapping[srcPath].has(clickedPath)) {
                pathsToHighlight.add(srcPath);
            }
        }

        pathsToHighlight.forEach(path => {
            // Destaca o nó de texto
            const node = nodeMap.get(path);
            if (node) node.classList.add("highlight");
            
        });
    });

    // Usa um observer para desenhar as linhas somente quando o container estiver visível no DOM
    const observer = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
            obs.disconnect(); // Desenha uma vez e para de observar
        }
    });
    observer.observe(container);

    return container;
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
  // Lógica aprimorada para nós aninhados, se houver
  const nodes = Array.from(xmlDoc.querySelectorAll("projectDescription > *"));
  let html =
    '<table class="metadata-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
  nodes.forEach((node) => {
    if (node.children.length === 0) {
      // Pega apenas nós sem filhos
      const key = escapeHtml(node.nodeName);
      const val = escapeHtml(node.textContent.trim());
      if (val) {
        html += `<tr><td>${key}</td><td>${val}</td></tr>`;
      }
    }
  });
  html += "</tbody></table>";
  return html;
}

/**
 * [CORRIGIDO] Adiciona 'data-index' para interação e formata a data.
 */
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

/**
 * [CORRIGIDO] Aceita um callback para tornar a interação útil.
 */
function enableResourceTableInteraction(table, resources, onRowClick) {
  table.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || !row.dataset.index) return;

    Array.from(table.querySelectorAll(".selected-row")).forEach((r) =>
      r.classList.remove("selected-row")
    );
    row.classList.add("selected-row");

    const resourceIndex = parseInt(row.dataset.index, 10);
    if (onRowClick && resources && resources[resourceIndex]) {
      onRowClick(resources[resourceIndex]);
    }
  });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
