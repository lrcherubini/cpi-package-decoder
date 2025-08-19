async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  // Início do documento HTML com estilo profissional
  let html = `
    <style>
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: 20px; 
        line-height: 1.6;
        color: #333;
      }
      h1 { 
        color: #2c5282; 
        border-bottom: 3px solid #2c5282; 
        padding-bottom: 10px; 
        margin-bottom: 30px;
      }
      h2 { 
        color: #2d3748; 
        background: #e6f3ff; 
        padding: 15px; 
        border-left: 5px solid #0066cc; 
        margin: 30px 0 20px 0;
      }
      h3 { 
        color: #4a5568; 
        margin: 25px 0 15px 0;
      }
      h4 { 
        color: #2d3748; 
        margin: 20px 0 10px 0;
        padding-left: 10px;
        border-left: 3px solid #cbd5e0;
      }
      .package-summary { 
        background: #f7fafc; 
        padding: 20px; 
        border-radius: 8px; 
        margin: 20px 0;
        border: 1px solid #e2e8f0;
      }
      .artifact-overview { 
        background: #fff; 
        padding: 15px; 
        margin: 15px 0; 
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .artifact-type { 
        display: inline-block; 
        background: #3182ce; 
        color: white; 
        padding: 4px 12px; 
        border-radius: 15px; 
        font-size: 0.85em; 
        font-weight: bold; 
        margin: 5px 5px 5px 0;
      }
      .guideline-report-section {
        background: #f0f8ff;
        padding: 15px;
        border-left: 4px solid #4682b4;
        margin: 15px 0;
      }
      .guideline-item { padding: 5px; border-radius: 3px; margin: 5px 0; }
      .guideline-item.pass { background-color: #e6fffa; border-left: 3px solid #38b2ac; }
      .guideline-item.warn { background-color: #fffbf0; border-left: 3px solid #ed8936; }
      .guideline-item.fail { background-color: #fff5f5; border-left: 3px solid #e53e3e; }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 15px 0;
        background: white;
      }
      th, td { 
        padding: 12px; 
        text-align: left; 
        border: 1px solid #e2e8f0;
      }
      th { 
        background: #f7fafc; 
        font-weight: 600; 
        color: #2d3748;
      }
    </style>
    
    <h1>📋 Documentação de Pacotes SAP Cloud Integration</h1>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  `;

  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = pkg.originalZipName || `Pacote ${idx + 1}`;
    html += `<h2>📦 ${escapeHtml(pkgName)}</h2>`;
    html += await buildArtifactsAnalysis(pkg);
  }

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const blob = htmlDocx.asBlob(fullHtml);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SAP_CPI_Documentation_${new Date().toISOString().slice(0,10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function buildArtifactsAnalysis(pkg) {
  let html = `<h3>🔧 Análise Detalhada dos Artefatos</h3>`;
  if (!pkg.resourcesCntDecoded) return html;

  try {
    const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
    for (const resource of (pkgInfo.resources || [])) {
        if (resource.resourceType !== 'ContentPackage') {
            html += await buildArtifactDetails(resource, pkg);
        }
    }
  } catch (err) {
    console.error("Error generating artifacts analysis", err);
  }
  return html;
}

async function buildArtifactDetails(artifact, pkg) {
  const name = artifact.displayName || artifact.name || artifact.id;
  let html = `<div class="artifact-overview">`;
  html += `<h4>${getArtifactTypeIcon(artifact.resourceType)} ${escapeHtml(name)}</h4>`;
  
  html += `<div><span class="artifact-type">${escapeHtml(artifact.resourceType)}</span></div>`;
  
  if (artifact.resourceType === 'IntegrationFlow') {
    html += await analyzeIntegrationFlow(artifact, pkg);
  }
  
  html += `</div>`;
  return html;
}

async function analyzeIntegrationFlow(artifact, pkg) {
  let html = "";
  const report = pkg.guidelineReports ? pkg.guidelineReports[artifact.id] : null;

  if (report) {
    html += `<div class="guideline-report-section">`;
    html += `<strong>🚦 Relatório de Guidelines</strong><br>`;
    html += `<p>Passaram: ${report.summary.pass} | Avisos: ${report.summary.warn} | Falhas: ${report.summary.fail}</p>`;
    
    report.results.forEach(res => {
        html += `<div class="guideline-item ${res.result}">
            <strong>${escapeHtml(res.name)}:</strong> ${escapeHtml(res.message)}
        </div>`;
    });
    html += `</div>`;
  }
  return html;
}

// Helper functions (getArtifactTypeIcon can be simplified or expanded)
function getArtifactTypeIcon(type) {
  const icons = { 'IntegrationFlow': '🔄', 'ScriptCollection': '📜', 'MessageMapping': '🗺️' };
  return icons[type] || '📄';
}

async function buildPackageSummary(pkg, pkgName) {
  let html = `<div class="package-summary">`;
  
  // Analisa o conteúdo do pacote para criar um resumo executivo
  const artifactCount = await getArtifactCount(pkg);
  const integrationFlowCount = artifactCount.iflows || 0;
  const scriptCount = artifactCount.scripts || 0;
  const configCount = artifactCount.configs || 0;
  
  html += `
    <h3>📊 Resumo Executivo</h3>
    <p><strong>Nome do Pacote:</strong> ${escapeHtml(pkgName)}</p>
    <p><strong>Finalidade:</strong> Este pacote contém ${integrationFlowCount} fluxo(s) de integração, 
    ${scriptCount} script(s) customizado(s) e ${configCount} arquivo(s) de configuração.</p>
    
    <table>
      <tr><th>Tipo de Componente</th><th>Quantidade</th><th>Descrição</th></tr>
      <tr>
        <td><strong>Integration Flows (iFlows)</strong></td>
        <td>${integrationFlowCount}</td>
        <td>Fluxos principais que definem como os dados são processados e roteados</td>
      </tr>
      <tr>
        <td><strong>Scripts Personalizados</strong></td>
        <td>${scriptCount}</td>
        <td>Códigos customizados para transformações e lógicas específicas</td>
      </tr>
      <tr>
        <td><strong>Configurações</strong></td>
        <td>${configCount}</td>
        <td>Parâmetros, mapeamentos e definições técnicas</td>
      </tr>
    </table>
  </div>`;
  
  return html;
}

function buildMetadataSection(pkg) {
  let html = '';
  const metadataContent = pkg.fileContents["contentmetadata.md"];
  
  if (metadataContent) {
    try {
      const decoded = atob(metadataContent.trim());
      html += `
        <h3>📝 Informações Técnicas do Pacote</h3>
        <div class="technical-info">
          <strong>Detalhes técnicos extraídos do pacote:</strong>
          <div class="code-snippet">${escapeHtml(decoded)}</div>
        </div>
      `;
    } catch (e) {
      console.error("Error decoding content metadata", e);
    }
  }
  
  return html;
}

async function buildArtifactsAnalysis(pkg) {
  let html = `<h3>🔧 Análise Detalhada dos Artefatos</h3>`;
  
  if (!pkg.resourcesCntDecoded) {
    return html + `<p><em>Não foi possível analisar os artefatos deste pacote.</em></p>`;
  }

  try {
    const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
    const resources = pkgInfo.resources || [];
    
    if (resources.length === 0) {
      return html + `<p><em>Nenhum artefato encontrado neste pacote.</em></p>`;
    }

    // Agrupa artefatos por tipo para melhor organização
    const artifactsByType = groupArtifactsByType(resources);
    
    // Processa cada tipo de artefato
    for (const [type, artifacts] of Object.entries(artifactsByType)) {
      html += await buildArtifactTypeSection(type, artifacts, pkg);
    }
    
  } catch (err) {
    console.error("Error generating artifacts analysis", err);
    html += `<p class="error">❌ Erro ao analisar os artefatos: ${err.message}</p>`;
  }
  
  return html;
}

function groupArtifactsByType(resources) {
  const groups = {
    'IntegrationFlow': [],
    'ScriptCollection': [],
    'MessageMapping': [],
    'ContentPackage': [],
    'Other': []
  };
  
  resources.forEach(resource => {
    const type = resource.resourceType || 'Other';
    if (groups[type]) {
      groups[type].push(resource);
    } else {
      groups['Other'].push(resource);
    }
  });
  
  // Remove grupos vazios
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

async function buildArtifactTypeSection(type, artifacts, pkg) {
  let html = `<h4>${getArtifactTypeIcon(type)} ${getArtifactTypeTitle(type)} (${artifacts.length})</h4>`;
  html += `<p>${getArtifactTypeDescription(type)}</p>`;
  
  for (const artifact of artifacts) {
    html += await buildArtifactDetails(artifact, pkg, type);
  }
  
  return html;
}

function getArtifactTypeIcon(type) {
  const icons = {
    'IntegrationFlow': '🔄',
    'ScriptCollection': '📜',
    'MessageMapping': '🗺️',
    'ContentPackage': '📦',
    'Other': '📄'
  };
  return icons[type] || '📄';
}

function getArtifactTypeTitle(type) {
  const titles = {
    'IntegrationFlow': 'Fluxos de Integração',
    'ScriptCollection': 'Coleções de Scripts',
    'MessageMapping': 'Mapeamentos de Mensagem',
    'ContentPackage': 'Informações do Pacote',
    'Other': 'Outros Artefatos'
  };
  return titles[type] || type;
}

function getArtifactTypeDescription(type) {
  const descriptions = {
    'IntegrationFlow': 'Estes são os fluxos principais que definem como os dados são recebidos, processados e enviados para os sistemas de destino. Cada fluxo representa um processo de integração completo.',
    'ScriptCollection': 'Conjuntos de scripts personalizados (códigos) que implementam lógicas específicas de negócio, transformações de dados ou validações customizadas.',
    'MessageMapping': 'Configurações que definem como converter dados de um formato para outro, essencial para compatibilidade entre diferentes sistemas.',
    'ContentPackage': 'Metadados e informações gerais sobre todo o pacote de integração.',
    'Other': 'Outros componentes e configurações auxiliares do pacote de integração.'
  };
  return descriptions[type] || 'Artefatos diversos do pacote de integração.';
}

async function buildArtifactDetails(artifact, pkg, type) {
  const name = artifact.displayName || artifact.name || artifact.id;
  let html = `<div class="artifact-overview">`;
  html += `<h5>📋 ${escapeHtml(name)}</h5>`;
  
  // Informações básicas do artefato
  html += `
    <div style="margin-bottom: 15px;">
      <span class="artifact-type">${escapeHtml(artifact.resourceType || 'N/A')}</span>
      ${artifact.semanticVersion ? `<span class="artifact-type" style="background: #805ad5;">Versão ${escapeHtml(artifact.semanticVersion)}</span>` : ''}
      ${artifact.modifiedBy ? `<span class="artifact-type" style="background: #38b2ac;">Por ${escapeHtml(artifact.modifiedBy)}</span>` : ''}
    </div>
  `;
  
  // Adiciona descrição se disponível
  if (artifact.additionalAttributes?.shortText?.attributeValues?.[0]) {
    html += `<p><strong>Descrição:</strong> ${escapeHtml(artifact.additionalAttributes.shortText.attributeValues[0])}</p>`;
  }
  
  // Análise específica por tipo
  if (type === 'IntegrationFlow') {
    html += await analyzeIntegrationFlow(artifact, pkg);
  } else if (type === 'ScriptCollection') {
    html += await analyzeScriptCollection(artifact, pkg);
  }
  
  // Detalhes técnicos
  html += buildTechnicalDetails(artifact);
  
  html += `</div>`;
  return html;
}

async function analyzeIntegrationFlow(artifact, pkg) {
  let html = `<div class="flow-description">`;
  html += `<strong>💡 O que este fluxo faz:</strong><br>`;
  
  // Tenta extrair informações do conteúdo do iFlow
  const contentFileName = artifact.id + "_content";
  const content = pkg.fileContents[contentFileName];
  
  if (content) {
    try {
      // Analisa endpoints e participantes
      const endpoints = await extractIFlowEndpoints(content);
      
      if (endpoints.length > 0) {
        html += `Este fluxo de integração conecta ${endpoints.length} sistema(s) ou serviço(s):<br>`;
        html += `<ul>`;
        endpoints.forEach(endpoint => {
          html += `<li><strong>${escapeHtml(endpoint.name)}</strong> - ${escapeHtml(endpoint.role)} via ${escapeHtml(endpoint.protocol)}`;
          if (endpoint.address && endpoint.address !== 'N/A') {
            html += ` (${escapeHtml(endpoint.address)})`;
          }
          html += `</li>`;
        });
        html += `</ul>`;
      } else {
        html += `Este é um fluxo de integração que processa dados entre sistemas. Os detalhes específicos de conectividade precisam ser verificados no ambiente CPI.`;
      }
      
      // Analisa parâmetros se existirem
      const parameterInfo = await analyzeFlowParameters(content);
      if (parameterInfo) {
        html += parameterInfo;
      }
      
    } catch (e) {
      html += `Este fluxo de integração processa e roteia dados entre sistemas. Para detalhes específicos de conectividade e configuração, consulte o ambiente SAP CPI.`;
    }
  } else {
    html += `Este é um fluxo de integração que não pôde ser analisado automaticamente.`;
  }
  
  html += `</div>`;
  return html;
}

async function analyzeScriptCollection(artifact, pkg) {
  let html = `<div class="flow-description">`;
  html += `<strong>💻 Scripts personalizados incluídos:</strong><br>`;
  
  const contentFileName = artifact.id + "_content";
  const content = pkg.fileContents[contentFileName];
  
  if (content) {
    try {
      const zip = await JSZip.loadAsync(content);
      const scripts = [];
      
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const ext = relativePath.split('.').pop().toLowerCase();
          const type = ext === 'groovy' ? 'Groovy' : 
                      ext === 'js' ? 'JavaScript' : 
                      ext === 'java' ? 'Java' : 'Script';
          scripts.push({ name: relativePath, type: type });
        }
      });
      
      if (scripts.length > 0) {
        html += `Esta coleção contém ${scripts.length} script(s) personalizado(s):<br>`;
        html += `<ul>`;
        scripts.forEach(script => {
          html += `<li><strong>${escapeHtml(script.name)}</strong> (${escapeHtml(script.type)})</li>`;
        });
        html += `</ul>`;
        html += `<p><em>Estes scripts implementam lógicas de negócio específicas, transformações de dados ou validações customizadas necessárias para o processo de integração.</em></p>`;
      }
      
    } catch (e) {
      html += `Esta coleção contém scripts personalizados que implementam lógicas específicas do processo de integração.`;
    }
  }
  
  html += `</div>`;
  return html;
}

async function analyzeFlowParameters(content) {
  try {
    const zip = await JSZip.loadAsync(content);
    const propDefFile = Object.values(zip.files).find(f => f.name.endsWith('.propdef'));
    const propFile = Object.values(zip.files).find(f => f.name.endsWith('.prop'));
    
    if (propDefFile || propFile) {
      let html = `<div class="parameter-section">`;
      html += `<strong>⚙️ Parâmetros configuráveis:</strong><br>`;
      
      if (propDefFile) {
        const propDefContent = await propDefFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(propDefContent, 'text/xml');
        const parameters = xmlDoc.querySelectorAll('parameter');
        
        if (parameters.length > 0) {
          html += `Este fluxo possui ${parameters.length} parâmetro(s) configurável(is):<br>`;
          html += `<ul>`;
          parameters.forEach(param => {
            const name = param.querySelector('name')?.textContent || 'N/A';
            const type = param.querySelector('type')?.textContent || 'N/A';
            const description = param.querySelector('description')?.textContent || 'Sem descrição';
            html += `<li><strong>${escapeHtml(name)}</strong> (${escapeHtml(type)}) - ${escapeHtml(description)}</li>`;
          });
          html += `</ul>`;
        }
      }
      
      if (propFile) {
        html += `<em>Os valores padrão destes parâmetros estão definidos no arquivo de configuração do fluxo.</em>`;
      }
      
      html += `</div>`;
      return html;
    }
  } catch (e) {
    // Ignora erros na análise de parâmetros
  }
  return '';
}

function buildTechnicalDetails(artifact) {
  let html = `<div class="technical-info">`;
  html += `<strong>🔧 Detalhes Técnicos:</strong><br>`;
  html += `<strong>ID Interno:</strong> ${escapeHtml(artifact.id)}<br>`;
  
  if (artifact.modifiedAt) {
    const date = new Date(artifact.modifiedAt).toLocaleDateString('pt-BR');
    html += `<strong>Última Modificação:</strong> ${date}<br>`;
  }
  
  if (artifact.contentType) {
    html += `<strong>Tipo de Conteúdo:</strong> ${escapeHtml(artifact.contentType)}<br>`;
  }
  
  // Adiciona informações adicionais se disponíveis
  if (artifact.additionalAttributes) {
    for (const [key, value] of Object.entries(artifact.additionalAttributes)) {
      if (key !== 'shortText' && value.attributeValues && value.attributeValues[0]) {
        const friendlyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        html += `<strong>${escapeHtml(friendlyKey)}:</strong> ${escapeHtml(value.attributeValues[0])}<br>`;
      }
    }
  }
  
  html += `</div>`;
  return html;
}

async function getArtifactCount(pkg) {
  if (!pkg.resourcesCntDecoded) return {};
  
  try {
    const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
    const resources = pkgInfo.resources || [];
    
    return {
      iflows: resources.filter(r => r.resourceType === 'IntegrationFlow').length,
      scripts: resources.filter(r => r.resourceType === 'ScriptCollection').length,
      configs: resources.filter(r => !['IntegrationFlow', 'ScriptCollection', 'ContentPackage'].includes(r.resourceType)).length
    };
  } catch (e) {
    return {};
  }
}

function buildDocumentFooter() {
  return `
    <hr style="margin: 40px 0 20px 0; border: none; border-top: 2px solid #e2e8f0;">
    <div style="text-align: center; color: #718096; font-size: 0.9em;">
      <p><strong>📄 Documento gerado automaticamente pelo SAP CPI Package Decoder</strong></p>
      <p>Este documento fornece uma visão técnica dos pacotes de integração exportados do SAP Cloud Platform Integration.</p>
      <p>Para dúvidas sobre implementação ou configuração específica, consulte a documentação técnica detalhada ou a equipe de desenvolvimento.</p>
      <p><em>Gerado em: ${new Date().toLocaleString('pt-BR')}</em></p>
    </div>
  `;
}