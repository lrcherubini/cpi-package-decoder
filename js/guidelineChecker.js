/**
 * Guideline Checker for SAP CPI iFlows
 * This module analyzes iFlow XML content against a set of predefined development guidelines.
 */

/**
 * List of predefined guideline checks.
 * Each check is a function that takes a bpmn-js modeler instance and returns a result object.
 * Result object: { result: 'pass'|'warn'|'fail', message: '...' }
 */
const guidelineChecks = [
  {
    id: 'naming-convention',
    name: 'Convenção de Nomenclatura do iFlow',
    description: 'Verifica se o nome do iFlow segue o padrão recomendado (ex: <Área> <Interface>).',
    check: (modeler) => {
      const definitions = modeler.get('canvas').getRootElement().businessObject.$parent;
      const process = definitions.rootElements.find(el => el.$type === 'bpmn:Process');
      const name = process?.name || '';
      
      // Regra simples: verifica se o nome contém pelo menos um espaço, sugerindo um padrão.
      if (name && name.includes(' ') && name.length > 5) {
        return { result: 'pass', message: `O nome do iFlow "${name}" parece seguir um padrão de nomenclatura.` };
      }
      return { result: 'warn', message: `O nome do iFlow "${name}" pode não seguir a convenção recomendada (ex: "FIN Pedido de Venda - SAP para Salesforce").` };
    }
  },
  {
    id: 'error-handling',
    name: 'Tratamento de Erros',
    description: 'Verifica se o iFlow possui um "Exception Subprocess" para um tratamento de erros robusto.',
    check: (modeler) => {
      const elementRegistry = modeler.get('elementRegistry');
      const hasExceptionSubprocess = elementRegistry.find(el => el.type === 'bpmn:SubProcess' && el.businessObject.triggeredByEvent);
      
      if (hasExceptionSubprocess) {
        return { result: 'pass', message: 'O iFlow contém um "Exception Subprocess" para tratamento de erros.' };
      }
      return { result: 'fail', message: 'Nenhum "Exception Subprocess" encontrado. O tratamento de erros pode não ser robusto.' };
    }
  },
  {
    id: 'complexity',
    name: 'Complexidade do iFlow',
    description: 'Conta o número de elementos de fluxo para avaliar a complexidade. iFlows muito complexos devem ser modularizados.',
    check: (modeler) => {
      const elementRegistry = modeler.get('elementRegistry');
      // Conta elementos que representam passos lógicos
      const flowElements = elementRegistry.filter(el => 
        el.type.startsWith('bpmn:') && 
        ['Task', 'SubProcess', 'Gateway', 'Event', 'DataObject'].some(type => el.type.includes(type))
      );
      const count = flowElements.length;

      if (count > 25) {
        return { result: 'fail', message: `O iFlow possui ${count} elementos, o que é considerado muito complexo. Considere modularizar o fluxo usando "Local Processes" ou "ProcessDirect".` };
      }
      if (count > 15) {
        return { result: 'warn', message: `O iFlow possui ${count} elementos. Monitore a complexidade para garantir a manutenibilidade.` };
      }
      return { result: 'pass', message: `O iFlow possui ${count} elementos, um nível de complexidade aceitável.` };
    }
  },
   {
    id: 'hardcoded-urls',
    name: 'URLs Hardcoded',
    description: 'Verifica se existem URLs fixas (hardcoded) em "Content Modifiers", o que não é uma boa prática.',
    check: (modeler) => {
      const elementRegistry = modeler.get('elementRegistry');
      const contentModifiers = elementRegistry.filter(el => 
        el.businessObject?.extensionElements?.values?.some(ext => 
          ext.$type === 'ifl:property' && ext.key === 'body'
        )
      );

      let hardcodedFound = false;
      for (const modifier of contentModifiers) {
        const bodyProp = modifier.businessObject.extensionElements.values.find(ext => ext.key === 'body');
        const bodyContent = bodyProp?.value || '';
        if (bodyContent.match(/https?:\/\/[^\s'"]+/)) {
          hardcodedFound = true;
          break;
        }
      }

      if (hardcodedFound) {
        return { result: 'warn', message: 'Potenciais URLs hardcoded foram encontradas em um "Content Modifier". Externalize parâmetros sempre que possível.' };
      }
      return { result: 'pass', message: 'Nenhuma URL hardcoded óbvia foi encontrada nos "Content Modifiers".' };
    }
  }
];

/**
 * Executes all guideline checks on a given iFlow XML content.
 * @param {string} iflowXml - The XML content of the iFlow.
 * @returns {Promise<object>} A promise that resolves to a report object.
 */
async function checkGuidelines(iflowXml) {
  const BpmnJS = window.BpmnJS;
  if (!BpmnJS) {
    console.error("bpmn-js is not loaded.");
    return null;
  }

  const viewer = new BpmnJS();
  const report = {
    summary: { pass: 0, warn: 0, fail: 0, total: 0 },
    results: [],
    timestamp: new Date().toISOString()
  };

  try {
    await viewer.importXML(iflowXml);

    for (const guideline of guidelineChecks) {
      const result = guideline.check(viewer);
      report.results.push({
        ...guideline,
        ...result
      });
      report.summary[result.result]++;
      report.summary.total++;
    }
  } catch (err) {
    console.error("Error processing BPMN for guideline checks:", err);
    return null;
  } finally {
    viewer.destroy();
  }
  
  return report;
}