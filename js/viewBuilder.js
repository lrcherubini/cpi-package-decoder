/**
 * viewBuilder.js
 *
 * Responsável por construir as visualizações HTML ("modo renderizado") para diferentes tipos de arquivos.
 */

/**
 * Constrói a visualização de parâmetros externalizados.
 * @param {object} analysisResult - O objeto retornado pelo analyzer.js#analyzeFlowParameters.
 * @returns {string} - A string HTML da visualização.
 */
function buildPropView(analysisResult) {
  if (!analysisResult) return `<p>${t("no_param_configured")}</p>`;

  const { inUseParams, orphanParams } = analysisResult;
  let html = `<h3>${t("param_values_title")}</h3>`;

  const buildGroupHtml = (groupedParams, title) => {
    if (Object.keys(groupedParams).length === 0) return "";
    let sectionHtml = `<h4>${title}</h4>`;
    Object.entries(groupedParams).forEach(([category, params]) => {
      sectionHtml += `<div class="result-section">
                        <h5 class="result-title">${escapeHtml(category)}</h5>
                        <table class="metadata-table"><tbody>`;
      params.forEach((param) => {
        let formattedValue =
          param.type === "custom:schedule" && param.value.includes("<row>")
            ? buildScheduleView(parseTimerConfiguration(param.value))
            : `<div class="code-block">${escapeHtml(param.value)}</div>`;
        sectionHtml += `<tr>
                          <td><strong>${escapeHtml(param.label)}</strong></td>
                          <td>${formattedValue}</td>
                        </tr>`;
      });
      sectionHtml += `</tbody></table></div>`;
    });
    return sectionHtml;
  };

  html += buildGroupHtml(inUseParams, t("params_in_use"));
  html += buildGroupHtml(orphanParams, t("orphan_params"));

  if (
    Object.keys(inUseParams).length === 0 &&
    Object.keys(orphanParams).length === 0
  ) {
    html += `<p>${t("no_param_configured")}</p>`;
  }
  return html;
}

/**
 * Constrói a tabela de visualização para um agendamento de Timer.
 * @param {object} timerData - Objeto com os dados do timer, parseado pelo analyzer.
 * @returns {string} - A string HTML da tabela.
 */
function buildScheduleView(timerData) {
  let scheduleHtml = `<table class="metadata-table"><tbody>`;
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
    )}</strong></td><td><div class="code-block">${escapeHtml(
      cronExpression
    )}</div></td></tr>`;
    if (timerData.startAt)
      scheduleHtml += `<tr><td><strong>${t(
        "start_time"
      )}</strong></td><td>${escapeHtml(timerData.startAt)}</td></tr>`;
    if (timerData.endAt)
      scheduleHtml += `<tr><td><strong>${t(
        "end_time"
      )}</strong></td><td>${escapeHtml(timerData.endAt)}</td></tr>`;
  }

  scheduleHtml += `<tr><td><strong>${t(
    "timezone_label"
  )}</strong></td><td>${escapeHtml(timerData.timeZone || "N/A")}</td></tr>`;
  scheduleHtml += `</tbody></table>`;

  return scheduleHtml;
}

/**
 * Constrói a visualização do relatório de Guidelines.
 * @param {object} report - O objeto de relatório gerado pelo guidelineChecker.
 * @returns {string} - A string HTML da visualização.
 */
function buildGuidelineReportView(report) {
  let html = `<div class="guideline-report-view">`;
  html += `<h2>${t("guideline_report_title")}</h2>`;
  html += `<div class="summary-grid">
        <div class="summary-box pass"><strong>${
          report.summary.pass
        }</strong><span>${t("guideline_pass")}</span></div>
        <div class="summary-box warn"><strong>${
          report.summary.warn
        }</strong><span>${t("guideline_warn")}</span></div>
        <div class="summary-box fail"><strong>${
          report.summary.fail
        }</strong><span>${t("guideline_fail")}</span></div>
    </div>`;

  html += "<h3>Detalhes das Verificações</h3>";
  report.results.forEach((res) => {
    html += `<div class="guideline-item ${res.result}">
            <div class="guideline-header"><strong>${escapeHtml(
              res.name
            )}</strong></div>
            <p class="guideline-desc">${escapeHtml(res.description)}</p>
            <p class="guideline-message">${escapeHtml(res.message)}</p>
        </div>`;
  });

  html += `</div>`;
  return html;
}

// Outras funções de build (buildManifestView, buildProjectView, etc.) podem ser movidas para cá...
