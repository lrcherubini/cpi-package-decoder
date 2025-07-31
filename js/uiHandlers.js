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
  if (e.dataTransfer.files.length > 0) {
    handleZipFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleZipFile(e.target.files[0]);
  }
});

closeModal.addEventListener("click", closeEditorModal);
closeBpmnModal.addEventListener("click", closeBpmnViewer);

bpmnModal.addEventListener("click", (e) => {
  if (e.target === bpmnModal) {
    closeBpmnViewer();
  }
});

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

bpmnBtn.addEventListener("click", () => {
  if (!monacoEditor) return;
  const ext = currentFileName.split(".").pop().toLowerCase();
  if (ext !== "iflw" && ext !== "bpmn" && ext !== "xml") {
    alert(t("not_bpmn"));
    return;
  }
  const xml = monacoEditor.getValue();
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  const encoded = encodeURIComponent(base64);
  bpmnFrame.src = `bpmn_viewer.html?data=${encoded}&lang=${currentLang}`;
  bpmnModal.style.display = "block";
  bpmnModal.classList.add("show");
  bpmnModal.querySelector(".modal-content").classList.add("show");
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
