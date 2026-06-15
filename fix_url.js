const fs = require("fs");
const path = require("path");

const appTsxPath = path.join(__dirname, "src", "App.tsx");
let content = fs.readFileSync(appTsxPath, "utf-8");

// We inject the helper function at the top, just after the imports
const helperFn = `
// Helper para construir URLs de la librería preservando caracteres especiales como '#' o '?'
export const buildLuminFileUrl = (pathStr?: string): string | undefined => {
  if (!pathStr) return undefined;
  try {
    const normalized = pathStr.replace(/\\\\/g, "/");
    const encoded = normalized.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return \`lumin-file:///\${encoded}\`;
  } catch (e) {
    return undefined;
  }
};
`;

if (!content.includes("buildLuminFileUrl")) {
  content = content.replace(/(import .* from ".*";\n)(const DEFAULT_COLOR =)/, "$1" + helperFn + "\n$2");
}

// 1. getFileUrl
content = content.replace(
  /const normalized = filePath\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*return `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `return buildLuminFileUrl(filePath) || "";`
);

// 2. VideoLayer Self-healing
content = content.replace(
  /const normalized = hasPath\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*const nativeUrl = `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `const nativeUrl = buildLuminFileUrl(hasPath) || "";`
);

// 3. rebuildUrlFromPath
content = content.replace(
  /const normalized = obj\.path\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*obj\.url = `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `obj.url = buildLuminFileUrl(obj.path) || "";`
);

// 4. urlFromPath
content = content.replace(
  /const normalized = p\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*return `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `return buildLuminFileUrl(p);`
);

// 5. getReconstructedClipAsync
content = content.replace(
  /const normalized = targetPath\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*newUrl = `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `newUrl = buildLuminFileUrl(targetPath) || "";`
);

// 6. reconstructedFiles
// Done natively if it's identical to the previous replacement regex?
// Wait, in handleAddClips (PDF import)
content = content.replace(
  /const fileUrl = `lumin-file:\/\/\/\$\{pdfPath\.replace\(\/\\\\\\\\\/g, "\/"\)\}`;/g,
  `const fileUrl = buildLuminFileUrl(pdfPath) || "";`
);

// 7. duplicate clip logic
content = content.replace(
  /const normalized = path\.replace\(\/\\\\\\\\\/g, "\/"\);\n\s*pUrl = `lumin-file:\/\/\/\$\{normalized\}`;/g,
  `pUrl = buildLuminFileUrl(path) || "";`
);

fs.writeFileSync(appTsxPath, content, "utf-8");
console.log("App.tsx URLs fixed!");
