/**
 * utils.js
 *
 * Contém funções utilitárias compartilhadas por toda a aplicação para evitar repetição de código.
 */

/**
 * Decodifica uma string Base64 para UTF-8 de forma segura.
 * @param {string} base64 - A string Base64 para decodificar.
 * @returns {string} - A string decodificada.
 */
function decodeBase64Utf8(base64) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) {
    console.error("Could not decode Base64 string as UTF-8:", e);
    return atob(base64); // Fallback
  }
}

/**
 * Escapa caracteres HTML para prevenir XSS e garantir a exibição correta.
 * @param {*} unsafe - A string ou valor a ser escapado.
 * @returns {string} - A string segura para HTML.
 */
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
