function buildDocumentation() {
  if (!packagesData.length) {
    alert(t("no_packages_doc"));
    return;
  }

  let md = "# SAP CPI Packages Documentation\n\n";
  packagesData.forEach((pkg, idx) => {
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
          pkgInfo.resources.forEach((res) => {
            const name = res.displayName || res.name || res.id;
            const type = res.resourceType || "";
            const version = res.semanticVersion || res.version || "";
            const ct = res.contentType || "";
            md += `| ${name} | ${type} | ${version} | ${ct} |\n`;
          });
          md += "\n";
        }
      } catch (err) {
        console.error("Error generating documentation for resources", err);
      }
    }
  });

  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cpi_package_documentation.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
