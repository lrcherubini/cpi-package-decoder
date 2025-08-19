async function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  let md = "# SAP CPI Packages Documentation\n\n";

  for (const [idx, pkg] of packagesData.entries()) {
    const pkgName = pkg.originalZipName || `Package ${idx + 1}`;
    md += `## ${pkgName}\n\n`;

    const metadataContent = pkg.fileContents["contentmetadata.md"];
    if (metadataContent) {
      try {
        const decoded = atob(metadataContent.trim());
        md += `### ${t("content_metadata_title")}\n\n`;
        md += "```\n" + decoded + "\n```\n\n";
      } catch (e) {
        console.error("Error decoding content metadata", e);
      }
    }

    if (pkg.resourcesCntDecoded) {
      try {
        const pkgInfo = JSON.parse(pkg.resourcesCntDecoded);
        if (pkgInfo.resources && pkgInfo.resources.length > 0) {
          md += `### ${t("package_resources_title")}\n\n`;
          md += "| Name | Type | Version | Content Type |\n";
          md += "|------|------|---------|--------------|\n";
          for (const res of pkgInfo.resources) {
            const name = res.displayName || res.name || res.id;
            const type = res.resourceType || "";
            const version = res.semanticVersion || res.version || "";
            const ct = res.contentType || "";
            md += `| ${name} | ${type} | ${version} | ${ct} |\n`;
          }
          md += "\n";

          // Append rendered view for each resource
          for (const res of pkgInfo.resources) {
            const name = res.displayName || res.name || res.id;
            const contentFileName = res.id + "_content";
            const rawContent = pkg.fileContents[contentFileName];
            if (!rawContent) continue;

            const contentStr = await extractContentAsString(rawContent);
            const rendered = await generateRenderedViewHTML(
              contentStr,
              name,
              pkg.fileContents
            );
            if (rendered) {
              md += `#### ${name}\n\n`;
              md += rendered + "\n\n";
            }
          }
        }
      } catch (err) {
        console.error("Error generating documentation for resources", err);
      }
    }
  }

  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cpi_package_documentation.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

async function extractContentAsString(content) {
  if (typeof content === "string") {
    return content;
  }
  try {
    const zip = await JSZip.loadAsync(content);
    const candidates = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    const target =
      candidates.find((f) => /\.(iflw|bpmn|xml|json|project|mmap|prop|propdef|mf)$/i.test(f)) ||
      candidates[0];
    if (target) {
      return await zip.file(target).async("string");
    }
  } catch (e) {
    try {
      return new TextDecoder().decode(content);
    } catch (err) {
      console.error("Unable to decode content", err);
    }
  }
  return "";
}

async function renderBpmnToSvg(xml) {
  const viewer = new window.BpmnJS();
  await viewer.importXML(xml);
  const result = await viewer.saveSVG();
  return result.svg;
}

async function generateRenderedViewHTML(content, fileName, allFiles) {
  const ext = fileName.split(".").pop().toLowerCase();
  try {
    if (ext === "iflw") {
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
