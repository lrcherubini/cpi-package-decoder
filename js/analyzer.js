/**
 * analyzer.js
 *
 * Módulo central para analisar o conteúdo dos artefatos do SAP CPI.
 * Contém toda a lógica de parsing e extração de informações dos arquivos.
 */

/**
 * Analisa e agrupa os parâmetros externalizados de um iFlow.
 * @param {string} propDefContent - Conteúdo do arquivo .propdef.
 * @param {string} propContent - Conteúdo do arquivo .prop.
 * @param {string} iflowContent - Conteúdo do arquivo .iflw.
 * @returns {object} - Um objeto contendo os parâmetros em uso e órfãos, agrupados por categoria.
 */
async function analyzeFlowParameters(
  propDefContent,
  propContent,
  iflowContent
) {
  if (!propDefContent || !propContent) return null;

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(propDefContent, "text/xml");

    const paramMetadata = {};
    const definedParams = [];

    // 1. Extrai metadados do .propdef
    xmlDoc.querySelectorAll("parameter").forEach((param) => {
      const name = param.querySelector("name")?.textContent;
      if (name) {
        definedParams.push(name);
        paramMetadata[name] = {
          type: param.querySelector("type")?.textContent || "xsd:string",
          label: name,
          category: t("global_params"),
        };
      }
    });

    xmlDoc.querySelectorAll("param_references > reference").forEach((ref) => {
      const key = ref.getAttribute("param_key");
      if (paramMetadata[key]) {
        paramMetadata[key].label = ref.getAttribute("attribute_uilabel") || key;
        paramMetadata[key].category =
          ref.getAttribute("attribute_category") || t("global_params");
      }
    });

    // 2. Encontra parâmetros realmente usados no .iflw
    const usedParams = new Set();
    if (iflowContent) {
      const matches = iflowContent.match(/\{\{([^{}]+)\}\}/g) || [];
      matches.forEach((match) =>
        usedParams.add(match.substring(2, match.length - 2))
      );
    }

    // 3. Lê os valores do .prop
    const paramValues = {};
    propContent.split(/\r?\n/).forEach((line) => {
      if (line.trim() && !line.trim().startsWith("#")) {
        const sepIndex = line.indexOf("=");
        if (sepIndex !== -1) {
          paramValues[line.substring(0, sepIndex).trim()] = line
            .substring(sepIndex + 1)
            .trim();
        }
      }
    });

    // 4. Agrupa os parâmetros
    const groupParams = (paramKeys) => {
      return paramKeys.reduce((acc, key) => {
        if (!paramValues[key]) return acc; // Apenas parâmetros com valor configurado
        const meta = paramMetadata[key] || {
          label: key,
          category: t("global_params"),
          type: "xsd:string",
        };
        if (!acc[meta.category]) acc[meta.category] = [];
        acc[meta.category].push({ key, value: paramValues[key], ...meta });
        return acc;
      }, {});
    };

    const inUseParams = groupParams(
      definedParams.filter((p) => usedParams.has(p))
    );
    const orphanParams = groupParams(
      definedParams.filter((p) => !usedParams.has(p))
    );

    return { inUseParams, orphanParams };
  } catch (e) {
    console.error("Could not analyze flow parameters", e);
    return null;
  }
}

/**
 * Extrai os endpoints de um iFlow.
 * @param {string} iflowXml - O conteúdo XML do iFlow.
 * @returns {Promise<Array>} - Uma lista de objetos de endpoint.
 */
async function extractIFlowEndpoints(iflowXml) {
  if (!iflowXml) return [];
  const BpmnJS = window.BpmnJS;
  const viewer = new BpmnJS();

  try {
    await viewer.importXML(iflowXml);
    const elementRegistry = viewer.get("elementRegistry");
    const participants = [];
    const participantElements = elementRegistry.filter(
      (el) => el.type === "bpmn:Participant" && !el.businessObject.processRef
    );

    participantElements.forEach((p) => {
      // ... Lógica de extração de endpoint ...
    });
    return participants;
  } catch (err) {
    console.error("Error processing BPMN to extract endpoints:", err);
    return [];
  } finally {
    viewer.destroy();
  }
}

/**
 * Parseia a configuração de um Timer e retorna os dados estruturados.
 * @param {string} value - A string de configuração do timer.
 * @returns {object} - Um objeto com os dados do timer.
 */
function parseTimerConfiguration(value) {
  const timerData = {};
  const rows = value.match(/<row>(.*?)<\/row>/g) || [];
  rows.forEach((row) => {
    const cells = row.match(/<cell>(.*?)<\/cell>/g);
    if (cells && cells.length === 2) {
      const key = cells[0].replace(/<\/?cell>/g, "").replace(/\\:/g, ":");
      const val = cells[1].replace(/<\/?cell>/g, "").replace(/\\:/g, ":");
      timerData[key] = val;
    }
  });
  return timerData;
}
