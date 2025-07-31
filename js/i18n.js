const translations = {
  "pt-BR": {
    title: "SAP CPI Package Decoder",
    subtitle: "Decodifique e visualize o conteúdo de pacotes exportados do SAP Cloud Integration",
    how_to_use: "Como usar:",
    step_upload: "Faça o upload do arquivo <code>.zip</code> exportado do SAP CPI.",
    step_auto: "Os arquivos contidos no pacote serão automaticamente decodificados.",
    drag_drop: "📁 Arraste o arquivo .zip aqui ou clique para selecionar",
    select_zip: "Selecionar Arquivo ZIP",
    supports_zip: "Suporta: Pacotes .zip do SAP CPI",
    download_decoded: "⬇️ Baixar Recursos Decodificados",
    project_info: "Este projeto está disponível no <a href=\"https://github.com/lrcherubini/cpi-package-decoder\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>. Colaborações são bem-vindas!",
    modal_title: "Conteúdo do Arquivo",
    format_code: "Formatar código",
    copy_content: "Copiar conteúdo",
    view_bpmn: "Visualizar BPMN",
    fullscreen: "Tela cheia",
    no_resources: "resources.cnt não encontrado ou não processado.",
    no_content: "Nenhum conteúdo associado a este recurso.",
    file_not_found: "Arquivo não encontrado: ",
    not_bpmn: "Arquivo atual não é um IFLW/BPMN.",
    no_resources_download: "Nenhum recurso processado para download.",
    content_metadata_title: "📋 Metadados do Conteúdo (contentmetadata.md)",
    package_resources_title: "📦 Recursos do Pacote (resources.cnt)",
    processing_error_title: "❌ Erro ao processar ",
    error_label: "Erro: ",
    iflow_files_title: "📂 Arquivos do IFlow",
    file_click_hint: "💡 Clique em qualquer arquivo para visualizar seu conteúdo.",
    resources_found: "📋 Recursos encontrados:",
    resource_details: "Tipo: {type} | Versão: {version} | Modificado por: {user}",
    resource_click_hint: "💡 Clique em qualquer recurso para visualizar seu conteúdo no editor. Recursos do tipo URL serão abertos em nova janela"
  },
  "en-US": {
    title: "SAP CPI Package Decoder",
    subtitle: "Decode and view the contents of packages exported from SAP Cloud Integration",
    how_to_use: "How to use:",
    step_upload: "Upload the exported <code>.zip</code> file from SAP CPI.",
    step_auto: "Files inside the package will be automatically decoded.",
    drag_drop: "📁 Drag the .zip file here or click to select",
    select_zip: "Select ZIP File",
    supports_zip: "Supports: SAP CPI package .zip files",
    download_decoded: "⬇️ Download Decoded Resources",
    project_info: "This project is available on <a href=\"https://github.com/lrcherubini/cpi-package-decoder\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>. Contributions are welcome!",
    modal_title: "File Content",
    format_code: "Format code",
    copy_content: "Copy content",
    view_bpmn: "View BPMN",
    fullscreen: "Fullscreen",
    no_resources: "resources.cnt not found or not processed.",
    no_content: "No content associated with this resource.",
    file_not_found: "File not found: ",
    not_bpmn: "Current file is not an IFLW/BPMN.",
    no_resources_download: "No resources processed for download.",
    content_metadata_title: "📋 Content Metadata (contentmetadata.md)",
    package_resources_title: "📦 Package Resources (resources.cnt)",
    processing_error_title: "❌ Error processing ",
    error_label: "Error: ",
    iflow_files_title: "📂 IFlow Files",
    file_click_hint: "💡 Click any file to view its contents.",
    resources_found: "📋 Resources found:",
    resource_details: "Type: {type} | Version: {version} | Modified by: {user}",
    resource_click_hint: "💡 Click any resource to view its content in the editor. URL resources will open in a new window"
  },
  "es-ES": {
    title: "SAP CPI Package Decoder",
    subtitle: "Decodifica y visualiza el contenido de paquetes exportados de SAP Cloud Integration",
    how_to_use: "Cómo usar:",
    step_upload: "Sube el archivo <code>.zip</code> exportado de SAP CPI.",
    step_auto: "Los archivos del paquete se decodificarán automáticamente.",
    drag_drop: "📁 Arrastra el archivo .zip aquí o haz clic para seleccionarlo",
    select_zip: "Seleccionar Archivo ZIP",
    supports_zip: "Soporta: paquetes .zip de SAP CPI",
    download_decoded: "⬇️ Descargar Recursos Decodificados",
    project_info: "Este proyecto está disponible en <a href=\"https://github.com/lrcherubini/cpi-package-decoder\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>. ¡Las contribuciones son bienvenidas!",
    modal_title: "Contenido del Archivo",
    format_code: "Formatear código",
    copy_content: "Copiar contenido",
    view_bpmn: "Ver BPMN",
    fullscreen: "Pantalla completa",
    no_resources: "resources.cnt no encontrado o no procesado.",
    no_content: "Ningún contenido asociado a este recurso.",
    file_not_found: "Archivo no encontrado: ",
    not_bpmn: "El archivo actual no es un IFLW/BPMN.",
    no_resources_download: "Ningún recurso procesado para descarga.",
    content_metadata_title: "📋 Metadatos del Contenido (contentmetadata.md)",
    package_resources_title: "📦 Recursos del Paquete (resources.cnt)",
    processing_error_title: "❌ Error al procesar ",
    error_label: "Error: ",
    iflow_files_title: "📂 Archivos del IFlow",
    file_click_hint: "💡 Haz clic en cualquier archivo para ver su contenido.",
    resources_found: "📋 Recursos encontrados:",
    resource_details: "Tipo: {type} | Versión: {version} | Modificado por: {user}",
    resource_click_hint: "💡 Haz clic en cualquier recurso para ver su contenido en el editor. Los recursos tipo URL se abrirán en una nueva ventana"
  }
};

let currentLang = 'pt-BR';

function t(key) {
  return translations[currentLang][key] || translations['en-US'][key] || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    el.innerHTML = text;
  });
  document.getElementById('formatBtn').title = t('format_code');
  document.getElementById('copyBtn').title = t('copy_content');
  document.getElementById('bpmnBtn').title = t('view_bpmn');
  document.getElementById('fullscreenBtn').title = t('fullscreen');
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    applyTranslations();
  }
}

document.addEventListener('DOMContentLoaded', applyTranslations);
