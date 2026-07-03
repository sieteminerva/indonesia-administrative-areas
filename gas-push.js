import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join, resolve } from "path";
import dotenv from "dotenv";

const repoRoot = resolve(process.cwd());
const stagingRoot = join(repoRoot, "dist", "apps-script-temp");
const sourceClaspJson = join(repoRoot, ".clasp.json");
const stagedClaspJson = join(stagingRoot, ".clasp.json");
const sourceAppsScript = join(repoRoot, "apps-script");
const stagedAppsScript = join(stagingRoot, "apps-script");

function removeStaging() {
  if (existsSync(stagingRoot)) {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function replaceEnvPlaceholders(value, envVars) {
  if (typeof value !== "string") return value;

  return value.replace(/import\.meta\.env\.VITE_[A-Z0-9_]+/g, (match) => {
    const key = match.replace("import.meta.env.", "");
    return Object.prototype.hasOwnProperty.call(envVars, key) ? envVars[key] : match;
  });
}

function replaceJsonValues(obj, envVars) {
  if (obj === null || typeof obj !== "object") {
    return replaceEnvPlaceholders(obj, envVars);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceJsonValues(item, envVars));
  }

  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, replaceJsonValues(value, envVars)]));
}

function replaceTextFile(filePath, envVars) {
  const content = readFileSync(filePath, "utf-8");
  const replaced = content.replace(/import\.meta\.env\.VITE_[A-Z0-9_]+/g, (match) => {
    const key = match.replace("import.meta.env.", "");
    return Object.prototype.hasOwnProperty.call(envVars, key) ? envVars[key] : match;
  });

  if (replaced !== content) {
    writeFileSync(filePath, replaced, "utf-8");
  }
}

function replaceEnvInDirectory(dirPath, envVars) {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      replaceEnvInDirectory(entryPath, envVars);
      continue;
    }

    if ([".js", ".html", ".json"].some((ext) => entry.name.endsWith(ext))) {
      replaceTextFile(entryPath, envVars);
    }
  }
}

function main() {
  if (!existsSync(sourceClaspJson)) {
    throw new Error("Missing .clasp.json in repository root.");
  }

  console.log("Cleaning staging directory...");
  removeStaging();
  mkdirSync(stagingRoot, { recursive: true });

  console.log("Building GAS output...");
  execSync("npm run build:gas", {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env },
  });

  console.log("Copying apps-script output into staging...");
  if (!existsSync(sourceAppsScript)) {
    throw new Error("apps-script folder does not exist after build:gas.");
  }
  cpSync(sourceAppsScript, stagedAppsScript, { recursive: true, force: true });

  console.log("Generating staged .clasp.json and replacing env in staged files...");
  const envConfig = dotenv.config({ path: join(repoRoot, ".env") });
  const envVars = envConfig.parsed || {};
  const claspData = JSON.parse(readFileSync(sourceClaspJson, "utf-8"));
  const stagedClaspData = replaceJsonValues(claspData, envVars);
  writeFileSync(stagedClaspJson, JSON.stringify(stagedClaspData, null, 2), "utf-8");

  replaceEnvInDirectory(stagingRoot, envVars);

  console.log("Running clasp push from staging...");
  execSync("clasp push", {
    cwd: stagingRoot,
    stdio: "inherit",
    env: { ...process.env },
  });

  console.log("Cleaning staging directory...");
  removeStaging();
  console.log("gas:push complete.");
}

main();
