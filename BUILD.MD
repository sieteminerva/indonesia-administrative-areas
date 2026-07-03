````md
# Build System & Architecture

IdAddressBuilder is designed as a **multi-target project**.

The same source code powers:

- an installable npm library
- a Google Apps Script deployment
- a standalone browser demo/public build

Instead of maintaining separate codebases for each environment, the project uses a single Vite configuration with mode-based builds.

This architecture allows:

- shared source logic across all targets
- adapter-based frontend rendering
- reusable Google Apps Script HTML partial generation
- publishable ES module output for npm
- standalone demo deployments for testing and documentation

The build pipeline is intentionally designed to support low-cost infrastructure workflows, especially Google Apps Script deployments backed by Google Sheets datasets.

---

# Why Google Apps Script?

Google Apps Script was chosen because it provides:

- free serverless hosting
- direct integration with Google Sheets
- easy deployment for non-backend developers
- extremely low operational cost
- rapid prototyping for internal tools and administrative systems

The project uses Apps Script as a lightweight REST microservice layer for Indonesian regional administrative data.

This approach removes the need for:

- dedicated database hosting
- backend infrastructure maintenance
- DevOps management
- paid API providers

The result is a system that can be deployed and maintained with minimal operational cost while still supporting large administrative datasets.

---

# Project Structure

```txt
.
├── src/                     # Main source code
├── apps-script/             # Google Apps Script project
├── dist/
│   ├── library/             # npm library output
│   └── public/              # public/demo build
├── build.config.json        # Multi-target build configuration
├── vite.config.js           # Mode-driven Vite configuration
├── include.postbuild.js     # GAS include generator
├── BUILD.MD
└── README.MD
```
````

---

# Build Philosophy

The build system is intentionally separated into multiple targets.

Each target solves a different deployment need:

| Target        | Purpose                       |
| ------------- | ----------------------------- |
| Library Build | npm package distribution      |
| GAS Build     | Google Apps Script deployment |
| Public Build  | Demo/testing/static hosting   |

This separation allows contributors to work on only the target they need without rebuilding everything.

---

# Commands

## Full Build

```bash
npm run build
```

Runs all build targets in sequence:

1. `npm run build:lib`
2. `npm run build:gas`
3. `npm run build:public`

Use this before publishing or preparing a release.

---

# Library Build

```bash
npm run build:lib
```

Runs:

```bash
vite build --mode lib
```

## What It Does

- Reads selected source files from `build.config.json`
- Builds standard ES modules
- Outputs files into `dist/library`
- Generates `.build-manifest.json`
- Generates `dist/library/index.js`
- Keeps Apps Script transforms disabled
- Skips public/demo assets

## Output

```txt
dist/library/
```

This output is used as the npm package entry.

Example package configuration:

```json
{
  "module": "./dist/library/index.js",
  "exports": {
    ".": {
      "import": "./dist/library/index.js"
    },
    "./styles.css": "./dist/library/styles.css"
  }
}
```

Do not edit generated files directly.

---

# Google Apps Script Build

```bash
npm run build:gas
```

Runs:

```bash
vite build --mode gas && npm run build:gas:include
```

## What It Does

- Reads source files from `build.config.json`
- Runs the custom Apps Script Vite plugin
- Converts JS into Apps Script HTML partials
- Converts CSS into `<style>` HTML partials
- Writes outputs into `apps-script/library`
- Writes generated styles into `apps-script/client`
- Generates build manifests
- Generates include helpers

## Output

```txt
apps-script/
```

Generated partials are designed for:

```html
<?!= include("filename.html"); ?>
```

Apps Script templating usage.

---

# Apps Script Include Postbuild

```bash
npm run build:gas:include
```

Runs:

```bash
node include.postbuild.js
```

## What It Does

- Reads `apps-script/.build-manifest.json`
- Generates `apps-script/include.js`
- Defines:

  - `include(filename)`
  - `includeBuildFiles(type = "library")`

This enables automatic loading of generated scripts/styles.

---

# Public Build

```bash
npm run build:public
```

Runs:

```bash
vite build --mode public
```

## What It Does

- Builds the standalone browser app/demo
- Uses standard Vite application flow
- Outputs to:

```txt
dist/public/
```

Useful for:

- demos
- playgrounds
- testing
- documentation hosting

---

# Development Server

```bash
npm run dev
```

Starts the Vite development server using the public/demo configuration.

---

# Preview

```bash
npm run preview
```

Serves the built public output locally.

---

# Build Configuration

Selected library and Apps Script inputs are controlled by:

```txt
build.config.json
```

Example:

```json
[
  {
    "src": "src/id-address-builder.js",
    "dist": "apps-script/library"
  },
  {
    "src": "src/input-builder.semantic-ui.js",
    "dist": "apps-script/library"
  },
  {
    "src": "src/styles.css",
    "dist": "apps-script/client",
    "library": false
  }
]
```

---

# Important Build Options

| Option             | Description                    |
| ------------------ | ------------------------------ |
| `format`           | Library output format          |
| `minify`           | Enables minification           |
| `preserveModules`  | Keeps module boundaries        |
| `htmlOutput`       | Enables GAS partial generation |
| `singleFileOutput` | Combines or splits GAS outputs |
| `files`            | Source entries for builds      |

---

# Output Summary

| Command                | Main Output    |
| ---------------------- | -------------- |
| `npm run build:lib`    | `dist/library` |
| `npm run build:gas`    | `apps-script/` |
| `npm run build:public` | `dist/public`  |
| `npm run build`        | All targets    |

---

# Publishing

Before publishing:

```bash
npm run build:lib
npm pack --dry-run
```

This verifies the exact files that will be published to npm.

---

# Google Apps Script Deployment

The Apps Script project can be deployed manually from the Apps Script editor or directly using:

[Google clasp](https://github.com/google/clasp?utm_source=chatgpt.com)

## Recommended Deployment Flow

Install clasp:

```bash
npm install -g @google/clasp
```

Login:

```bash
clasp login
```

Update:

```txt
.clasp.json
```

Example:

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "apps-script"
}
```

Then push:

```bash
clasp push
```

## `.claspignore`

You can control uploaded files using:

```txt
.claspignore
```

Example:

```txt
node_modules/**
dist/**
src/**
.vscode/**
```

This keeps the Apps Script deployment clean and lightweight.

---

# Apps Script Template Usage

Generated assets are injected into Apps Script templates:

```html
<head>
  <base target="_top" />
  <?!= styles ?>
</head>

<body>
  <?!= scripts ?>
</body>
```

Or programmatically:

```javascript
const assets = includeBuildFiles("client");
```

---

# Notes

- `vite.config.js` is mode-driven
- The Apps Script plugin should not run during normal library builds
- Missing files in `build.config.json` fail the build intentionally
- `build:gas:include` depends on a generated manifest from `build:gas`

---

# Design Goal

The build system exists to make one codebase deployable across:

- npm
- Google Apps Script
- browser demos

without duplicating source logic.

This enables a maintainable, low-cost architecture suitable for:

- internal enterprise systems
- administrative tools
- address normalization systems
- Google Workspace integrations
- small-to-medium scale SaaS applications
