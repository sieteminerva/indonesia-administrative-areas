export function mergeInputConfig(data, item, watchAttr = ["required", "multiple", "disabled", "checked"]) {
  const normalizedData = {};

  // Step 1: Normalize keys + convert "on" → true
  for (const key in data) {
    const parts = key.split("-");
    let newKey = "";
    let value = data[key];
    if (value === "on") value = true;
    if (parts[1] === "data") {
      newKey = parts.slice(1).join("-");
      normalizedData[newKey] = value;
    } else {
      newKey = parts[parts.length - 1];
      normalizedData[newKey] = value;
    }
  }

  // Step 2: Merge and clean up watchAttr
  const result = { ...item };

  // Add/override with normalized data
  for (const key in normalizedData) {
    result[key] = normalizedData[key];
  }

  // Step 3: Remove booleans in watchAttr if not present in form data
  for (const key of watchAttr) {
    if (!(key in normalizedData) && key in result) {
      delete result[key];
    }
  }

  return result;
}

/**
 * Convert Number to text 1-16 only refers to semantic-ui el wide
 * @param {number} number
 * @returns {string}
 */
export function numberToText(number) {
  const numberMap = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
    16: "sixteen",
  };

  if (number && typeof number !== "number") {
    throw Error("parameter must be a number");
  } else if (number && (number < 1 || number > 16)) {
    throw Error("number must be between 1 and 16 inclusive");
  } else if (!number) {
    return;
  } else {
    return numberMap[number];
  }
}

/**
 * Utility for building class-like strings with conditional chaining.
 */
class ToBeString {
  /**
   * @typedef {Object} ToBeStringOptions
   * @property {boolean} [ignoreDuplicate=false] - Ignore duplicate values.
   * @property {string} [separator=" "] - Separator between parts.
   * @property {string} [prefix=""] - String to prepend.
   * @property {string} [suffix=""] - String to append.
   */
  /**
   * @param {string} [base=""] - Initial base value.
   */
  constructor(base = "") {
    /** @private @type {string[]} */
    this.parts = [];
    /** @private @type {ToBeStringOptions} */
    this.settings = {
      ignoreDuplicate: false,
      separator: " ",
      prefix: "",
      suffix: "",
    };

    if (base) this.parts.push(base);
  }

  /**
   * Update configuration.
   * @param {ToBeStringOptions} options
   * @returns {this}
   */
  config(options = {}) {
    Object.assign(this.settings, options);
    return this;
  }

  /**
   * Conditionally add class(es).
   * @param {boolean|Object<string, boolean>|string} condition - If boolean, decides whether to add. If object, adds keys with truthy values.
   * @param {string|string[]} [className] - String or array of strings to add.
   * @returns {this}
   */
  add(condition, className) {
    if (typeof condition === "boolean" && condition && className) {
      if (Array.isArray(className)) {
        className.forEach((v) => this._push(v));
      } else {
        this._push(className);
      }
    } else if (typeof condition === "object" && condition !== null) {
      for (const [k, v] of Object.entries(condition)) {
        if (v) this._push(k);
      }
    } else if (typeof condition === "string" && !className) {
      this._push(condition);
    }
    return this;
  }

  /**
   * Conditionally add class(es) before the last added or even base .
   * @param {boolean|Object<string, boolean>|string} condition - If boolean, decides whether to add. If object, adds keys with truthy classNames.
   * @param {string|string[]} [className] - String or array of strings to add.
   * @returns {this}
   */
  insertBefore(condition, className) {
    if (typeof condition === "boolean" && condition && className) {
      if (Array.isArray(className)) {
        className.forEach((v) => this._unshift(v));
      } else {
        this._unshift(className);
      }
    } else if (typeof condition === "object" && condition !== null) {
      for (const [k, v] of Object.entries(condition)) {
        if (v) this._unshift(k);
      }
    } else if (typeof condition === "string" && !className) {
      this._unshift(condition);
    }
    return this;
  }

  /**
   * Merge in entire class strings.
   * @param {...string} strings - One or more strings containing classes.
   * @returns {this}
   */
  merge(...strings) {
    strings.forEach((str) =>
      str
        .split(/\s+/)
        .filter(Boolean)
        .forEach((v) => this._push(v))
    );
    return this;
  }

  /**
   * Finalize the builder and return string.
   * @param {string} [className] - Extra className to append before finalizing.
   * @returns {string}
   */
  end(className) {
    if (className) this._push(className);
    return this._build();
  }

  /**
   * Convert to lowercase string.
   * @returns {string}
   */
  toLowerCase() {
    return this._build().toLowerCase();
  }

  /**
   * Convert to uppercase string.
   * @returns {string}
   */
  toUpperCase() {
    return this._build().toUpperCase();
  }

  /**
   * Convert to camelCase string.
   * @returns {string}
   */
  toCamelCase() {
    const arr = this._build().split(this.settings.separator);
    return arr.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
  }

  /**
   * Convert to Sentence case string.
   * @returns {string}
   */
  toSentenceCase() {
    const str = this._build().toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** @private */
  _push(val) {
    if (!val) return;
    if (this.settings.ignoreDuplicate && this.parts.includes(val)) return;
    this.parts.push(val);
  }

  /** @private */
  _unshift(val) {
    if (!val) return;
    if (this.settings.ignoreDuplicate && this.parts.includes(val)) return;
    this.parts.unshift(val);
  }

  /** @private */
  _build() {
    return (
      this.settings.prefix + this.parts.join(this.settings.separator).replace(/\s+/g, " ").trim() + this.settings.suffix
    );
  }
}

/**
 * Factory helper for convenience.
 * @param {string} [base=""]
 * @returns {ToBeString}
 */
export function toBeString(base = "") {
  return new ToBeString(base);
}

function mutationObserver(condition) {
  const observer = new MutationObserver((mutations) => {
    if (condition) {
      observer.disconnect(); // stop watching once initialized
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Truncate a filename so the total length (including extension) is at most maxLength.
 * If truncation happens, the returned string WILL have length === maxLength.
 *
 * @param {string} name - full filename, e.g. "very long name.mp3"
 * @param {number} maxLength - desired max length (positive integer)
 * @param {string} marker - truncation marker to show in the middle (default "(..)")
 * @returns {string}
 */
export function truncateText(name, maxLength = 20, marker = "..") {
  if (typeof name !== "string") return name;
  if (!Number.isInteger(maxLength) || maxLength <= 0) return "";

  // If already fits, return as-is
  if (name.length <= maxLength) return name;

  const dotIndex = name.lastIndexOf(".");
  const hasExt = dotIndex > 0; // dot at position 0 is not an extension
  const base = hasExt ? name.slice(0, dotIndex) : name;
  const ext = hasExt ? name.slice(dotIndex) : "";
  const extLen = ext.length;

  // If the extension alone is longer or equal than maxLength, return the last maxLength chars
  if (extLen >= maxLength) {
    return name.slice(-maxLength);
  }

  const markerLen = marker.length;
  // number of base chars we can keep before the marker
  const prefixLen = maxLength - markerLen - extLen;

  if (prefixLen > 0) {
    const keep = 3; // keep 3 last chars before .ext
    const suffix = base.slice(-keep);
    const prefix = base.slice(0, prefixLen - suffix.length);

    return prefix + marker + suffix + ext;
  }

  // Not enough room for full marker + any base char.
  // Build a truncated marker so (truncatedMarker.length + extLen) === maxLength
  const truncatedMarkerLen = Math.max(0, maxLength - extLen);
  const truncatedMarker = marker.slice(0, truncatedMarkerLen);
  return truncatedMarker + ext;
}
