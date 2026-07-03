/** @type {import("./id-address-adapter").IAddressAdapter} */
export const IAddressAdapterBase = {
  init() {
    console.info("IAddressBuilder Headless/Base Adapter Initialized");
  },

  setOptions() {},

  setSelectedOption() {},

  onLevelChange() {},

  onError() {},

  getValue() {
    return null;
  },

  clear() {},

  destroy() {},
};
