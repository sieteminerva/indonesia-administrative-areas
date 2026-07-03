import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { basename, extname, join, parse, relative, resolve } from "path";

/**
 * @typedef {Object} IAppsScriptBuildConfig
 * @property {string} [name]
 * @property {string} [outDir]
 * @property {boolean} [minify]
 * @property {boolean} [comments]
 * @property {boolean} [preserveModules]
 * @property {"es" | "iife" | "umd" | "cjs"} [format]
 * @property {boolean} [htmlOutput]
 * @property {boolean} [singleFileOutput]
 * @property {Array<Object>} [options]
 * @property {Array<Object | string>} [files]
 */

/**
 *
 * @export
 * @param {string | IAppsScriptBuildConfig} configObj
 * @return {import("vite").Plugin}
 */
export function AppsScriptBuildPlugin(configObj = "build.config.json") {
  let buildConfig;

  if (typeof configObj === "string" && existsSync(resolve(process.cwd(), configObj))) {
    const configFile = resolve(process.cwd(), configObj);
    buildConfig = JSON.parse(readFileSync(configFile, "utf-8"));
  } else {
    buildConfig = configObj;
  }

  return {
    name: "apps-script-build-plugin",
    apply: "build",

    config(userConfig) {
      if (!buildConfig) return;

      const files = buildConfig.files || [];
      userConfig.esbuild = userConfig.esbuild || {};
      userConfig.build = userConfig.build || {};
      userConfig.build.minify = buildConfig.minify;
      userConfig.build.cssCodeSplit = true;
      userConfig.build.copyPublicDir = false;
      userConfig.esbuild.treeShaking = true;

      if (buildConfig.minify && buildConfig.format === "es") {
        userConfig.esbuild["minifyIdentifiers"] = false;
        userConfig.esbuild["keepNames"] = true;
      }

      userConfig.build.rollupOptions = userConfig.build.rollupOptions || {};
      userConfig.build.rollupOptions.output = userConfig.build.rollupOptions.output || {};

      // --- SINGLE FILE MODE --------------------------------------
      if (buildConfig.singleFileOutput) {
        userConfig.build.lib = {
          name: "SingleBundle",
          entry: files.reduce((acc, file) => {
            if (typeof file === "string") {
              acc[parse(file).name] = resolve(process.cwd(), file);
            } else {
              acc[parse(file.src).name] = resolve(process.cwd(), file.src);
            }
            return acc;
          }, {}),
          formats: [buildConfig.format || "es"],
        };

        userConfig.build.rollupOptions.output.manualChunks = () => "single-bundle-chunk";
      }
      // --- MULTI FILE MODE --------------------------------------
      else {
        if (buildConfig.preserveModules) {
          userConfig.build.rollupOptions.output.preserveModules = true;
        }

        userConfig.build.lib = {
          entry: files.reduce((acc, file) => {
            if (typeof file === "string") {
              acc[parse(file).name] = resolve(process.cwd(), file);
            } else {
              acc[parse(file.src).name] = resolve(process.cwd(), file.src);
            }
            return acc;
          }, {}),
          formats: [buildConfig.format || "es"],
        };
      }

      if (buildConfig.outDir) {
        userConfig.build.outDir = buildConfig.outDir;
      }

      return userConfig;
    },

    async writeBundle(options, bundle) {
      if (!buildConfig?.htmlOutput) return;

      const outDir = options.dir;
      const generatedFiles = [];

      // ========================================================================
      // === SINGLE FILE MODE ===================================================
      // ========================================================================
      if (buildConfig.singleFileOutput) {
        let finalJS = "";
        let finalCSS = "";

        for (const fileName in bundle) {
          const item = bundle[fileName];
          const abs = join(outDir, fileName);

          // JS chunks
          if (item.type === "chunk" && fileName.endsWith(".js")) {
            let code = readFileSync(abs, "utf-8");

            // skip entry wrappers
            const isWrapper = code.trim().match(/^(import .+;?\s*)+$/);
            if (isWrapper) {
              unlinkSync(abs);
              continue;
            }

            code = code
              .replace(/^import .*?;?$/gm, "")
              .replace(/export\s+\{[\s\S]*?\}(\s+from\s+['"].*?['"])?\s*;/g, "")
              .replace(/^\s*\n/gm, "");

            finalJS += code + "\n";
            unlinkSync(abs);
          }

          // CSS assets
          if (item.type === "asset" && fileName.endsWith(".css")) {
            const css = readFileSync(abs, "utf-8");
            finalCSS += css + "\n";
            unlinkSync(abs);
          }
        }

        const outputDir = resolve(
          process.cwd(),
          typeof buildConfig.files[0] === "object" ? buildConfig.files[0]?.dist : outDir || outDir
        );

        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        const jsOutFile = join(outputDir, `${buildConfig.name}.js.html`);
        const cssOutFile = join(outputDir, `${buildConfig.name}.css.html`);

        writeFileSync(jsOutFile, `<script>\n${finalJS.trim()}</script>`);
        writeFileSync(cssOutFile, `<style>\n${finalCSS.trim()}</style>`);
        generatedFiles.push(jsOutFile, cssOutFile);
        writeAppsScriptBuildManifest(generatedFiles);

        console.log(`✔ Single-file mode: JS & CSS HTML generated`);
        return;
      }

      // ========================================================================
      // === MULTIPLE FILE MODE (per-entry output) ==============================
      // ========================================================================

      for (const fileName in bundle) {
        const item = bundle[fileName];
        const abs = join(outDir, fileName);
        const outputBase = parse(fileName).name;

        // Find matching file entry from build.config.json
        const srcConfig = buildConfig.files.find((f) => {
          if (typeof f === "string") {
            return basename(f, extname(f)) === outputBase;
          } else {
            return basename(f.src, extname(f.src)) === outputBase;
          }
        });

        const fallbackDist = getFallbackDistDir(buildConfig, fileName, outDir);
        const distDir = resolve(process.cwd(), typeof srcConfig === "string" ? fallbackDist : srcConfig?.dist || fallbackDist);

        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // --- JS CHUNK → .html -------------------------------------------------
        if (item.type === "chunk" && fileName.endsWith(".js")) {
          let code = readFileSync(abs, "utf-8");

          // remove imports/exports for Apps Script
          code = code
            .replace(/^import .*?;?$/gm, "")
            .replace(/export\s+\{[\s\S]*?\}(\s+from\s+['"].*?['"])?\s*;/g, "")
            .replace(/^\s*\n/gm, "");

          const html = `<script>\n${code}\n</script>`;
          const outFile = join(distDir, `${outputBase}.js.html`);

          writeFileSync(outFile, html);
          generatedFiles.push(outFile);
          unlinkSync(abs);

          console.log(`✔ JS HTML created → ${outFile}`);
        }

        // --- CSS ASSET → .html ------------------------------------------------
        if (item.type === "asset" && fileName.endsWith(".css")) {
          const css = readFileSync(abs, "utf-8");

          const html = `<style>\n${css}\n</style>`;
          const outFile = join(distDir, `${outputBase}.css.html`);

          writeFileSync(outFile, html);
          generatedFiles.push(outFile);
          unlinkSync(abs);

          console.log(`✔ CSS HTML created → ${outFile}`);
        }
      }

      writeAppsScriptBuildManifest(generatedFiles);
    },
  };
}

function writeAppsScriptBuildManifest(files) {
  const appsScriptDir = resolve(process.cwd(), "apps-script");
  const manifestFile = join(appsScriptDir, ".build-manifest.json");
  const manifest = files
    .filter((file) => file.startsWith(appsScriptDir))
    .map((file) => relative(appsScriptDir, file).replace(/\\/g, "/").replace(/\.html$/, ""));

  // include.postbuild.js reads this manifest so stale Apps Script files are not
  // accidentally included after a source file is renamed or removed.
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}

function getFallbackDistDir(buildConfig, fileName, viteOutDir) {
  const isCss = fileName.endsWith(".css");
  const matchingFile = buildConfig.files.find((file) => {
    const src = typeof file === "string" ? file : file.src;
    return src && (isCss ? src.endsWith(".css") : !src.endsWith(".css"));
  });

  // Dependency chunks are not listed in build.config.json, so place them near
  // the first configured output of the same asset type instead of leaving them
  // in Vite's temporary directory.
  if (matchingFile && typeof matchingFile === "object" && matchingFile.dist) {
    return matchingFile.dist;
  }

  return buildConfig.outDir || viteOutDir;
}
