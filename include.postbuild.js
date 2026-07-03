import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, parse, resolve } from "path";

const configFile = "build.config.json";
const appsScriptDir = resolve(process.cwd(), "apps-script");
const outFile = join(appsScriptDir, "include.js");
const indexFile = join(appsScriptDir, "index.html");
const manifestFile = join(appsScriptDir, ".build-manifest.json");
const buildConfig = JSON.parse(readFileSync(configFile, "utf-8"));

const includeGroups = collectIncludeGroups(buildConfig);

writeFileSync(outFile, createIncludeFile(includeGroups));
console.log(`include.js generated -> ${outFile}`);
ensureIndexIncludes(indexFile);

function collectIncludeGroups(config) {
  if (!existsSync(manifestFile)) {
    throw new Error("Missing apps-script/.build-manifest.json; run the GAS Vite build before include.postbuild.js.");
  }

  const generatedFiles = JSON.parse(readFileSync(manifestFile, "utf-8"));

  const selectedEntries = getSelectedEntries(config);

  generatedFiles.sort((a, b) => {
    const aSelected = selectedEntries.has(a);
    const bSelected = selectedEntries.has(b);

    // Dependency chunks load first because Apps Script receives stripped imports.
    if (aSelected !== bSelected) return aSelected ? 1 : -1;

    return a.localeCompare(b);
  });

  return generatedFiles.reduce((groups, generatedFile) => {
    const groupName = generatedFile.split("/")[0];
    groups[groupName] = groups[groupName] || [];
    groups[groupName].push(`${generatedFile}.html`);

    return groups;
  }, {});
}

function getSelectedEntries(config) {
  return new Set(
    (config.files || []).map((file) => {
      const src = typeof file === "string" ? file : file.src;
      const dist = typeof file === "string" ? config.outDir : file.dist || config.outDir;
      const extension = src.endsWith(".css") ? ".css" : ".js";

      return `${parse(dist).name}/${parse(src).name}${extension}`;
    })
  );
}

function createIncludeFile(groups) {
  const manifest = JSON.stringify(groups, null, 2);

  return `const BUILD_INCLUDES = ${manifest};

  /**
   * Includes any Apps Script HTML file by path.
   *
   * Existing templates can keep calling include("style.html") or include("script.html").
   * Generated build files can be included by path, for example include("library/id-address-builder.js").
   *
   * @param {string} filename Apps Script HTML filename or folder path.
   * @return {string}
   */
  function include(filename) {
    // const normalized = String(filename).replace(/\.html$/, ""); // if we want to allow omitting the .html extension in calls to include()
    return HtmlService.createHtmlOutputFromFile(String(filename)).getContent();
  }

  /**
   * Aggregates and returns built assets (scripts and styles) for a specific build group.
   * 
   * How it works: It looks up the file manifest in \`BUILD_INCLUDES\` for the specified type,
   * iterates through the file paths, fetches their HTML content via the \`include\` helper,
   * and categorizes them into script and style strings.
   * 
   * @param {"library"|"client"} [type="library"] - The build group key from BUILD_INCLUDES.
   * @returns {{scripts: string, styles: string}} An object containing concatenated HTML strings.
   * @throws {Error} Logs error to Logger if a file cannot be found or included.
   * 
   * @example
   * const assets = includeBuildFiles("client");
   * template.scripts = assets.scripts;
   * template.styles = assets.styles;
   */
  function includeBuildFiles(type = "library") {
    // Step 1: Initialize containers for the processed content.
    const scripts = [];
    const styles = [];

    try {
      // Step 2: Retrieve the list of files associated with the requested type.
      const files = BUILD_INCLUDES[type] || [];
      // Step 3: Iterate through each file path in the manifest.
      for (const file of files) {
        // Step 4: If it's a JavaScript partial, wrap content in script tags (handled by include).
        if (file.endsWith(".js.html")) {
          scripts.push(include(file));
        }
        // Step 5: If it's a CSS partial, wrap content in style tags (handled by include).
        if (file.endsWith(".css.html")) {
          styles.push(include(file));
        }
      }
      // Step 6: Return the joined strings for injection into the HTML template.
      return {
        scripts: scripts.join("\\n"),
        styles: styles.join("\\n"),
      };
    } catch (err) {
      Logger.log(\`Error processing include \${type} file: \${err}\`);

      return {
        scripts: "",
        styles: "",
      };
    }
  }`;
}

function ensureIndexIncludes(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing Apps Script index file: ${filePath}`);
  }

  let html = readFileSync(filePath, "utf-8");
  const libraryInclude = "     <?!= scripts ?>";
  const clientInclude = "    <?!= styles ?>";
  const baseTag = '<base target="_top" />';

  // Ensure generated client includes are present in the head.
  if (!html.includes(clientInclude.trim())) {
    if (html.includes("    <?!= include('style.html'); ?>")) {
      html = html.replace("    <?!= include('style.html'); ?>", clientInclude);
    } else if (html.includes(baseTag)) {
      html = html.replace(baseTag, `${baseTag}\n    ${clientInclude}`);
    }
  }

  // Ensure generated library includes are present in the body.
  if (!html.includes(libraryInclude.trim())) {
    if (html.includes("    <?!= include('script.html'); ?>")) {
      html = html.replace("    <?!= include('script.html'); ?>", libraryInclude);
    } else if (html.includes("</body>")) {
      html = html.replace("</body>", `    ${libraryInclude}\n  </body>`);
    }
  }

  writeFileSync(filePath, html);
  console.log(`index.html includes ensured -> ${filePath}`);
}
