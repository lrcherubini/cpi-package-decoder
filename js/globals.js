// DOM elements and global variables
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const results = document.getElementById("results");
const modal = document.getElementById("editorModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const languageSelect = document.getElementById("languageSelect");
const fileSelect = document.getElementById("fileSelect");
const formatBtn = document.getElementById("formatBtn");
const copyBtn = document.getElementById("copyBtn");
const viewSwitchBtn = document.getElementById("viewSwitchBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const downloadBtn = document.getElementById("downloadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const renderedView = document.getElementById("renderedView");
const langSelect = document.getElementById("langSelect");

let fileContents = {}; // Conteúdo dos arquivos do ZIP principal
let resourcesCntDecoded = "";
let monacoEditor = null;
let isFullscreen = false;
let currentFiles = {};
let originalZipName = "";
let currentFileName = "";

function getFileContent(fileName) {
  if (fileContents[fileName]) {
    return fileContents[fileName];
  }
  const foundKey = Object.keys(fileContents).find(
    (key) => key === fileName || key.endsWith("/" + fileName)
  );
  return foundKey ? fileContents[foundKey] : null;
}

// Monaco Editor loader configuration
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
  },
});
require(["vs/editor/editor.main"], function () {
  console.log("Monaco Editor loaded successfully");
});
