/**
 * docBuilder.js
 *
 * Responsável por gerar a documentação em formato DOCX.
 * Utiliza o analyzer.js para obter os dados dos artefatos e o viewBuilder.js para consistência na formatação.
 */

async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  const mainZip = new JSZip();

  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = (pkg.originalZipName || `Package_${idx + 1}`).replace(
      /\.zip$/i,
      ""
    );
    const packageFolder = mainZip.folder(pkgName);

    const docxHtml = await generatePackageDocumentationHtml(pkg);
    const docxBlob = htmlDocx.asBlob(docxHtml);
    packageFolder.file(`${pkgName}_Documentation.docx`, docxBlob);

    // Lógica para adicionar diagramas ao ZIP, se necessário
  }

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

async function generatePackageDocumentationHtml(pkg) {
  const docContainer = document.createElement("div");

  const style = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
    h1 { font-size: 22pt; color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 8px; margin-bottom: 25px; }
    h2 { font-size: 18pt; color: #2d3748; background: #eef4fb; padding: 12px; border-left: 4px solid #4299e1; margin: 25px 0 15px 0; }
    h3 { font-size: 16pt; color: #2d3748; margin: 20px 0 15px 0; }
    h4 { font-size: 14pt; color: #4a5568; margin: 20px 0 10px 0; padding-left: 8px; border-left: 3px solid #a0aec0; }
    h5 { font-size: 12pt; color: #4a5568; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
    h6 { font-size: 11pt; color: #2d3748; margin-top: 15px; margin-bottom: 5px; font-weight: bold; }
    .artifact-overview { page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    th, td { padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; vertical-align: top; }
    th { background: #f7fafc; font-weight: bold; }
    code { font-family: 'Courier New', Courier, monospace; background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 8.5pt; }
  `;

  docContainer.innerHTML = `
    <h1>📋 Documentação de Pacote SAP Cloud Integration</h1>
    <h2>📦 ${escapeHtml(pkg.originalZipName)}</h2>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
  `;

  const analysisContainer = await buildArtifactsAnalysisForDoc(pkg);
  docContainer.appendChild(analysisContainer);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${docContainer.innerHTML}</body></html>`;
}

async function buildArtifactsAnalysisForDoc(pkg) {
  const container = document.createElement("div");
  container.innerHTML = "<h3>🔧 Análise Detalhada dos Artefatos</h3>";

  try {
    const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
    const artifactsByType = groupArtifactsByType(pkgInfo.resources || []);

    for (const [type, artifacts] of Object.entries(artifactsByType)) {
      const section = document.createElement("div");
      section.innerHTML = `<h4>${getArtifactTypeTitle(type)}</h4>`;
      for (const artifact of artifacts) {
        section.appendChild(await buildArtifactDetailsForDoc(artifact, pkg));
      }
      container.appendChild(section);
    }
  } catch (err) {
    console.error("Error generating artifacts analysis for DOCX", err);
    container.innerHTML += `<p>Erro ao analisar artefatos: ${err.message}</p>`;
  }
  return container;
}

async function buildArtifactDetailsForDoc(artifact, pkg) {
  const container = document.createElement("div");
  container.className = "artifact-overview";
  container.innerHTML = `<h5>${escapeHtml(artifact.displayName)}</h5>`;

  if (artifact.resourceType === "IFlow") {
    const iflowContentZip = pkg.fileContents[artifact.id + "_content"];
    if (iflowContentZip) {
      const zip = await JSZip.loadAsync(iflowContentZip);
      const propFile = Object.values(zip.files).find((f) =>
        f.name.endsWith(".prop")
      );
      const propDefFile = Object.values(zip.files).find((f) =>
        f.name.endsWith(".propdef")
      );
      const iflowFile = Object.values(zip.files).find((f) =>
        f.name.endsWith(".iflw")
      );

      const propContent = propFile ? await propFile.async("string") : null;
      const propDefContent = propDefFile
        ? await propDefFile.async("string")
        : null;
      const iflowContent = iflowFile ? await iflowFile.async("string") : null;

      const paramAnalysis = await analyzeFlowParameters(
        propDefContent,
        propContent,
        iflowContent
      );
      if (paramAnalysis) {
        container.appendChild(buildParamsDocHtml(paramAnalysis));
      }

      const guidelineReport = pkg.guidelineReports[artifact.id];
      if (guidelineReport) {
        container.appendChild(buildGuidelineReportDocHtml(guidelineReport));
      }
    }
  }
  return container;
}

function buildParamsDocHtml({ inUseParams, orphanParams }) {
  const container = document.createElement("div");
  const buildGroupTable = (groupedParams, title) => {
    if (Object.keys(groupedParams).length === 0) return "";
    let html = `<h6>${title}</h6>`;
    Object.entries(groupedParams).forEach(([category, params]) => {
      html += `<p><strong>${escapeHtml(category)}</strong></p>
                     <table>
                       <thead><tr><th>Parâmetro</th><th>Valor Configurado</th></tr></thead>
                       <tbody>`;
      params.forEach((param) => {
        const value = param.value;
        let formattedValue =
          param.type === "custom:schedule" && value.includes("<row>")
            ? buildScheduleDocHtml(parseTimerConfiguration(value))
            : `<code>${escapeHtml(value)}</code>`;
        html += `<tr><td><strong>${escapeHtml(
          param.label
        )}</strong></td><td>${formattedValue}</td></tr>`;
      });
      html += "</tbody></table>";
    });
    return html;
  };

  if (
    Object.keys(inUseParams).length > 0 ||
    Object.keys(orphanParams).length > 0
  ) {
    container.innerHTML = `<h6>⚙️ Parâmetros Externalizados</h6>`;
    container.innerHTML += buildGroupTable(inUseParams, t("params_in_use"));
    container.innerHTML += buildGroupTable(orphanParams, t("orphan_params"));
  }
  return container;
}

function buildScheduleDocHtml(timerData) {
  let scheduleHtml = `<table>`;
  const scheduleType =
    timerData.timeType === "TIME_INTERVAL"
      ? "recurring"
      : timerData.triggerType === "cron"
      ? "cron"
      : "run_once";

  scheduleHtml += `<tr><td><strong>${t("schedule_type")}</strong></td><td>${t(
    scheduleType + "_schedule"
  )}</td></tr>`;

  if (scheduleType === "run_once") {
    scheduleHtml += `<tr><td><strong>${t(
      "schedule_datetime"
    )}</strong></td><td>${escapeHtml(timerData.fireAt || "N/A")}</td></tr>`;
  } else if (scheduleType === "recurring") {
    let frequency = "";
    if (timerData.OnEveryMinute)
      frequency = `${timerData.OnEveryMinute} ${t("minutes")}`;
    else if (timerData.OnEveryHour)
      frequency = `${timerData.OnEveryHour} ${t("hours")}`;
    else if (timerData.OnEveryDay)
      frequency = `${timerData.OnEveryDay} ${t("days")}`;

    scheduleHtml += `<tr><td><strong>${t(
      "repeats_every"
    )}</strong></td><td>${escapeHtml(frequency)}</td></tr>`;
    if (timerData.startAt)
      scheduleHtml += `<tr><td><strong>${t(
        "start_time"
      )}</strong></td><td>${escapeHtml(timerData.startAt)}</td></tr>`;
    if (timerData.endAt)
      scheduleHtml += `<tr><td><strong>${t(
        "end_time"
      )}</strong></td><td>${escapeHtml(timerData.endAt)}</td></tr>`;
  } else {
    // CRON
    const cronExpression = `${timerData.second || "*"} ${
      timerData.minute || "*"
    } ${timerData.hour || "*"} ${timerData.day_of_month || "?"} ${
      timerData.month || "*"
    } ${timerData.dayOfWeek || "*"}`;
    scheduleHtml += `<tr><td><strong>${t(
      "cron_expression_label"
    )}</strong></td><td><code>${escapeHtml(cronExpression)}</code></td></tr>`;
  }

  scheduleHtml += `<tr><td><strong>${t(
    "timezone_label"
  )}</strong></td><td>${escapeHtml(timerData.timeZone || "N/A")}</td></tr>`;
  scheduleHtml += `</table>`;
  return scheduleHtml;
}

function buildGuidelineReportDocHtml(report) {
  const container = document.createElement("div");
  let html = `<h6>✔️ Análise de Guidelines</h6>
                <p><strong>Resultado:</strong> ${report.summary.pass} Aprovados, ${report.summary.warn} Avisos, ${report.summary.fail} Falhas.</p>
                <table>
                  <thead><tr><th>Verificação</th><th>Resultado</th><th>Mensagem</th></tr></thead>
                  <tbody>`;
  report.results.forEach((res) => {
    html += `<tr>
                   <td><strong>${escapeHtml(
                     res.name
                   )}</strong><br><small>${escapeHtml(
      res.description
    )}</small></td>
                   <td>${escapeHtml(res.result)}</td>
                   <td>${escapeHtml(res.message)}</td>
                 </tr>`;
  });
  html += "</tbody></table>";
  container.innerHTML = html;
  return container;
}

// Funções auxiliares simples que não precisam de um módulo separado
function groupArtifactsByType(resources) {
  return resources.reduce((groups, resource) => {
    const type = resource.resourceType || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(resource);
    return groups;
  }, {});
}

function getArtifactTypeTitle(type) {
  const titles = {
    IFlow: "Fluxos de Integração",
    ScriptCollection: "Coleções de Scripts",
    MessageMapping: "Mapeamentos de Mensagem",
    ContentPackage: "Informações do Pacote",
  };
  return titles[type] || type;
}
