// Source-level public API entry for documentation tools such as JSDoc.
// The publishable package entry is generated at dist/library/index.js by npm run build:lib.

export { IdAddressBuilder, _isIAddressDetail } from "./src/id-address-builder.js";
export { IAddressAdapterBase } from "./src/id-address-adapter.base.js";
export { IAddressAdapterNative } from "./src/id-address-adapter.native.js";
export { IAddressAdapterSemanticUi } from "./src/id-address-adapter.semantic-ui.js";
export { createInputElement as createSemanticInputElement } from "./src/input-builder.semantic-ui.js";

export {
  createNativeInputElement,
  createNativeInputGroupElement,
  createNativeSelectElement,
  createNativeSwitchElement,
  createNativeTextareaElement,
} from "./src/input-builder.native.js";

export {
  __setErrorState,
  __setloadingState,
  setPlaceholderText,
} from "./src/id-address-adapter.js";
