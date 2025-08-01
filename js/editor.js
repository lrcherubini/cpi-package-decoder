// Editor related functions
let isRenderedView = false;

function initializeMonacoEditor(content, resourceName, baseFiles = {}) {
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

  loadContentIntoMonaco(content, resourceName, baseFiles);
}

function loadContentIntoMonaco(content, resourceName, baseFiles = {}) {
  currentFiles = { ...baseFiles };
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
            currentFiles[files[0]] = scriptContent;
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
        currentFiles[resourceName] = textContent;
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
    prop: "properties",
    yaml: "yaml",
    yml: "yaml",
    wsdl: "xml",
    mf: "plaintext",
  };
  return languageMap[ext] || "plaintext";
}

function setEditorContent(content, fileName) {
  // Configurações iniciais do Monaco (permanecem as mesmas)
  const language = detectLanguage(fileName);
  languageSelect.value = language;
  monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
  monacoEditor.setValue(content);
  currentFileName = fileName;

  const ext = fileName.split(".").pop().toLowerCase();
  const hasRenderedView = [
    "iflw",
    "project",
    "mf",
    "prop",
    "propdef",
    "mmap",
    "json",
  ].includes(ext);

  if (hasRenderedView) {
    // **LÓGICA INVERTIDA: RENDERIZADO É O PADRÃO**
    isRenderedView = true;
    viewSwitchBtn.style.display = "inline-block";
    viewSwitchBtn.textContent = t("view_code"); // Define o texto para a próxima ação

    showRenderedView(content, currentFileName);
    renderedView.style.display = "block";
    document.getElementById("monacoEditor").style.display = "none";
  } else {
    // Comportamento padrão para arquivos sem visão renderizada
    isRenderedView = false;
    viewSwitchBtn.style.display = "none";

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
    // MUDANDO PARA A VISÃO DE CÓDIGO
    renderedView.style.display = "none";
    document.getElementById("monacoEditor").style.display = "block";
    viewSwitchBtn.textContent = t("view_rendered"); // Atualiza o texto para a próxima ação
    isRenderedView = false;
  } else {
    // MUDANDO PARA A VISÃO RENDERIZADA
    showRenderedView(monacoEditor.getValue(), currentFileName);
    renderedView.style.display = "block";
    document.getElementById("monacoEditor").style.display = "none";
    viewSwitchBtn.textContent = t("view_code"); // Atualiza o texto para a próxima ação
    isRenderedView = true;
  }
}

// ==================================================================
// ========  INÍCIO DA SEÇÃO DE RENDERIZAÇÃO MELHORADA  ========
// ==================================================================
function showRenderedView(content, fileName) {
  renderedView.innerHTML = "";
  renderedView.className = "rendered-container";
  const ext = fileName.split(".").pop().toLowerCase();

  try {
    if (ext === "iflw") {
      // 1. Cria o iframe sem dados na URL
      const iframe = document.createElement("iframe");
      iframe.src = "bpmn_viewer.html";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";

      // 2. Define um evento 'onload' para enviar os dados quando o iframe estiver pronto
      iframe.onload = () => {
        // 3. Envia o conteúdo XML para o iframe usando postMessage
        // O '*' significa que qualquer origem pode receber, o que é seguro neste contexto de arquivos estáticos.
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(content, "*");
        }
      };

      // Limpa a área de renderização e adiciona o novo iframe
      renderedView.innerHTML = "";
      renderedView.appendChild(iframe);
    } else if (ext === "propdef") {
      renderedView.innerHTML = buildPropDefView(content);
    } else if (ext === "mf") {
      renderedView.innerHTML = buildManifestView(content);
    } else if (ext === "project") {
      renderedView.innerHTML = buildProjectView(content);
    } else if (ext === "prop") {
      renderedView.innerHTML = buildPropView(content, currentFiles);
    } else if (ext === "json") {
      try {
        const obj = JSON.parse(content);
        // Verifica se o JSON tem a estrutura de um ContentPackage
        if (obj.resources && Array.isArray(obj.resources)) {
          buildContentPackageView(obj, currentFiles).then((view) => {
            renderedView.innerHTML = ""; // Limpa a view antes de adicionar o novo conteúdo
            renderedView.appendChild(view);
          });
        } else {
          // Se não for, usa o visualizador de árvore JSON genérico
          renderedView.appendChild(buildJsonTree(obj, "JSON"));
        }
      } catch (e) {
        renderedView.textContent = "Erro ao processar JSON: " + e.message;
      }
    } else if (ext === "mmap") {
      renderedView.appendChild(buildMmapView(content));
    } else {
      renderedView.textContent =
        "Nenhuma visualização disponível para este tipo de arquivo.";
    }
  } catch (e) {
    console.error("Erro ao renderizar arquivo:", e);
    renderedView.innerHTML = `<div class="error">Ocorreu um erro ao tentar renderizar o arquivo ${fileName}.<br>${e.message}</div>`;
  }
}

/**
 * [NOVO] Constrói a visualização para arquivos .propdef, listando todos os parâmetros.
 */
function buildPropDefView(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const parameters = xmlDoc.querySelectorAll("parameter");

  if (parameters.length === 0)
    return "<p>Nenhum parâmetro definido neste arquivo.</p>";

  let table = `<h3>Definições de Parâmetros do Fluxo</h3>
                 <table class="metadata-table">
                   <thead>
                     <tr>
                       <th>Nome do Parâmetro</th>
                       <th>Tipo</th>
                       <th>Obrigatório</th>
                       <th>Descrição</th>
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

/**
 * [NOVO] Constrói a visualização para arquivos MANIFEST.MF, tratando continuação de linha.
 */
function buildManifestView(textContent) {
  const lines = textContent.split(/\r?\n/);
  const properties = {};
  let lastKey = "";

  lines.forEach((line) => {
    if (line.startsWith(" ")) {
      // Linha de continuação
      if (lastKey && properties[lastKey]) {
        properties[lastKey] += line.substring(1);
      }
    } else {
      // Nova linha de chave-valor
      const separatorIndex = line.indexOf(":");
      if (separatorIndex > 0) {
        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();
        properties[key] = value;
        lastKey = key;
      }
    }
  });

  let table = `<h3>Metadados do Manifesto</h3>
                 <table class="metadata-table">
                   <thead>
                     <tr><th>Chave</th><th>Valor</th></tr>
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

/**
 * [NOVO] Constrói a visualização para arquivos .project, destacando nome e natures.
 */
function buildProjectView(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

  const projectName =
    xmlDoc.querySelector("name")?.textContent || "Nome não encontrado";
  const comment = xmlDoc.querySelector("comment")?.textContent || "";
  const natures = Array.from(xmlDoc.querySelectorAll("nature")).map(
    (n) => n.textContent
  );

  let html = `<h3>Detalhes do Projeto</h3>
                <p><strong>Nome do Projeto:</strong> ${escapeHtml(
                  projectName
                )}</p>`;

  if (comment) {
    html += `<p><strong>Comentário:</strong> ${escapeHtml(comment)}</p>`;
  }

  if (natures.length > 0) {
    html += `<h4>Naturezas do Projeto</h4>
                 <ul class="script-list">`;
    natures.forEach((nature) => {
      html += `<li class="script-item">${escapeHtml(nature)}</li>`;
    });
    html += "</ul>";
  }

  return html;
}

/**
 * [NOVO] Constrói a visualização para arquivos .prop, com parser especial para Timers.
 */
function buildPropView(propContent, allFiles) {
  const paramTypes = {};

  // Função auxiliar para parsear o .propdef e extrair os tipos dos parâmetros
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

  // 1. Encontra o arquivo .propdef no pacote e extrai os tipos
  const propDefFileName = Object.keys(allFiles).find((f) =>
    f.endsWith(".propdef")
  );
  if (propDefFileName) {
    Object.assign(paramTypes, parsePropDefForTypes(allFiles[propDefFileName]));
  }

  let html = `<h3>Valores dos Parâmetros Configurados</h3>`;
  const lines = propContent
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#") && line.includes("="));

  if (lines.length === 0) {
    return html + "<p>Nenhum parâmetro configurado neste arquivo.</p>";
  }

  // 2. Itera sobre cada parâmetro no arquivo .prop
  lines.forEach((line) => {
    const separatorIndex = line.indexOf("=");
    const key = line.substring(0, separatorIndex).trim();
    const value = line.substring(separatorIndex + 1).trim();

    html += `<div class="result-section">`;
    html += `<h4 class="result-title">Parâmetro: ${escapeHtml(key)}</h4>`;

    // 3. Verifica o tipo do parâmetro e decide como renderizar
    if (paramTypes[key] === "custom:schedule" && value.includes("<row>")) {
      // Renderização especial como tabela para agendamentos
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
                            <tr><td><strong>Tipo de Disparo</strong></td><td>${escapeHtml(
                              timerData.triggerType || "N/A"
                            )}</td></tr>
                            <tr><td><strong>Data Agendada</strong></td><td>${escapeHtml(
                              timerData.yearValue || "????"
                            )}-${escapeHtml(
        timerData.monthValue || "??"
      )}-${escapeHtml(timerData.dayValue || "??")}</td></tr>
                            <tr><td><strong>Hora Agendada</strong></td><td>${escapeHtml(
                              timerData.hourValue || "??"
                            )}:${escapeHtml(
        timerData.minutesValue || "??"
      )}</td></tr>
                            <tr><td><strong>Fuso Horário</strong></td><td>${escapeHtml(
                              timerData.timeZone || "N/A"
                            )}</td></tr>
                            <tr><td><strong>Expressão Cron</strong></td><td><div class="code-block">${escapeHtml(
                              cronExpression
                            )}</div></td></tr>
                        </tbody>
                     </table>`;
    } else {
      // Renderização padrão para todos os outros parâmetros
      html += `<div class="code-block">${escapeHtml(value)}</div>`;
    }

    html += `</div>`;
  });

  return html;
}

/**
 * Constrói uma árvore JSON interativa.
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

  // Se for o nó raiz, retorna a lista completa
  if (name === "JSON") {
    const root = document.createElement("ul");
    root.className = "tree-view";
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

  const srcHierarchy = {},
    dstHierarchy = {},
    mapping = {};
  const nodeMap = new Map();
  const lineMap = new Map(); // Otimização para encontrar linhas rapidamente

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

    // CORREÇÃO CRÍTICA AQUI: Remove a barra inicial para padronizar o path.
    const dstPath = rawDstPath.replace(/^\//, "");

    buildHierarchyForPath(dstHierarchy, dstPath);

    const srcBricksInside = Array.from(
      dstBrick.querySelectorAll('arg > brick[type="Src"]')
    );
    srcBricksInside.forEach((srcBrick) => {
      const rawSrcPath = srcBrick.getAttribute("path");
      if (!rawSrcPath) return;

      // CORREÇÃO CRÍTICA AQUI: Remove a barra inicial também no path de origem.
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

/**
 * Constrói a visualização completa para um ContentPackage, com seções para
 * informações, artefatos e relações.
 */
async function buildContentPackageView(packageData, allFilesContent) {
    const container = document.createElement('div');
    container.className = 'package-view-container';

    // Separa a informação do pacote principal dos artefatos contidos nele
    const packageInfo = packageData.resources.find(r => r.resourceType === 'ContentPackage');
    const artifacts = packageData.resources.filter(r => r.resourceType !== 'ContentPackage');
    const relations = packageData.relations || [];

    // --- Seção 1: Informações do Pacote ---
    if (packageInfo) {
        const infoHeader = document.createElement('h2');
        infoHeader.textContent = 'Informações do Pacote';
        container.appendChild(infoHeader);

        const infoTable = document.createElement('table');
        infoTable.className = 'metadata-table';
        let infoHtml = '<tbody>';
        infoHtml += `<tr><td class="main-key">Nome</td><td>${escapeHtml(packageInfo.displayName)}</td></tr>`;
        infoHtml += `<tr><td class="main-key">Versão</td><td>${escapeHtml(packageInfo.semanticVersion)}</td></tr>`;
        
        if (packageInfo.additionalAttributes?.shortText?.attributeValues[0]) {
            infoHtml += `<tr><td class="main-key">Descrição</td><td>${escapeHtml(packageInfo.additionalAttributes.shortText.attributeValues[0])}</td></tr>`;
        }
        if (packageInfo.additionalAttributes?.Vendor?.attributeValues[0]) {
             infoHtml += `<tr><td class="main-key">Vendor</td><td>${escapeHtml(packageInfo.additionalAttributes.Vendor.attributeValues[0])}</td></tr>`;
        }
        infoHtml += '</tbody>';
        infoTable.innerHTML = infoHtml;
        container.appendChild(infoTable);
    }

    // --- Seção 2: Artefatos no Pacote ---
    if (artifacts.length > 0) {
        const artifactsHeader = document.createElement('h2');
        artifactsHeader.textContent = 'Artefatos no Pacote';
        container.appendChild(artifactsHeader);
        
        const artifactsTableHtml = buildResourcesTable({ resources: artifacts });
        const artifactsDiv = document.createElement('div');
        artifactsDiv.innerHTML = artifactsTableHtml;
        const artifactsTable = artifactsDiv.querySelector('table');
        if(artifactsTable) {
            enableResourceTableInteraction(artifactsTable, artifacts, (resource) => {
                console.log("Artefato selecionado:", resource.displayName);
                alert(`Artefato selecionado: ${resource.displayName}`);
            });
            container.appendChild(artifactsTable);
        }
    }

    // --- Seção 3: Relações entre Artefatos ---
    if (relations.length > 0) {
        const relationsHeader = document.createElement('h2');
        relationsHeader.textContent = 'Relações entre Artefatos';
        container.appendChild(relationsHeader);
        container.appendChild(buildRelationsTable(relations, packageData.resources));
    }

    // --- Seção 4: Endpoints de Integração (iFlows) ---
    const iFlows = artifacts.filter(a => a.resourceType === 'IFlow' && allFilesContent[a.name]);
    
    if (iFlows.length > 0) {
        const endpointsHeader = document.createElement('h2');
        endpointsHeader.textContent = 'Endpoints de Integração (iFlows)';
        container.appendChild(endpointsHeader);

        const endpointsTable = document.createElement('table');
        endpointsTable.className = 'metadata-table endpoints-table';
        let html = '<thead><tr><th>iFlow</th><th>Participante</th><th>Tipo (Role)</th><th>Protocolo/Adaptador</th></tr></thead><tbody>';
        
        // Processa cada iFlow de forma assíncrona
        for (const iflow of iFlows) {
            const iflowContent = allFilesContent[iflow.name];
            const endpoints = await extractIFlowEndpoints(iflowContent);
            
            if (endpoints.length > 0) {
                endpoints.forEach((endpoint, index) => {
                    html += `<tr>
                        ${index === 0 ? `<td rowspan="${endpoints.length}">${escapeHtml(iflow.displayName)}</td>` : ''}
                        <td>${escapeHtml(endpoint.name)}</td>
                        <td>${escapeHtml(endpoint.role)}</td>
                        <td>${escapeHtml(endpoint.protocol)}</td>
                    </tr>`;
                });
            } else {
                 html += `<tr><td>${escapeHtml(iflow.displayName)}</td><td colspan="3"><i>Nenhum participante encontrado ou erro de parse.</i></td></tr>`;
            }
        }
        
        html += '</tbody>';
        endpointsTable.innerHTML = html;
        container.appendChild(endpointsTable);
    }

    return container;
}

/**
 * Constrói uma tabela para exibir as relações entre os artefatos.
 */
function buildRelationsTable(relations, resources) {
  // Cria um mapa para busca rápida do nome do artefato pelo seu ID
  const resourceMap = new Map(resources.map((r) => [r.id, r.displayName]));

  const table = document.createElement("table");
  table.className = "metadata-table relations-table";
  let html =
    "<thead><tr><th>Origem</th><th>Destino</th><th>Tipo de Relação</th></tr></thead><tbody>";

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

/**
 * Usa o bpmn-js em modo "headless" para extrair os participantes de um iFlow.
 * @param {string} iflowXml - O conteúdo XML do arquivo .iflw.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de objetos de endpoint.
 */
async function extractIFlowEndpoints(iflowXml) {
  // Usa o BpmnJS do script que você adicionou no HTML
  const BpmnJS = window.BpmnJS;
  if (!BpmnJS) {
    console.error(
      "Biblioteca bpmn-js não encontrada. Adicione o script ao seu HTML."
    );
    return [];
  }

  // Cria uma instância "headless" do viewer, sem um container visual
  const bpmnViewer = new BpmnJS();

  try {
    await bpmnViewer.importXML(iflowXml);
    const elementRegistry = bpmnViewer.get("elementRegistry");
    const participants = [];

    // Filtra todos os elementos do tipo 'Participante'
    const participantElements = elementRegistry.filter(
      (el) => el.type === "bpmn:Participant"
    );

    participantElements.forEach((p) => {
      const endpoint = {
        name: p.businessObject.name || p.id,
        role: "Desconhecido",
        protocol: "N/A",
      };

      // Heurística para determinar o papel (Sender/Receiver)
      // Se o participante tem uma conexão de saída (MessageFlow)
      if (p.outgoing.length > 0) {
        endpoint.role = "Receiver"; // Ele recebe uma mensagem do processo
      }
      // Se o participante tem uma conexão de entrada
      if (p.incoming.length > 0) {
        endpoint.role = "Sender"; // Ele envia uma mensagem para o processo
      }

      // Heurística para determinar o protocolo pelo tipo de adaptador
      // A lógica exata pode variar dependendo da complexidade do seu iFlow
      const flowTarget = p.outgoing[0]?.target || p.incoming[0]?.source;
      if (flowTarget && flowTarget.businessObject) {
        const bo = flowTarget.businessObject;
        // O tipo de adaptador geralmente está em 'extensionElements'
        if (bo.extensionElements?.values) {
          for (const ext of bo.extensionElements.values) {
            if (ext.adapterType) {
              endpoint.protocol = ext.adapterType;
              break;
            }
          }
        }
        // Fallback para o tipo de evento/tarefa se não encontrar o adaptador
        if (endpoint.protocol === "N/A") {
          if (bo.$type.includes("StartEvent")) endpoint.protocol = "Start";
          if (bo.$type.includes("EndEvent")) endpoint.protocol = "End";
          if (bo.$type.includes("ServiceTask"))
            endpoint.protocol = "Service Task";
        }
      }

      participants.push(endpoint);
    });

    return participants;
  } catch (err) {
    console.error("Erro ao parsear BPMN:", err);
    return []; // Retorna array vazio em caso de erro
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
