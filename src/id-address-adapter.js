/**
 * @typedef {Object} ISetOptionsParamsConfig
 * @property {Array<Object>} [options]
 * @property {"loading" |"start" | "ready" | "complete" | "empty" | "error"} [state]
 * @property {Function} [onLevelChange]
 */

/**
 * A function that sets options for a component.
 * @callback ISetOptionsFunction
 * @param {HTMLElement} element - The options to set.
 * @param {ISetOptionsParamsConfig} [config] - The optional theme name.
 * @returns {void}
 */

/**
 * @typedef {Object} IAddressAdapter
 * @property {Function} onLevelChange
 * @property {ISetOptionsFunction} setOptions
 * @property {Function} setSelectedOption
 * @property {Function} clear
 * @property {Function} [init]
 * @property {Function} [onError]
 * @property {Function} [getValue]
 * @property {Function} [destroy]
 * @property {Object} [selector]
 * @property {Object} [textContent]
 */

export const setPlaceholderText = (element, text) => {
  element.innerHTML = "";
  element && element.tagName === "INPUT" ? (element.placeholder = text) : (element.textContent = text);
  return element;
};

export function __setloadingState(el, level, state = "loading", placeholderEl = null) {
  if (state === "start") {
    el.classList.add("loading");
    setPlaceholderText(placeholderEl, `Loading ${level}...`);
  } else if (state === "complete") {
    el.classList.remove("error");
    el.classList.remove("loading");
    const text = level === "kodepos" ? "Isi kodepos tujuan" : `Pilih ${level}`;
    setPlaceholderText(placeholderEl, text);
  } else {
    el.classList.remove("loading");
  }
  return;
}

export function __setErrorState(el, level, message, placeholderEl = null) {
  el.classList.remove("loading");
  el.classList.add("error");
  setPlaceholderText(placeholderEl, `Terjadi kesalahan saat memuat ${level}`);
}
