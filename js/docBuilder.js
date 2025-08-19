async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  const docContainer = document.createElement('div');

  const style = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { color: #2d3748; background: #e6f3ff; padding: 15px; border-left: 5px solid #0066cc; margin: 30px 0 20px 0; }
    h3 { color: #4a5568; margin: 25px 0 15px 0; }
    h4 { color: #2d3748; margin: 20px 0 10px 0; padding-left: 10px; border-left: 3px solid #cbd5e0; }
    .package-summary { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .artifact-overview { background: #fff; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
    .artifact-type { display: inline-block; background: #3182ce; color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.85em; font-weight: bold; margin: 5px 5px 5px 0; }
    .guideline-report-section { background: #f0f8ff; padding: 15px; border-left: 4px solid #4682b4; margin: 15px 0; }
    .guideline-item { padding: 10px; border-radius: 4px; margin: 8px 0; }
    .guideline-item.pass { background-color: #e6fffa; border-left: 4px solid #38b2ac; }
    .guideline-item.warn { background-color: #fffbf0; border-left: 4px solid #ed8936; }
    .guideline-item.fail { background-color: #fff5f5; border-left: 4px solid #e53e3e; }
    .bpmn-diagram-container { margin-top: 20px; border: 1px solid #ddd; padding: 10px; text-align: center; }
    .bpmn-diagram-container img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
    th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; color: #2d3748; }
  `;
  
  const headerHtml = `
    <h1>📋 Documentação de Pacotes SAP Cloud Integration</h1>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  `;

  docContainer.innerHTML = headerHtml;

  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = pkg.originalZipName || `Pacote ${idx + 1}`;
    const pkgHeader = document.createElement('h2');
    pkgHeader.textContent = `📦 ${escapeHtml(pkgName)}`;
    docContainer.appendChild(pkgHeader);
    
    const analysisContainer = await buildArtifactsAnalysis(pkg);
    docContainer.appendChild(analysisContainer);
  }

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${docContainer.innerHTML}</body></html>`;
  const blob = htmlDocx.asBlob(fullHtml);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SAP_CPI_Documentation_${new Date().toISOString().slice(0,10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function buildArtifactsAnalysis(pkg) {
    const container = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = '🔧 Análise Detalhada dos Artefatos';
    container.appendChild(title);

    if (!pkg.resourcesCntDecoded) {
        container.innerHTML += `<p><em>Não foi possível analisar os artefatos deste pacote.</em></p>`;
        return container;
    }

    try {
        const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
        const resources = pkgInfo.resources || [];

        if (resources.length === 0) {
            container.innerHTML += `<p><em>Nenhum artefato encontrado neste pacote.</em></p>`;
            return container;
        }

        const artifactsByType = groupArtifactsByType(resources);

        for (const [type, artifacts] of Object.entries(artifactsByType)) {
            const section = await buildArtifactTypeSection(type, artifacts, pkg);
            container.appendChild(section);
        }

    } catch (err) {
        console.error("Error generating artifacts analysis", err);
        container.innerHTML += `<p class="error">❌ Erro ao analisar os artefatos: ${err.message}</p>`;
    }

    return container;
}

function groupArtifactsByType(resources) {
  const groups = {};
  resources.forEach(resource => {
    const type = resource.resourceType || 'Other';
    if (!groups[type]) {
        groups[type] = [];
    }
    groups[type].push(resource);
  });
  return groups;
}

async function buildArtifactTypeSection(type, artifacts, pkg) {
    const section = document.createElement('div');
    section.innerHTML = `
        <h4>${getArtifactTypeIcon(type)} ${getArtifactTypeTitle(type)} (${artifacts.length})</h4>
        <p>${getArtifactTypeDescription(type)}</p>
    `;
    
    for (const artifact of artifacts) {
        const details = await buildArtifactDetails(artifact, pkg, type);
        section.appendChild(details);
    }
    
    return section;
}

function getArtifactTypeIcon(type) {
  const icons = { 'IFlow': '🔄', 'ScriptCollection': '📜', 'MessageMapping': '🗺️', 'ContentPackage': '📦', 'Other': '📄' };
  return icons[type] || '📄';
}

function getArtifactTypeTitle(type) {
  const titles = { 'IFlow': 'Fluxos de Integração', 'ScriptCollection': 'Coleções de Scripts', 'MessageMapping': 'Mapeamentos de Mensagem', 'ContentPackage': 'Informações do Pacote', 'Other': 'Outros Artefatos' };
  return titles[type] || type;
}

function getArtifactTypeDescription(type) {
    const descriptions = {
        'IFlow': 'Estes são os fluxos principais que definem como os dados são recebidos, processados e enviados para os sistemas de destino. Cada fluxo representa um processo de integração completo.',
        'ScriptCollection': 'Conjuntos de scripts personalizados (códigos) que implementam lógicas específicas de negócio, transformações de dados ou validações customizadas.',
        'MessageMapping': 'Configurações que definem como converter dados de um formato para outro, essencial para compatibilidade entre diferentes sistemas.',
        'ContentPackage': 'Metadados e informações gerais sobre todo o pacote de integração.',
        'Other': 'Outros componentes e configurações auxiliares do pacote de integração.'
    };
    return descriptions[type] || 'Artefatos diversos do pacote de integração.';
}

async function buildArtifactDetails(artifact, pkg, type) {
    const name = artifact.displayName || artifact.name || artifact.id;
    const container = document.createElement('div');
    container.className = 'artifact-overview';
  
    let detailsHtml = `<h5>📋 ${escapeHtml(name)}</h5>
      <div style="margin-bottom: 15px;">
        <span class="artifact-type">${escapeHtml(artifact.resourceType || 'N/A')}</span>
        ${artifact.semanticVersion ? `<span class="artifact-type" style="background: #805ad5;">Versão ${escapeHtml(artifact.semanticVersion)}</span>` : ''}
        ${artifact.modifiedBy ? `<span class="artifact-type" style="background: #38b2ac;">Por ${escapeHtml(artifact.modifiedBy)}</span>` : ''}
      </div>`;
  
    if (artifact.additionalAttributes?.shortText?.attributeValues?.[0]) {
      detailsHtml += `<p><strong>Descrição:</strong> ${escapeHtml(artifact.additionalAttributes.shortText.attributeValues[0])}</p>`;
    }
    
    container.innerHTML = detailsHtml;

    if (type === 'IFlow') {
        const flowAnalysis = await analyzeIntegrationFlow(artifact, pkg);
        container.appendChild(flowAnalysis);
    } else if (type === 'ScriptCollection') {
        const scriptAnalysis = await analyzeScriptCollection(artifact, pkg);
        container.appendChild(scriptAnalysis);
    }
    
    const techDetails = buildTechnicalDetails(artifact);
    container.appendChild(techDetails);
    
    return container;
}
  
async function analyzeIntegrationFlow(artifact, pkg) {
    const container = document.createElement('div');
    container.className = 'flow-description';
    container.innerHTML = '<strong>💡 O que este fluxo faz:</strong><br>';
  
    const contentFileName = artifact.id + "_content";
    const content = pkg.fileContents[contentFileName];
  
    if (content) {
        try {
            const endpoints = await extractIFlowEndpoints(content);
            if (endpoints.length > 0) {
                let listHtml = `Este fluxo de integração conecta ${endpoints.length} sistema(s) ou serviço(s):<ul>`;
                endpoints.forEach(endpoint => {
                    listHtml += `<li><strong>${escapeHtml(endpoint.name)}</strong> - ${escapeHtml(endpoint.role)} via ${escapeHtml(endpoint.protocol)}${endpoint.address && endpoint.address !== 'N/A' ? ` (${escapeHtml(endpoint.address)})` : ''}</li>`;
                });
                listHtml += '</ul>';
                container.innerHTML += listHtml;
            } else {
                container.innerHTML += `<p>Este é um fluxo de integração que processa dados entre sistemas. Os detalhes específicos de conectividade precisam ser verificados no ambiente CPI.</p>`;
            }

            const parameterInfo = await analyzeFlowParameters(content);
            if(parameterInfo) container.appendChild(parameterInfo);

            const bpmnImage = await generateBpmnImage(content);
            if (bpmnImage) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'bpmn-diagram-container';
                imgContainer.innerHTML = `<h4>Diagrama do Fluxo</h4><img src="${bpmnImage}" alt="Diagrama BPMN do iFlow ${escapeHtml(artifact.displayName)}">`;
                container.appendChild(imgContainer);
            }

        } catch (e) {
            container.innerHTML += `<p>Este fluxo de integração processa e roteia dados entre sistemas. Para detalhes específicos de conectividade e configuração, consulte o ambiente SAP CPI.</p>`;
        }
    } else {
      container.innerHTML += `<p>Este é um fluxo de integração que não pôde ser analisado automaticamente.</p>`;
    }
    
    return container;
}
  
async function analyzeScriptCollection(artifact, pkg) {
    const container = document.createElement('div');
    container.className = 'flow-description';
    container.innerHTML = '<strong>💻 Scripts personalizados incluídos:</strong><br>';
  
    const contentFileName = artifact.id + "_content";
    const content = pkg.fileContents[contentFileName];
  
    if (content) {
      try {
        const zip = await JSZip.loadAsync(content);
        const scripts = [];
        
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            const ext = relativePath.split('.').pop().toLowerCase();
            const type = { groovy: 'Groovy', js: 'JavaScript', java: 'Java' }[ext] || 'Script';
            scripts.push({ name: relativePath, type: type });
          }
        });
        
        if (scripts.length > 0) {
          let listHtml = `Esta coleção contém ${scripts.length} script(s) personalizado(s):<ul>`;
          scripts.forEach(script => {
            listHtml += `<li><strong>${escapeHtml(script.name)}</strong> (${escapeHtml(script.type)})</li>`;
          });
          listHtml += '</ul><p><em>Estes scripts implementam lógicas de negócio específicas, transformações de dados ou validações customizadas necessárias para o processo de integração.</em></p>';
          container.innerHTML += listHtml;
        }
        
      } catch (e) {
        container.innerHTML += `<p>Esta coleção contém scripts personalizados que implementam lógicas específicas do processo de integração.</p>`;
      }
    }
    
    return container;
}
  
async function analyzeFlowParameters(content) {
    try {
      const zip = await JSZip.loadAsync(content);
      const propDefFile = Object.values(zip.files).find(f => f.name.endsWith('.propdef'));
      
      if (propDefFile) {
        const container = document.createElement('div');
        container.className = 'parameter-section';
        container.innerHTML = '<strong>⚙️ Parâmetros configuráveis:</strong><br>';
  
        const propDefContent = await propDefFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(propDefContent, 'text/xml');
        const parameters = xmlDoc.querySelectorAll('parameter');
        
        if (parameters.length > 0) {
          let listHtml = `Este fluxo possui ${parameters.length} parâmetro(s) configurável(is):<ul>`;
          parameters.forEach(param => {
            const name = param.querySelector('name')?.textContent || 'N/A';
            const type = param.querySelector('type')?.textContent || 'N/A';
            const description = param.querySelector('description')?.textContent || 'Sem descrição';
            listHtml += `<li><strong>${escapeHtml(name)}</strong> (${escapeHtml(type)}) - ${escapeHtml(description)}</li>`;
          });
          listHtml += '</ul>';
          container.innerHTML += listHtml;
        }
        
        if (Object.values(zip.files).some(f => f.name.endsWith('.prop'))) {
          container.innerHTML += `<em>Os valores padrão destes parâmetros estão definidos no arquivo de configuração do fluxo.</em>`;
        }
        
        return container;
      }
    } catch (e) {
      console.warn("Could not analyze flow parameters", e);
    }
    return null;
}
  
function buildTechnicalDetails(artifact) {
    const container = document.createElement('div');
    container.className = 'technical-info';
    let detailsHtml = `<strong>🔧 Detalhes Técnicos:</strong><br>
                        <strong>ID Interno:</strong> ${escapeHtml(artifact.id)}<br>`;
    
    if (artifact.modifiedAt) {
      detailsHtml += `<strong>Última Modificação:</strong> ${new Date(artifact.modifiedAt).toLocaleDateString('pt-BR')}<br>`;
    }
    
    if (artifact.contentType) {
      detailsHtml += `<strong>Tipo de Conteúdo:</strong> ${escapeHtml(artifact.contentType)}<br>`;
    }
    
    if (artifact.additionalAttributes) {
      for (const [key, value] of Object.entries(artifact.additionalAttributes)) {
        if (key !== 'shortText' && value.attributeValues && value.attributeValues[0]) {
          const friendlyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          detailsHtml += `<strong>${escapeHtml(friendlyKey)}:</strong> ${escapeHtml(value.attributeValues[0])}<br>`;
        }
      }
    }
    
    container.innerHTML = detailsHtml;
    return container;
}

async function generateBpmnImage(iflowContent) {
    let iflowXml = "";
    try {
        if (typeof iflowContent === 'string') {
            iflowXml = iflowContent;
        } else {
            const zip = await JSZip.loadAsync(iflowContent);
            const xmlFile = Object.values(zip.files).find(f => !f.dir && (f.name.endsWith('.iflw') || f.name.endsWith('.xml')));
            if(xmlFile) iflowXml = await xmlFile.async("string");
        }
       
        if (!iflowXml) throw new Error("No BPMN XML found.");

        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', width: '1000px', height: '800px' });
        document.body.appendChild(tempContainer);

        const viewer = new BpmnJS({ container: tempContainer });
        await viewer.importXML(iflowXml);
        viewer.get('canvas').zoom('fit-viewport');
        
        const { svg } = await viewer.saveSVG();
        
        viewer.destroy();
        document.body.removeChild(tempContainer);

        const dataUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

        return dataUrl;
        
    } catch (err) {
        console.error('Failed to generate BPMN image:', err);
        return null;
    }
}