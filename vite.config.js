import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, parse, relative, resolve } from "path";
import { defineConfig } from "vite";
import inject from "@rollup/plugin-inject";
import { AppsScriptBuildPlugin } from "./apps-script.build.plugin.js";

const BUILD_CONFIG_FILE = "build.config.json";

export default defineConfig(({ mode }) => {
  // The npm scripts pass --mode so one Vite config can produce each target.
  if (mode === "lib") return createLibraryConfig();
  if (mode === "gas") return createAppsScriptConfig();

  // Development and --mode public both use the normal browser/demo build.
  return createPublicConfig();
});
/** @returns {import('vite').UserConfig} */
function createLibraryConfig() {
  const buildConfig = readBuildConfig();
  const entries = createEntriesFromBuildConfig(buildConfig);

  return {
    plugins: [createInjectPlugin(), LibraryBuildManifestPlugin(buildConfig)],
    build: {
      // Keep publishable library files separate from the public demo build.
      outDir: "dist/library",
      emptyOutDir: true,
      copyPublicDir: false,
      cssCodeSplit: true,
      minify: buildConfig.minify ?? false,

      lib: {
        // build.config.json remains the source of truth for selected files.
        entry: entries,
        formats: [buildConfig.format || "es"],
        fileName: (format, entryName) => `${entryName}.${format}.js`,
      },
      rollupOptions: {
        output: {
          // Preserve module boundaries when the JSON config asks for it.
          preserveModules: Boolean(buildConfig.preserveModules),
        },
      },
    },
  };
}

function createAppsScriptConfig() {
  const buildConfig = readBuildConfig();

  return {
    plugins: [
      // This plugin rewrites the selected library files into Apps Script HTML partials.
      AppsScriptBuildPlugin(buildConfig),
      createInjectPlugin(),
    ],
    build: {
      // Temporary Vite output; the plugin writes final files into apps-script/*.
      outDir: "dist/apps-script-temp",
      emptyOutDir: true,
    },
  };
}

function createPublicConfig() {
  return {
    plugins: [createInjectPlugin()],
    build: {
      // Browser/demo output is isolated so it does not overwrite library artifacts.
      outDir: "dist/public",
      emptyOutDir: true,
    },
  };
}

/** @returns {import('vite').Plugin} */
function createInjectPlugin() {
  return inject({
    // Some demo/UI modules expect jQuery globals for Fomantic UI.
    jQuery: "jquery",
    $: "jquery",
    include: ["jquery", "fomantic-ui-css/semantic.min.css", "fomantic-ui-css/semantic.min.js"],
  });
}

function readBuildConfig() {
  const configFile = resolve(process.cwd(), BUILD_CONFIG_FILE);

  if (!existsSync(configFile)) {
    throw new Error(`Missing ${BUILD_CONFIG_FILE}; cannot determine selected build files.`);
  }

  return JSON.parse(readFileSync(configFile, "utf-8"));
}

function createEntriesFromBuildConfig(buildConfig) {
  return (buildConfig.files || []).reduce((entries, file) => {
    const src = typeof file === "string" ? file : file.src;

    if (!src) return entries;

    // Skip files marked with library: false in library mode
    if (typeof file === "object" && file.library === false) {
      return entries;
    }

    const sourceFile = resolve(process.cwd(), src);

    if (!existsSync(sourceFile)) {
      throw new Error(`Configured build file does not exist: ${src}`);
    }

    // Entry names become output file names, for example id-address-builder.es.js.
    entries[parse(src).name] = sourceFile;
    return entries;
  }, {});
}

/** @returns {import('vite').Plugin} */
function LibraryBuildManifestPlugin(buildConfig) {
  return {
    name: "library-build-manifest-plugin",
    apply: "build",

    writeBundle(options, bundle) {
      const outDir = options.dir || resolve(process.cwd(), "dist/library");
      const selectedEntries = createSelectedEntrySet(buildConfig);
      const manifest = createLibraryManifest(bundle, selectedEntries);

      // The manifest documents what the library build produced and feeds the
      // generated package entry below.
      writeFileSync(join(outDir, ".build-manifest.json"), JSON.stringify(manifest, null, 2));
      writeFileSync(join(outDir, "index.js"), createLibraryIndex(manifest));
    },
  };
}

function createSelectedEntrySet(buildConfig) {
  return new Set(
    (buildConfig.files || [])
      .map((file) => {
        if (typeof file === "string") return file;
        if (file.library === false) return null;
        return file.src;
      })
      .filter((src) => src?.endsWith(".js"))
      .map((src) => resolve(process.cwd(), src))
  );
}

function createLibraryManifest(bundle, selectedEntries) {
  const files = [];
  const entries = [];
  const assets = [];

  for (const [fileName, item] of Object.entries(bundle)) {
    files.push(fileName);

    if (item.type === "asset") {
      assets.push(fileName);
      continue;
    }

    if (item.type !== "chunk") continue;

    const sourceFile = item.facadeModuleId ? resolve(item.facadeModuleId) : null;
    const isSelectedEntry = Boolean(sourceFile && selectedEntries.has(sourceFile));

    if (isSelectedEntry) {
      entries.push({
        name: item.name,
        file: fileName,
        source: normalizePath(relative(process.cwd(), sourceFile)),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    outDir: "dist/library",
    entries,
    assets,
    files,
  };
}

function createLibraryIndex(manifest) {
  const exports = manifest.entries.map((entry) => `export * from "./${normalizePath(entry.file)}";`).join("\n");

  return `// Auto-generated by vite.config.js during npm run build:lib.
// Do not edit this file directly. Update build.config.json or source exports instead.

${exports}
`;
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}
