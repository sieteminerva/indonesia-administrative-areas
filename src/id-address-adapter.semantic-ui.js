import { __setErrorState, __setloadingState } from "./id-address-adapter";

/** @type {import("./id-address-adapter").IAddressAdapter} */
export const IAddressAdapterSemanticUi = {
  init(el) {
    console.info("IAddressBuilder Semantic UI Adapter Initialized");
    // console.log("init element");
    if (el.__isDropdown) {
      $(el.parentElement).dropdown();
    }
  },

  setOptions(el, args = {}) {
    const level = el.dataset.level;
    const { options = [], state = "complete", onLevelChange } = args;
    // console.log(`run [%s] > setOptions : <${state}>`, level, options);

    // ✔ store callback so onLevelChange() can attach event later
    if (onLevelChange) {
      // @ts-ignore
      el.__onLevelChange = onLevelChange;
    }
    const wrapper = el.parentElement; // wrapper = .ui.dropdown
    // destroy previous instance so we can recreate safely
    $(wrapper).dropdown("destroy");
    // @ts-ignore
    const placeholderEl = el.__isDropdown ? wrapper.querySelector(".default.text") : el;

    // set loading state
    __setloadingState(wrapper, level, state, placeholderEl);

    // @ts-ignore
    if (options && !el.__isDropdown && state === "complete") {
      // just set input.value if level === kodepos, because it's  !__isDropdown
      el["value"] = options[0][`${level}_name`];
      return;
    }

    // prepare values for semantic dropdown api
    const values = options.map((o) => ({
      name: o[`${level}_name`],
      value: o[`${level}_id`],
    }));

    // initialize new dropdown with onChange wired to adapter callback
    $(wrapper).dropdown({
      values,
      onChange: (value, text, $selectedItem) => {
        const selected = {
          [`${level}_id`]: value,
          [`${level}_name`]: text,
        };
        // @ts-ignore
        el.__onLevelChange?.(el.value === "" ? null : selected);
      },
    });
  },

  setSelectedOption(el, value) {
    const level = el.dataset.level;
    // console.log("run %s > setSelectedOption", level, value, typeof value);
    $(el.parentElement).dropdown("set selected", value);
  },

  onLevelChange(el, callback) {
    const level = el.dataset.level;
    // console.log("run %s > onLevelChange", level);
    $(el.parentElement).dropdown({
      onChange: (value, text, $selectedItem) => {
        const selected = {
          [`${level}_id`]: value,
          [`${level}_name`]: text,
        };
        el.__onLevelChange?.(selected);
      },
    });
  },

  onError(el, message) {
    const level = el.dataset.level;
    const wrapper = el.parentElement;
    wrapper.classList.add("error");
    $(wrapper).dropdown("destroy");

    const placeholderEl = el.parentElement.querySelector(".text") ?? el;
    __setErrorState(el, level, message, placeholderEl);
  },

  getValue(el) {
    return $(el.parentElement).dropdown("get value");
  },

  clear(el) {
    const wrapper = el.parentElement;
    $(wrapper).dropdown("clear");
    el["value"] = "";
    $(wrapper).dropdown("change values", []);
    wrapper.classList.remove("loading");
  },

  destroy(el) {
    if ($(el.parentElement).dropdown) {
      $(el.parentElement).dropdown("destroy");
    }
  },
};
