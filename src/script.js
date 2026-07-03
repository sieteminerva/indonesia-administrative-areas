import "./globals.js";
// import "fomantic-ui-css/semantic.min.css"; // Use this instead of dynamic CDN loading when bundling Semantic UI.
// import "fomantic-ui-css/semantic.min.js"; // Keep disabled for the native demo to avoid style conflicts.

//@ts-ignore
import "./styles.css";
import { IdAddressBuilder } from "./id-address-builder.js";
import { IAddressAdapterSemanticUi } from "./id-address-adapter.semantic-ui.js";
import { createInputElement } from "./input-builder.semantic-ui.js";
import {
  createNativeInputGroupElement,
  createNativeTextareaElement,
  createNativeSelectElement,
  createNativeSwitchElement,
  createNativeInputElement,
} from "./input-builder.native.js";

// const DEPLOYMENT_ID = /** @type {any} */ (import.meta).env.VITE_DEPLOYMENT_ID;
const DEPLOYMENT_ID = "AKfycbzdzw-gC7jnF3keqfJQOZn5Vvpc4GHxnVb_-Vr5OjSchdAB6TV60rnWAWhr2VAuUl0X_g";
const API_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

const SEMANTIC_CSS_ID = "semantic-ui-css";
const SEMANTIC_JS_ID = "semantic-ui-js";
const JQUERY_JS_ID = "jquery-script";

const AUTOCOMPLETE_BY_LEVEL = {
  propinsi: "address-level1",
  kota: "address-level2",
  kecamatan: "address-level3",
  kelurahan: "address-level4",
  kodepos: "postal-code",
};

/** @type {IdAddressBuilder|null} */
let picker = null;
let useAdapter = "native";
let geocode = false;
let renderToken = 0;

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".ui.container")) initApp();
});

/**
 * Bootstraps the demo container and renders both the configurator and address form.
 *
 * @returns {Promise<void>}
 */
export async function initApp() {
  const containerEl = /** @type {HTMLElement} */ (document.querySelector(".ui.container"));
  if (!containerEl) throw new Error("[Demo] .ui.container was not found");

  containerEl.id = "input-administrative-container";
  containerEl.classList.add("loading");
  containerEl.replaceChildren();

  loadConfigurator(containerEl);
  await loadInput(/** @type {"native"|"semantic-ui"} */ (useAdapter), geocode);
}

function createGeolocationInfoFieldset() {
  const fieldset = document.createElement("fieldset");

  const legend = document.createElement("legend");
  legend.textContent = "Geolocation Info";
  fieldset.appendChild(legend);

  const group = createNativeInputGroupElement(
    [
      { name: "latitude", readonly: true },
      { name: "longitude", readonly: true },
    ],
    "block"
  );

  fieldset.appendChild(group);

  const formattedAddress = createNativeTextareaElement("formatted-address");

  fieldset.appendChild(group);
  fieldset.appendChild(formattedAddress);

  return fieldset;
}

/**
 * Renders the demo controls that can rebuild the picker with different options.
 *
 * @param {HTMLElement} container - Demo root container.
 * @returns {void}
 */
function loadConfigurator(container) {
  const form = document.createElement("form");
  form.id = "input-administrative-configurator";
  form.classList.add("native", "form");

  const adapterSwitch = createNativeSelectElement("adapter", [
    { text: "Native", value: "native" },
    { text: "Semantic UI", value: "semantic-ui" },
  ]);

  const geolocationSwitch = createNativeSwitchElement({
    id: "geolocation",
    label: "Geolocation",
    checked: geocode,
    position: "left",
    shape: "square",
  });

  form.append(adapterSwitch, geolocationSwitch);
  container.prepend(form);

  form.querySelector("#geolocation").addEventListener("change", async (event) => {
    geocode = /** @type {HTMLInputElement} */ (event.target).checked;
    await loadInput(/** @type {"native"|"semantic-ui"} */ (useAdapter), geocode);
    console.log("%cGeolocation Enabled:", "color: red; text-transform: uppercase;", geocode);
    if (geocode) {
      const geoInfoFieldset = createGeolocationInfoFieldset();
      form.appendChild(geoInfoFieldset);
    } else {
      const geoInfoFieldset = form.querySelector("fieldset");
      if (geoInfoFieldset) geoInfoFieldset.remove();
    }
  });

  const adapterElement = /** @type {HTMLSelectElement} */ (form.querySelector("#adapter"));
  if (adapterElement) adapterElement.value = useAdapter;
  adapterElement.addEventListener("change", async (event) => {
    const selectedAdapter = /** @type {HTMLSelectElement} */ (event.target).value;
    console.log("%cSelected Adapter:", "color: red; text-transform: uppercase;", selectedAdapter);
    useAdapter = selectedAdapter;

    if (selectedAdapter === "semantic-ui") {
      await loadSemanticAssets();
    } else {
      unloadSemanticAssets();
    }

    if (useAdapter !== selectedAdapter) return;

    await loadInput(/** @type {"native"|"semantic-ui"} */ (selectedAdapter), geocode);
    console.log("%cUsed Adapter:", "color: red; text-transform: uppercase;", useAdapter);
  });
}

/**
 * Rebuilds the demo form and attaches a fresh IdAddressBuilder instance.
 *
 * The render token prevents older async toggle operations from replacing a newer
 * picker when the user switches adapter/geocode options quickly.
 *
 * @param {"native"|"semantic-ui"} adapterName - Adapter used by the new picker.
 * @param {boolean} geocodeEnabled - Whether geocode lookup should be enabled.
 * @returns {Promise<void>}
 */
async function loadInput(adapterName, geocodeEnabled = false) {
  const token = ++renderToken;
  const isNative = adapterName === "native";
  const containerEl = document.getElementById("input-administrative-container");
  if (!containerEl) throw new Error("[Demo] input-administrative-container was not found");

  document.getElementById("input-administrative")?.remove();
  containerEl.classList.add("loading");

  const form = document.createElement("form");
  form.id = "input-administrative";
  form.className = isNative ? "native form" : "ui form";
  form.append(...Object.values(isNative ? createNativeThemeInput() : createSemanticThemeInput()));
  containerEl.append(form);

  picker?.destroy();

  const nextPicker = new IdAddressBuilder({
    url: API_URL,
    container: form,
    useAdapter: adapterName,
    geocode: geocodeEnabled,
  });

  nextPicker.registerAdapter("semantic-ui", IAddressAdapterSemanticUi);
  nextPicker.config.useAdapter = adapterName;
  registerDemoLogging(nextPicker);
  nextPicker.init();

  if (token !== renderToken) {
    nextPicker.destroy();
    return;
  }

  picker = nextPicker;
  console.log("%cAvailable Adapters:", "color: red; text-transform: uppercase;", picker.adapters);
  window.setTimeout(() => {
    if (token === renderToken) containerEl.classList.remove("loading");
  }, 500);
}

/**
 * Registers console logging callbacks used to show IdAddressBuilder lifecycle events.
 *
 * @param {IdAddressBuilder} builder - Active demo builder instance.
 * @returns {void}
 */
function registerDemoLogging(builder) {
  builder.onLevelLoaded(async (schema, data, complete) => {
    if (complete() !== "complete") return;

    const level = schema.name;
    // console.log(schema);
    console.log(`Level loaded: %c${data.length} ${level}`, "color: red; text-transform: uppercase;");

    if (schema.adapterName !== "base" || data.length === 0) return;

    console.table(data);
    const firstItem = data[0];
    const nextParentId = firstItem?.[`${level}_id`];
    if (schema.next && nextParentId) await schema.next.load(nextParentId);
  });

  builder.onLevelChanged((schema, data) => {
    console.log(`Level changed: %c${schema.name}`, "color: red; text-transform: uppercase;");
    console.log("%cSelected:", "color: rgb(114, 93, 238);", data);
    console.log("%cDetail:", "color: rgb(114, 93, 238);", schema.getDetail());
  });

  builder.onGeocodeLoaded((schema, data) => {
    console.log("%cGeocode:", "color: rgb(114, 93, 238);", data);

    const fieldset = document.querySelector("#input-administrative-configurator fieldset");
    if (!fieldset) return;

    const latitude = fieldset.querySelector("#latitude");
    const longitude = fieldset.querySelector("#longitude");
    const formattedAddress = fieldset.querySelector("#formatted-address");

    if (latitude) /** @type {HTMLInputElement} */ (latitude).value = data?.latitude ?? "";
    if (longitude) /** @type {HTMLInputElement} */ (longitude).value = data?.longitude ?? "";
    if (formattedAddress)
      /** @type {HTMLTextAreaElement} */ (formattedAddress).value = data?.formatted_address ?? data?.formattedAddress ?? "";
  });
}

/**
 * Loads Fomantic/Semantic UI assets on demand for the Semantic adapter demo.
 *
 * @returns {Promise<void>}
 */
function loadSemanticAssets() {
  return new Promise((resolve, reject) => {
    if (document.getElementById(SEMANTIC_JS_ID)) {
      resolve();
      return;
    }

    if (!document.getElementById(SEMANTIC_CSS_ID)) {
      const link = document.createElement("link");
      link.id = SEMANTIC_CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/fomantic-ui/2.9.3/semantic.min.css";
      document.head.prepend(link);
    }

    const jqueryLoaded = document.querySelector("script[src*='jquery']");
    const jQueryPromise = new Promise((resolveJquery, rejectJquery) => {
      if (jqueryLoaded) {
        resolveJquery();
        return;
      }

      const jQueryScript = document.createElement("script");
      jQueryScript.id = JQUERY_JS_ID;
      jQueryScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js";
      jQueryScript.async = false;
      jQueryScript.onload = () => resolveJquery();
      jQueryScript.onerror = () => rejectJquery(new Error("[Demo] Failed to load JQuery script"));

      const firstScript = document.body.querySelector("script");
      if (firstScript) document.body.insertBefore(jQueryScript, firstScript);
      else document.body.appendChild(jQueryScript);
    });

    const semanticPromise = new Promise((resolveSemantic, rejectSemantic) => {
      const script = document.createElement("script");
      script.id = SEMANTIC_JS_ID;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/fomantic-ui/2.9.3/semantic.min.js";
      script.async = false;
      script.onload = () => resolveSemantic();
      script.onerror = () => rejectSemantic(new Error("[Demo] Failed to load Semantic UI assets"));

      jQueryPromise
        .then(() => {
          // Insert Semantic UI after jQuery to preserve plugin initialization order.
          const existingJquery = document.getElementById(JQUERY_JS_ID) || document.querySelector("script[src*='jquery']");
          if (existingJquery && existingJquery.parentNode) {
            existingJquery.parentNode.insertBefore(script, existingJquery.nextSibling);
          } else {
            document.body.appendChild(script);
          }
        })
        .catch(rejectSemantic);
    });

    Promise.all([jQueryPromise, semanticPromise])
      .then(() => resolve())
      .catch(reject);
  });
}

/**
 * Removes dynamically loaded Semantic UI assets before returning to native controls.
 *
 * @returns {void}
 */
function unloadSemanticAssets() {
  document.getElementById(SEMANTIC_CSS_ID)?.remove();
  document.getElementById(SEMANTIC_JS_ID)?.remove();
  document.getElementById(JQUERY_JS_ID)?.remove();
}

/**
 * Maps address levels to browser autocomplete tokens.
 *
 * @param {string} level - Address level key.
 * @returns {string}
 */
function getAutocompleteVal(level) {
  return AUTOCOMPLETE_BY_LEVEL[level] ?? "";
}

/**
 * Creates Semantic UI/Fomantic input elements for each address level.
 *
 * @returns {Record<string, HTMLElement>}
 */
function createSemanticThemeInput() {
  const createInputAdministrative = (type, level, style) => {
    const options = {
      type,
      title: level,
      placeholder: `Pilih ${level}`,
      config: {
        attributes: [
          { name: "data-level", value: level },
          { name: "autocomplete", value: getAutocompleteVal(level) },
        ],
      },
    };

    if (style) options.config.style = style;
    return createInputElement(options);
  };

  return Object.fromEntries(
    ["propinsi", "kota", "kecamatan", "kelurahan", "kodepos"].map((level) => [
      level,
      createInputAdministrative(level === "kodepos" ? "text" : "select", level, level === "kodepos" ? "icon" : null),
    ])
  );
}

/**
 * Creates native browser inputs for each address level.
 *
 * @returns {Record<string, HTMLElement>}
 */
function createNativeThemeInput() {
  return Object.fromEntries(
    ["propinsi", "kota", "kecamatan", "kelurahan", "kodepos"].map((level) => [
      level,
      level === "kodepos"
        ? createNativeInputElement(level, false)
        : createNativeSelectElement(level, [], getAutocompleteVal(level)),
    ])
  );
}
