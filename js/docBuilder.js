/**
 * buildDocumentation
 *
 * Orquestra a geração da documentação completa, incluindo arquivos DOCX para cada pacote
 * e imagens PNG para cada iFlow, compactando tudo em um único arquivo ZIP para download.
 */
async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  const mainZip = new JSZip();

  // Itera sobre cada pacote carregado
  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = (pkg.originalZipName || `Package_${idx + 1}`).replace(
      /\.zip$/i,
      ""
    );
    const packageFolder = mainZip.folder(pkgName);
    const diagramsFolder = packageFolder.folder("diagrams");

    // 1. Gera o arquivo DOCX (sem diagramas) para o pacote
    const docxHtml = await generatePackageDocumentationHtml(pkg, false); // 'false' para não incluir diagramas
    const docxBlob = htmlDocx.asBlob(docxHtml);
    packageFolder.file(`${pkgName}_Documentation.docx`, docxBlob);

    // 2. Encontra e gera imagens PNG para todos os iFlows do pacote
    try {
      const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
      const iFlows = (pkgInfo.resources || []).filter(
        (r) => r.resourceType === "IFlow"
      );

      for (const iFlow of iFlows) {
        const contentFileName = iFlow.id + "_content";
        const content = pkg.fileContents[contentFileName];
        if (content) {
          const pngBlob = await generateBpmnImage(content, "blob"); // 'blob' para gerar arquivo de imagem
          if (pngBlob) {
            const iFlowName = (
              iFlow.displayName ||
              iFlow.name ||
              iFlow.id
            ).replace(/[\s/\\?%*:|"<>]/g, "_");
            diagramsFolder.file(`${iFlowName}.png`, pngBlob);
          }
        }
      }
    } catch (e) {
      console.error(`Error processing iFlows for package ${pkgName}:`, e);
    }
  }

  // 3. Gera o arquivo ZIP final e inicia o download
  mainZip.generateAsync({ type: "blob" }).then((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SAP_CPI_Documentation_${new Date()
      .toISOString()
      .slice(0, 19)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

/**
 * generatePackageDocumentationHtml
 *
 * Gera o conteúdo HTML completo para a documentação de um único pacote.
 * @param {object} pkg - O objeto de dados do pacote.
 * @param {boolean} includeDiagrams - Se deve incluir as imagens dos diagramas no HTML.
 * @returns {string} - O HTML completo como string.
 */
async function generatePackageDocumentationHtml(pkg, includeDiagrams = false) {
  const docContainer = document.createElement("div");

  const style = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { color: #2d3748; background: #e6f3ff; padding: 15px; border-left: 5px solid #0066cc; margin: 30px 0 20px 0; }
    h3 { color: #4a5568; margin: 25px 0 15px 0; }
    h4 { color: #2d3748; margin: 20px 0 10px 0; padding-left: 10px; border-left: 3px solid #cbd5e0; }
    h5 { color: #4a5568; margin-top: 20px; margin-bottom: 10px; font-size: 12pt; }
    h6 { color: #2d3748; margin-top: 15px; margin-bottom: 5px; font-size: 12pt; }
    .package-summary { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .artifact-overview { background: #fff; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
    .artifact-type { display: inline-block; background: #3182ce; color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.85em; font-weight: bold; margin: 5px 5px 5px 0; }
    .guideline-report-section { background: #f0f8ff; padding: 15px; border-left: 4px solid #4682b4; margin: 15px 0; }
    .bpmn-diagram-container { margin-top: 20px; border: 1px solid #ddd; padding: 10px; text-align: center; }
    .bpmn-diagram-container img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
    th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; color: #2d3748; }
  `;

  const pkgName = pkg.originalZipName || `Pacote`;
  const headerHtml = `
    <h1>📋 Documentação de Pacote SAP Cloud Integration</h1>
    <h2>📦 ${escapeHtml(pkgName)}</h2>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
  `;

  docContainer.innerHTML = headerHtml;

  const analysisContainer = await buildArtifactsAnalysis(pkg, includeDiagrams);
  docContainer.appendChild(analysisContainer);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${docContainer.innerHTML}</body></html>`;
}

/**
 * buildArtifactsAnalysis
 *
 * Constrói a seção de análise de artefatos para a documentação.
 */
async function buildArtifactsAnalysis(pkg, includeDiagrams) {
  const container = document.createElement("div");
  container.innerHTML = "<h3>🔧 Análise Detalhada dos Artefatos</h3>";

  try {
    const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
    const resources = pkgInfo.resources || [];
    if (resources.length === 0) {
      container.innerHTML += `<p><em>Nenhum artefato encontrado.</em></p>`;
      return container;
    }

    const artifactsByType = groupArtifactsByType(resources);
    for (const [type, artifacts] of Object.entries(artifactsByType)) {
      const section = await buildArtifactTypeSection(type, artifacts, pkg, includeDiagrams);
      container.appendChild(section);
    }
  } catch (err) {
    console.error("Error generating artifacts analysis", err);
    container.innerHTML += `<p class="error">❌ Erro ao analisar: ${err.message}</p>`;
  }
  return container;
}

/**
 * groupArtifactsByType
 *
 * Agrupa os recursos de um pacote por seu tipo.
 */
function groupArtifactsByType(resources) {
  return resources.reduce((groups, resource) => {
    const type = resource.resourceType || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(resource);
    return groups;
  }, {});
}

/**
 * buildArtifactTypeSection
 *
 * Constrói uma seção HTML para um tipo específico de artefato.
 */
async function buildArtifactTypeSection(type, artifacts, pkg, includeDiagrams) {
  const section = document.createElement("div");
  section.innerHTML = `
    <h4>${getArtifactTypeIcon(type)} ${getArtifactTypeTitle(type)} (${artifacts.length})</h4>
    <p>${getArtifactTypeDescription(type)}</p>
  `;

  for (const artifact of artifacts) {
    const details = await buildArtifactDetails(artifact, pkg, type, includeDiagrams);
    section.appendChild(details);
  }
  return section;
}

function getArtifactTypeIcon(type) { return ({ IFlow: "🔄", ScriptCollection: "📜", MessageMapping: "🗺️", ContentPackage: "📦" }[type] || "📄"); }
function getArtifactTypeTitle(type) { return ({ IFlow: "Fluxos de Integração", ScriptCollection: "Coleções de Scripts", MessageMapping: "Mapeamentos de Mensagem", ContentPackage: "Informações do Pacote" }[type] || type); }
function getArtifactTypeDescription(type) { return ({ IFlow: "Fluxos principais que definem como os dados são processados e enviados.", ScriptCollection: "Conjuntos de scripts que implementam lógicas customizadas.", MessageMapping: "Configurações para converter dados de um formato para outro.", ContentPackage: "Metadados e informações gerais sobre o pacote." }[type] || "Artefatos diversos."); }

/**
 * buildArtifactDetails
 *
 * Constrói o HTML detalhado para um único artefato.
 */
async function buildArtifactDetails(artifact, pkg, type, includeDiagrams) {
  const name = artifact.displayName || artifact.name || artifact.id;
  const container = document.createElement("div");
  container.className = "artifact-overview";

  let detailsHtml = `<h5>📋 ${escapeHtml(name)}</h5>
    <div style="margin-bottom: 15px;">
      <span class="artifact-type">${escapeHtml(artifact.resourceType || "N/A")}</span>
      ${artifact.semanticVersion ? `<span class="artifact-type" style="background: #805ad5;">Versão ${escapeHtml(artifact.semanticVersion)}</span>` : ""}
      ${artifact.modifiedBy ? `<span class="artifact-type" style="background: #38b2ac;">Por ${escapeHtml(artifact.modifiedBy)}</span>` : ""}
    </div>`;

  if (artifact.additionalAttributes?.shortText?.attributeValues?.[0]) {
    detailsHtml += `<p><strong>Descrição:</strong> ${escapeHtml(artifact.additionalAttributes.shortText.attributeValues[0])}</p>`;
  }
  container.innerHTML = detailsHtml;

  if (type === "IFlow") {
    const flowAnalysis = await analyzeIntegrationFlow(artifact, pkg, includeDiagrams);
    container.appendChild(flowAnalysis);
    
    // CORREÇÃO: Adiciona a análise de guidelines que estava faltando
    const guidelineReport = pkg.guidelineReports[artifact.id];
    if (guidelineReport) {
        container.appendChild(buildGuidelineReportHtml(guidelineReport));
    }

  } else if (type === "ScriptCollection") {
    const scriptAnalysis = await analyzeScriptCollection(artifact, pkg);
    container.appendChild(scriptAnalysis);
  }

  container.appendChild(buildTechnicalDetails(artifact));
  return container;
}

/**
 * analyzeIntegrationFlow
 *
 * Analisa um artefato iFlow para extrair endpoints, parâmetros e o diagrama.
 */
async function analyzeIntegrationFlow(artifact, pkg, includeDiagrams) {
  const container = document.createElement("div");
  const content = pkg.fileContents[artifact.id + "_content"];

  if (!content) {
    container.innerHTML += "<p>Conteúdo do iFlow não encontrado.</p>";
    return container;
  }

  try {
    const zip = await JSZip.loadAsync(content);
    const propFile = Object.values(zip.files).find((f) => f.name.endsWith(".prop"));
    let properties = {};
    if (propFile) {
        const propContent = await propFile.async("string");
        propContent.split(/\r?\n/).forEach(line => {
            if (line.trim() && !line.trim().startsWith("#")) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex !== -1) {
                    const key = line.substring(0, separatorIndex).trim();
                    const value = line.substring(separatorIndex + 1).trim();
                    properties[key] = value;
                }
            }
        });
    }

    const endpoints = await extractIFlowEndpoints(content);
    if (endpoints.length > 0) {
      let adaptersHtml = `<h6>🔌 Adaptadores Utilizados</h6>
                          <table>
                            <thead>
                              <tr>
                                <th>Participante</th>
                                <th>Tipo (Role)</th>
                                <th>Protocolo/Adaptador</th>
                                <th>Endereço</th>
                              </tr>
                            </thead>
                            <tbody>`;
      endpoints.forEach((ep) => {
        adaptersHtml += `<tr>
                          <td>${escapeHtml(ep.name)}</td>
                          <td>${escapeHtml(ep.role)}</td>
                          <td>${escapeHtml(ep.protocol)}</td>
                          <td>${escapeHtml(ep.address)}</td>
                        </tr>`;
      });
      adaptersHtml += "</tbody></table>";
      container.innerHTML += adaptersHtml;
    }

    const parameterInfo = await analyzeFlowParameters(content, properties);
    if (parameterInfo) container.appendChild(parameterInfo);

    if (includeDiagrams) {
      const bpmnImage = await generateBpmnImage(content, "dataUrl");
      if (bpmnImage) {
        const imgContainer = document.createElement("div");
        imgContainer.className = "bpmn-diagram-container";
        imgContainer.innerHTML = `<h6>Diagrama do Fluxo</h6><img src="${escapeHtml(bpmnImage)}" alt="Diagrama de ${escapeHtml(artifact.displayName)}">`;
        container.appendChild(imgContainer);
      }
    }
  } catch (e) {
    console.error("Error analyzing iFlow", e);
    container.innerHTML += "<p>Erro ao analisar detalhes do iFlow.</p>";
  }
  return container;
}

/**
 * analyzeScriptCollection
 *
 * Analisa uma coleção de scripts e lista os arquivos contidos.
 */
async function analyzeScriptCollection(artifact, pkg) {
  const container = document.createElement("div");
  const content = pkg.fileContents[artifact.id + "_content"];

  if (content) {
    try {
      const zip = await JSZip.loadAsync(content);
      const scripts = Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name);
      if (scripts.length > 0) {
        container.innerHTML = "<h6>💻 Scripts personalizados incluídos</h6>";
        let listHtml = `<ul>`;
        scripts.forEach((script) => (listHtml += `<li>${escapeHtml(script)}</li>`));
        listHtml += "</ul>";
        container.innerHTML += listHtml;
      }
    } catch (e) {
      container.innerHTML += "<p>Não foi possível ler os scripts da coleção.</p>";
    }
  }
  return container;
}

/**
 * analyzeFlowParameters
 *
 * Analisa e formata os parâmetros externalizados de um iFlow.
 */
async function analyzeFlowParameters(content, properties = {}) {
  try {
    const zip = await JSZip.loadAsync(content);
    const propDefFile = Object.values(zip.files).find((f) => f.name.endsWith(".propdef"));
    if (!propDefFile) return null;

    const propDefContent = await propDefFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(propDefContent, "text/xml");

    const paramMetadata = {};
    const definedParams = [];

    xmlDoc.querySelectorAll("parameter").forEach((param) => {
        const name = param.querySelector("name")?.textContent;
        if (name) {
            definedParams.push(name);
            paramMetadata[name] = {
                type: param.querySelector("type")?.textContent || 'xsd:string',
                label: name,
                category: "Parâmetros Globais"
            };
        }
    });

    xmlDoc.querySelectorAll("param_references > reference").forEach(ref => {
        const key = ref.getAttribute('param_key');
        if (paramMetadata[key]) {
            paramMetadata[key].label = ref.getAttribute('attribute_uilabel') || key;
            paramMetadata[key].category = ref.getAttribute('attribute_category') || "Parâmetros Globais";
        }
    });

    const iflowFile = Object.values(zip.files).find((f) => f.name.endsWith(".iflw"));
    let usedParams = new Set();
    if (iflowFile) {
        const iflowContent = await iflowFile.async("string");
        const matches = iflowContent.match(/\{\{([^{}]+)\}\}/g) || [];
        matches.forEach(match => usedParams.add(match.substring(2, match.length - 2)));
    }
    
    const groupParams = (paramKeys) => {
        return paramKeys.reduce((acc, key) => {
            if (!properties[key]) return acc;
            const meta = paramMetadata[key] || { label: key, category: "Parâmetros Globais", type: 'xsd:string' };
            if (!acc[meta.category]) acc[meta.category] = [];
            acc[meta.category].push({ key, ...meta });
            return acc;
        }, {});
    };
    
    const inUseParams = groupParams(definedParams.filter(p => usedParams.has(p)));
    const orphanParams = groupParams(definedParams.filter(p => !usedParams.has(p)));

    const buildGroupTable = (groupedParams, title) => {
        if (Object.keys(groupedParams).length === 0) return '';
        
        let html = `<h6>${title}</h6>`;
        Object.entries(groupedParams).forEach(([category, params]) => {
            html += `<p><strong>${escapeHtml(category)}</strong></p>
                     <table>
                       <thead><tr><th>Parâmetro</th><th>Valor Configurado</th></tr></thead>
                       <tbody>`;
            params.forEach((param) => {
                const value = properties[param.key];
                let formattedValue = (param.type === 'custom:schedule' && value.includes('<row>'))
                    ? analyzeTimerConfiguration(value)
                    : `<code>${escapeHtml(value)}</code>`;
                html += `<tr><td><strong>${escapeHtml(param.label)}</strong></td><td>${formattedValue}</td></tr>`;
            });
            html += "</tbody></table>";
        });
        return html;
    }

    const container = document.createElement("div");
    container.innerHTML = "<h6>⚙️ Parâmetros Externalizados</h6>";
    container.innerHTML += buildGroupTable(inUseParams, "Parâmetros em Uso");
    container.innerHTML += buildGroupTable(orphanParams, "Parâmetros Órfãos");

    return container;
  } catch (e) {
    console.warn("Could not analyze flow parameters", e);
    return null;
  }
}

/**
 * buildTechnicalDetails
 *
 * Constrói uma seção com detalhes técnicos de um artefato.
 */
function buildTechnicalDetails(artifact) {
  const container = document.createElement("div");
  container.innerHTML = `<h6>🔧 Detalhes Técnicos</h6>
                         <p><strong>ID:</strong> ${escapeHtml(artifact.id)}<br>
                         <strong>Modificado em:</strong> ${new Date(artifact.modifiedAt).toLocaleDateString("pt-BR")}</p>`;
  return container;
}

/**
 * generateBpmnImage
 *
 * Gera uma imagem a partir do XML de um iFlow.
 */
async function generateBpmnImage(iflowContent, outputType = "dataUrl") {
  let iflowXml = "";
  try {
    if (typeof iflowContent === "string") {
      iflowXml = iflowContent;
    } else {
      const zip = await JSZip.loadAsync(iflowContent);
      const xmlFile = Object.values(zip.files).find((f) => !f.dir && (f.name.endsWith(".iflw") || f.name.endsWith(".xml")));
      if (xmlFile) iflowXml = await xmlFile.async("string");
    }

    if (!iflowXml) throw new Error("No BPMN XML found.");

    const tempContainer = document.createElement("div");
    Object.assign(tempContainer.style, { position: "absolute", left: "-9999px", width: "1000px", height: "800px" });
    document.body.appendChild(tempContainer);

    const viewer = new BpmnJS({ container: tempContainer });
    await viewer.importXML(iflowXml);
    viewer.get("canvas").zoom("fit-viewport");

    const { svg } = await viewer.saveSVG();
    viewer.destroy();
    document.body.removeChild(tempContainer);

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        if (outputType === "blob") {
          canvas.toBlob(resolve, "image/png");
        } else {
          resolve(canvas.toDataURL("image/png"));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch (err) {
    console.error("Failed to generate BPMN image:", err);
    return null;
  }
}

/**
 * buildGuidelineReportHtml
 *
 * Constrói a seção de relatório de guidelines para o DOCX
 */
function buildGuidelineReportHtml(report) {
    const container = document.createElement('div');
    container.className = 'guideline-report-section';

    let html = `<h6>✔️ Análise de Guidelines</h6>
                <p><strong>Resultado:</strong> ${report.summary.pass} Aprovados, ${report.summary.warn} Avisos, ${report.summary.fail} Falhas.</p>
                <table>
                  <thead>
                    <tr><th>Verificação</th><th>Resultado</th><th>Mensagem</th></tr>
                  </thead>
                  <tbody>`;
    
    report.results.forEach(res => {
        html += `<tr>
                   <td><strong>${escapeHtml(res.name)}</strong><br><small>${escapeHtml(res.description)}</small></td>
                   <td>${escapeHtml(res.result)}</td>
                   <td>${escapeHtml(res.message)}</td>
                 </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    return container;
}