// Attach UI event handlers
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);
  files.reduce((p, file) => p.then(() => handleZipFile(file)), Promise.resolve());
});

fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  files.reduce((p, file) => p.then(() => handleZipFile(file)), Promise.resolve());
});

closeModal.addEventListener("click", closeEditorModal);
refreshBtn.addEventListener("click", () => location.reload());

viewSwitchBtn.addEventListener("click", toggleViewMode);

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeEditorModal();
  }
});

langSelect.addEventListener("change", (e) => {
  setLanguage(e.target.value);
});

languageSelect.addEventListener("change", (e) => {
  if (monacoEditor) {
    monaco.editor.setModelLanguage(monacoEditor.getModel(), e.target.value);
  }
});

fileSelect.addEventListener("change", (e) => {
  const fileName = e.target.value;
  if (currentFiles[fileName]) {
    setEditorContent(currentFiles[fileName], fileName);
  }
});

copyBtn.addEventListener("click", () => {
  if (monacoEditor) {
    const content = monacoEditor.getValue();
    navigator.clipboard
      .writeText(content)
      .then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 2000);
      })
      .catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        copyBtn.textContent = "✅";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 2000);
      });
  }
});


formatBtn.addEventListener("click", () => {
  if (monacoEditor) {
    const model = monacoEditor.getModel();
    const language = model ? model.getLanguageId() : "";
    if (language === "xml") {
      const formatted = prettyPrintXML(monacoEditor.getValue());
      monacoEditor.setValue(formatted);
    } else {
      const action = monacoEditor.getAction("editor.action.formatDocument");
      if (action) {
        action.run();
      }
    }
  }
});

fullscreenBtn.addEventListener("click", toggleFullscreen);
downloadBtn.addEventListener("click", downloadResources);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "block") {
    closeEditorModal();
  }
});

results.addEventListener("click", function (e) {
  const scriptItem = e.target.closest(".script-item");
  if (!scriptItem) return;

  const pkgIndex = scriptItem.dataset.packageIndex;
  if (pkgIndex !== undefined && packagesData[pkgIndex]) {
    fileContents = packagesData[pkgIndex].fileContents;
    resourcesCntDecoded = packagesData[pkgIndex].resourcesCntDecoded;
    originalZipName = packagesData[pkgIndex].originalZipName;
  }

  if (scriptItem.dataset.resourceId) {
    const resourceId = scriptItem.dataset.resourceId;
    const resourceName = scriptItem.querySelector(".script-name").textContent;
    const resourceType = scriptItem.dataset.resourceType;
    const resourceUrl = scriptItem.dataset.resourceUrl;

    if (resourceType && resourceType.toUpperCase() === "URL" && resourceUrl) {
      window.open(resourceUrl, "_blank");
      return;
    }

    if (resourceType && resourceType.toUpperCase() === "FILE") {
      downloadFileResource(resourceId, resourceName, resourceType);
      return;
    }

    openResourceInMonaco(resourceId, resourceName, resourceType);
  } else if (scriptItem.dataset.filePath) {
    const filePath = scriptItem.dataset.filePath;
    openIflowFile(filePath);
  }
});
