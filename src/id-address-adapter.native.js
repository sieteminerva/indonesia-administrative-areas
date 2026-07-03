import { __setloadingState, __setErrorState } from "./id-address-adapter";

/** @type {import("./id-address-adapter").IAddressAdapter} */
export const IAddressAdapterNative = {
  init(el) {
    console.info("IAddressBuilder Native Adapter Initialized");
  },

  //@ts-ignore
  setOptions(/** @type {HTMLSelectElement|HTMLInputElement}*/ el, args) {
    const level = el.dataset.level;
    const { options = [], state = "complete", onLevelChange } = args;
    // console.log(`run [%s] > setOptions : <${state}>`, level, options);

    // create placeholder if none
    let placeholderEl = el instanceof HTMLSelectElement ? el.options[0] : el;
    if (!placeholderEl && el instanceof HTMLSelectElement) {
      placeholderEl = document.createElement("option");
      placeholderEl.classList.add("placeholder");
      el.add(placeholderEl, 1);
    }

    // remove any old options incrementally from the top except for placeholder
    if (el.tagName === "SELECT" && el instanceof HTMLSelectElement) {
      while (el.options.length > 1) {
        el.remove(1);
      }
    }

    // set loading state
    __setloadingState(el, level, state, placeholderEl);

    // Add options
    if (el.tagName === "INPUT" && el instanceof HTMLInputElement && state === "complete") {
      el.value = options?.[0][`${level}_name`];
    } else if (el.tagName === "SELECT" && el instanceof HTMLSelectElement && state === "complete") {
      for (const option of options) {
        const opt = document.createElement("option");
        opt.value = option[`${level}_id`];
        opt.textContent = option[`${level}_name`];
        // opt.id = `${level}-${option[`${level}_id`]}`;

        el.appendChild(opt);
      }
      // @ts-ignore
      el.__onLevelChange = onLevelChange;
    }
  },

  setSelectedOption(el, value) {
    const level = el.dataset.level;
    // console.log("run %s > setSelectedOption", level, value, typeof value);
    if (el.classList.contains("error")) el.classList.remove("error");
    el.value = value; // set value both input / select
    if (el.tagName === "SELECT" && el instanceof HTMLSelectElement) {
      const selectedOptEl = el.selectedOptions?.[0];
      selectedOptEl.setAttribute("selected", "");
      selectedOptEl.classList.add("active", "selected");
    }
  },

  onLevelChange(el) {
    const level = el.dataset.level;

    if (el.tagName === "SELECT" && el instanceof HTMLSelectElement) {
      const selectEl = /** @type {HTMLSelectElement & { __nativeChangeHandler?: (e: Event) => void }} */ (el);

      // prevent duplicate listeners
      if (selectEl.__nativeChangeHandler) {
        selectEl.removeEventListener("change", selectEl.__nativeChangeHandler);
      }

      selectEl.__nativeChangeHandler = (e) => {
        const selected = {
          [`${level}_id`]: Number(el.value),
          [`${level}_name`]: el.selectedOptions?.[0]?.textContent,
        };

        const selectedOptEl = el.selectedOptions?.[0];

        selectedOptEl?.setAttribute("selected", "");

        selectedOptEl?.classList.add("active", "selected");

        // @ts-ignore
        selectEl.__onLevelChange?.(el.value === "" ? null : selected);
      };

      selectEl.addEventListener("change", selectEl.__nativeChangeHandler);
    }
  },

  onError(el, message) {
    const level = el.dataset.level;
    el.classList.add("error");
    el.value = "";

    let placeholderEl = el.tagName === "SELECT" && el instanceof HTMLSelectElement ? el.options[0] : el;
    __setErrorState(el, level, message, placeholderEl);
  },

  getValue(el) {
    return el.value;
  },

  clear(el) {
    if (el.tagName === "SELECT" && el instanceof HTMLSelectElement) {
      let placeholder = el.options[0].cloneNode(true);
      placeholder.textContent = "Pilih " + el.dataset.level;
      el.innerHTML = "";
      el.appendChild(placeholder);
    }
    el.value = "";
    el.classList.remove("loading");
  },

  destroy(el) {
    // remove native listener
    if (el.__nativeChangeHandler) {
      el.removeEventListener("change", el.__nativeChangeHandler);

      delete el.__nativeChangeHandler;
    }

    // remove builder callback ref
    delete el.__onLevelChange;

    // remove helper flags
    delete el.__isDropdown;

    // cleanup UI state
    el.classList.remove("loading", "error", "active", "selected");
  },
};
