async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  let html = "<h1>SAP CPI Packages Documentation</h1>";

  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = pkg.originalZipName || `Package ${idx + 1}`;
    html += `<h2>${escapeHtml(pkgName)}</h2>`;

    const metadataContent = pkg.fileContents["contentmetadata.md"];
    if (metadataContent) {
      try {
        const decoded = atob(metadataContent.trim());
        html += `<h3>${t("content_metadata_title")}</h3>`;
        html += `<pre><code>${escapeHtml(decoded)}</code></pre>`;
      } catch (e) {
        console.error("Error decoding content metadata", e);
      }
    }

    if (pkg.resourcesCntDecoded) {
      try {
        const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
        if (pkgInfo.resources && pkgInfo.resources.length > 0) {
          html += `<h3>${t("package_resources_title")}</h3>`;
          html +=
            "<table><tr><th>Name</th><th>Type</th><th>Version</th><th>Content Type</th></tr>";
          for (const res of pkgInfo.resources) {
            const name = escapeHtml(res.displayName || res.name || res.id);
            const type = escapeHtml(res.resourceType || "");
            const version = escapeHtml(res.semanticVersion || res.version || "");
            const ct = escapeHtml(res.contentType || "");
            html += `<tr><td>${name}</td><td>${type}</td><td>${version}</td><td>${ct}</td></tr>`;
          }
          html += "</table>";

          // Append rendered view for each resource
          for (const res of pkgInfo.resources) {
            const name = res.displayName || res.name || res.id;
            const contentFileName = res.id + "_content";
            const rawContent = pkg.fileContents[contentFileName];
            if (!rawContent) continue;

            const files = await extractContentAsString(rawContent);
            for (const { target, content } of files) {
              const rendered = await generateRenderedViewHTML(
                content,
                target,
                pkg.fileContents
              );
              if (rendered) {
                const heading = files.length > 1 ? `${name} - ${target}` : name;
                html += `<h4>${escapeHtml(heading)}</h4>`;
                html += rendered;
              }
            }
          }
        }
      } catch (err) {
        console.error("Error generating documentation for resources", err);
      }
    }
  }

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  const blob = htmlDocx.asBlob(fullHtml);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cpi_package_documentation.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function extractContentAsString(content) {
  const results = [];
  if (typeof content === "string") {
    results.push({ target: "", content });
    return results;
  }
  try {
    const zip = await JSZip.loadAsync(content);
    const candidates = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    const targets = candidates.filter((f) =>
      /\.(iflw|bpmn|project|mmap|prop|propdef|mf)$/i.test(f)
    );
    for (const target of targets) {
      const str = await zip.file(target).async("string");
      results.push({ target, content: str });
    }
  } catch (e) {
    try {
      const decoded = new TextDecoder().decode(content);
      results.push({ target: "", content: decoded });
    } catch (err) {
      console.error("Unable to decode content", err);
    }
  }
  return results;
}

async function renderBpmnToSvg(xml) {
  const viewer = new window.BpmnJS();
  await viewer.importXML(xml);
  const result = await viewer.saveSVG();
  return result.svg;
}

async function generateRenderedViewHTML(content, fileName, allFiles) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  try {
    if (ext === "iflw" || ext === "bpmn") {
      const svg = await renderBpmnToSvg(content);
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      return `<img src="data:image/svg+xml;base64,${base64}" alt="${escapeHtml(
        fileName
      )}" />`;
    } else if (ext === "propdef") {
      return buildPropDefView(content);
    } else if (ext === "mf") {
      return buildManifestView(content);
    } else if (ext === "project") {
      return buildProjectView(content);
    } else if (ext === "prop") {
      return buildPropView(content, allFiles || {});
    } else if (ext === "json") {
      const obj = JSON.parse(content);
      if (obj.resources && Array.isArray(obj.resources)) {
        const view = await buildContentPackageView(obj, allFiles || {});
        return view.outerHTML;
      } else {
        const tree = buildJsonTree(obj, "JSON");
        return tree.outerHTML;
      }
    } else if (ext === "mmap") {
      const view = buildMmapView(content);
      return view.outerHTML;
    }
  } catch (e) {
    console.error("Error generating rendered view", e);
    return `<div class="error">${escapeHtml(e.message)}</div>`;
  }
  return "";
}
