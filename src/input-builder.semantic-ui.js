import { numberToText, toBeString } from "./helper";

export function createInputElement(inputObj) {
  // console.log(`[inputObj]`, inputObj.config);
  const defaultConfig = {
    type: "text",
    id: "",
    title: "",
    placeholder: "",
    rows: 3,
    multiple: false,
    disabled: false,
    required: false,
    checked: false,
    readonly: false,
    config: {
      attributes: [],
      style: "",
      field: "field",
      class: "",
      options: [],
      position: "",
      icon: "",
      content: "",
      wide: null,
      useLabel: true,
    },
  };

  // deep merge
  inputObj = {
    ...defaultConfig,
    ...inputObj,
    config: { ...defaultConfig.config, ...inputObj.config },
  };

  let elementId = "";

  // --- Helpers ---
  function _applyCommonAttributes(el, id, obj) {
    el.id = id;
    el.name = id;
    if (obj.placeholder) el.setAttribute("placeholder", obj.placeholder);
    if (obj.disabled) el.setAttribute("disabled", "");
    if (obj.readonly) el.setAttribute("readonly", "readonly");
    if (obj.required) el.setAttribute("required", "");
    if (obj.multiple) el.setAttribute("multiple", "");
    if (obj.value) el.value = obj.value;
    _applyDataAttributes(el, inputObj);
    return el;
  }

  function _applyDataAttributes(el, obj) {
    if (Array.isArray(obj.config.attributes) && obj.config.attributes.length > 0) {
      obj.config.attributes.forEach((attr) => {
        el.setAttribute(attr.name, attr.value);
        // el.dataset[attr.name] = attr.value;
      });
    }
  }

  // Generate elementId
  if (!inputObj.id) {
    if (!inputObj.title) {
      const randomSuffix = Math.random().toString(36).substring(7);
      elementId = `input-${randomSuffix}`;
    } else {
      elementId = inputObj.title
        .toLowerCase()
        .split(/[\s_]+/)
        .join("-");
    }
  } else {
    elementId = inputObj.id;
  }

  // Default placeholder
  if (inputObj.title && !inputObj.placeholder) {
    if (inputObj.type === "select" || (inputObj.type === "radio" && inputObj.config.style === "dynamic")) {
      inputObj.placeholder = `Select the ${inputObj.title.toLowerCase()} option`;
    } else {
      inputObj.placeholder = `Enter ${inputObj.title} value`;
    }
  }

  // Normalize options: if string[] convert to {value,label}
  if (Array.isArray(inputObj.config.options)) {
    if (inputObj.config.options.every((o) => typeof o === "string")) {
      inputObj.config.options = inputObj.config.options.map((o) => ({
        value: o,
        label: o,
      }));
    }
  }

  // --- Builders ---
  const builders = {
    default: () => {
      const wrapperEl = document.createElement("div");
      wrapperEl.className = toBeString("ui")
        .add(inputObj.config.position)
        .add(inputObj.config.style)
        .add(inputObj.config.class)
        .end("input");

      const inputEl = document.createElement("input");
      inputEl.type = inputObj.type;
      _applyCommonAttributes(inputEl, elementId, inputObj);

      wrapperEl.appendChild(inputEl);

      let styleElement = null;

      if (inputObj.config.style === "icon") {
        styleElement = document.createElement("i");
        styleElement.className = `${inputObj.config.icon} icon`;
      } else if (inputObj.config.style === "action") {
        styleElement = document.createElement("button");
        styleElement.className = "ui button";
        styleElement.style.minWidth = "80px";
        styleElement.style.justifyContent = "center";
        styleElement.innerHTML = inputObj.config.content || "Action";
      } else if (inputObj.config.style === "labeled") {
        styleElement = document.createElement("div");
        styleElement.className = "ui label";
        styleElement.innerHTML = inputObj.config.content || "Label";
      }
      if (styleElement) {
        if (inputObj.config.position === "left") {
          wrapperEl.insertBefore(styleElement, inputEl);
        } else {
          wrapperEl.appendChild(styleElement);
        }
      }

      return wrapperEl;
    },

    textarea: () => {
      const wrapperEl = document.createElement("div");
      wrapperEl.className = toBeString("ui").add(inputObj.config.position).add(inputObj.config.style).end("input");
      const textareaEl = document.createElement("textarea");
      _applyCommonAttributes(textareaEl, elementId, inputObj);
      if (inputObj.rows) textareaEl.rows = inputObj.rows;
      if (inputObj.cols) textareaEl.cols = inputObj.cols;

      wrapperEl.appendChild(textareaEl);

      return wrapperEl;
    },

    select: () => {
      let wrapperEl = null;
      const dropdownEl = document.createElement("div");
      dropdownEl.id = elementId;

      dropdownEl.className = toBeString("ui fluid")
        .add(inputObj.multiple, "multiple")
        .add(inputObj.readonly, "readonly")
        .add(inputObj.disabled, "disabled")
        // integrated to inputObj.config.style
        .add(inputObj.config?.style !== null, inputObj.config.style || "search")
        .end("selection dropdown");

      const inputEl = document.createElement("input");
      inputEl.name = elementId;
      inputEl.type = "hidden";

      _applyCommonAttributes(inputEl, elementId, inputObj);

      dropdownEl.appendChild(inputEl);

      const iconEl = document.createElement("i");
      iconEl.className = "dropdown icon";
      dropdownEl.appendChild(iconEl);

      const defaultTextEl = document.createElement("div");
      defaultTextEl.className = "default text";
      defaultTextEl.textContent = inputObj.placeholder;
      dropdownEl.appendChild(defaultTextEl);

      const menuEl = document.createElement("div");
      menuEl.className = "menu";

      if (inputObj.config.options && inputObj.config.options.length) {
        for (const option of inputObj.config.options) {
          const itemEl = document.createElement("div");
          itemEl.className = "item";
          itemEl.dataset.value = option.value;
          itemEl.textContent = option.label;
          if (option.icon) {
            const iconEl = document.createElement("i");
            iconEl.className = option.icon;
            itemEl.prepend(iconEl);
          }
          if (inputObj.value && inputObj.value === option.value) {
            itemEl.className = "item active selected";
          }
          menuEl.appendChild(itemEl);
        }
      } else if (inputObj.config.style === "dynamic") {
        menuEl.innerHTML = `
          <!-- ${inputObj.title} Select items -->
          <? var data = getValuesByRangeName(${inputObj.range}); for (var i = 0; i < data.length; i++) { ?>
            <div class="item" data-value="<?= data[i] ?>"><?= data[i] ?></div>
          <? } ?>
        `;
      }

      dropdownEl.appendChild(menuEl);

      if (inputObj.config.style === "action") {
        wrapperEl = document.createElement("div");
        wrapperEl.className = "ui action input";
        const buttonEl = document.createElement("button");
        buttonEl.className = "ui button";
        buttonEl.textContent = inputObj.config.content || "Action";
        wrapperEl.appendChild(dropdownEl);
        wrapperEl.appendChild(buttonEl);
      } else {
        wrapperEl = dropdownEl;
      }

      return wrapperEl;
    },

    radio: () => {
      const wrapperEl = document.createElement("div");
      wrapperEl.className = "grouped fields";

      if (inputObj.config.options && inputObj.config.options.length) {
        inputObj.config.options.forEach((option, i) => {
          const fieldEl = document.createElement("div");
          fieldEl.className = "field";

          const radioEl = document.createElement("div");
          radioEl.className = "ui radio checkbox";

          const inputEl = document.createElement("input");
          inputEl.type = "radio";
          inputEl.name = elementId;
          inputEl.value = option.value;
          if (option.value || i === 0) inputEl.setAttribute("checked", "");

          const radioLabelEl = document.createElement("label");
          radioLabelEl.textContent = option.label;

          radioEl.appendChild(inputEl);
          radioEl.appendChild(radioLabelEl);
          fieldEl.appendChild(radioEl);
          wrapperEl.appendChild(fieldEl);
        });
      } else if (inputObj.config.style === "dynamic") {
        wrapperEl.innerHTML = `
          <!-- ${inputObj.title} Radio items -->
          <? var data = getValuesByRangeName(${inputObj.range}); for (var i = 0; i < data.length; i++) { ?>
            <div class="field ${inputObj.required ? "required" : ""}">
              <div id="${elementId}-<?= i ?>" class="ui radio checkbox">
                <input type="radio" name="${elementId}" value="<?= data[i] ?>" <?= i === 0 ? "checked" : "" ?>>
                <label><?= data[i] ?></label>
              </div>
            </div>
          <? } ?>
        `;
      } else {
        wrapperEl.className = "ui radio checkbox";
        wrapperEl.id = elementId;
        const radioEl = document.createElement("input");
        radioEl.type = "radio";
        radioEl.name = elementId;
        if (inputObj.disabled) radioEl.setAttribute("disabled", "");
        if (inputObj.value || inputObj.checked) radioEl.setAttribute("checked", "");
        const radioLabelEl = document.createElement("label");
        radioLabelEl.textContent = inputObj.title;

        wrapperEl.appendChild(radioEl);
        wrapperEl.appendChild(radioLabelEl);
      }

      return wrapperEl;
    },

    checkbox: () => {
      const wrapperEl = document.createElement("div");
      wrapperEl.id = elementId;
      wrapperEl.className = toBeString("ui").add(inputObj.config.style).add(inputObj.checked, "checked").end("checkbox");

      const inputEl = document.createElement("input");
      inputEl.type = "checkbox";
      inputEl.name = elementId;
      _applyCommonAttributes(inputEl, elementId, inputObj);
      if (inputObj.value || inputObj.checked) inputEl.setAttribute("checked", "");

      const textEl = document.createElement("label");
      textEl.textContent = inputObj.title;

      wrapperEl.appendChild(inputEl);
      wrapperEl.appendChild(textEl);

      return wrapperEl;
    },

    file: () => {
      const wrapperEl = document.createElement("div");
      wrapperEl.className = "ui input";

      const inputEl = document.createElement("input");
      inputEl.type = "file";
      inputEl.name = elementId;
      inputEl.id = elementId;
      _applyCommonAttributes(inputEl, elementId, inputObj);
      if (inputObj.accept) inputEl.setAttribute("accept", inputObj.accept);
      // custom attribute coresponds to FileUploader
      inputEl.dataset.uploader = "";
      if (inputObj.config.view || inputObj["data-view"])
        inputEl.dataset.view = inputObj.config.view || inputObj["data-view"];
      if (inputObj.config.thumbnail || inputObj["data-thumbnail"])
        inputEl.dataset.thumbnail = inputObj.config.thumbnail || inputObj["data-thumbnail"];
      if (inputObj.config.maxUpload || inputObj["data-max-upload"])
        inputEl.dataset.maxUpload = inputObj.config.maxUpload || inputObj["data-max-upload"];
      if (inputObj.config.maxFileSize || inputObj["data-max-size"])
        inputEl.dataset.maxFileSize = inputObj.config.maxFileSize || inputObj["data-max-size"];
      if (inputObj.config.groupUnallowed || inputObj["data-group-unallowed"])
        inputEl.dataset.groupUnallowed = inputObj.config.groupUnallowed || inputObj["data-group-unallowed"];

      wrapperEl.appendChild(inputEl);

      return wrapperEl;
    },
  };

  // --- choose builder dynamically ---
  const builder = builders[inputObj.type] || builders.default;
  const resultEl = builder();

  const fieldEl = document.createElement("div");
  fieldEl.className = toBeString("field")
    .insertBefore(inputObj.config.wide !== null, `${numberToText(inputObj.config.wide)} wide`)
    .add(inputObj.required, "required")
    .end("");

  if (inputObj.title && inputObj.config.useLabel) {
    const labelEl = document.createElement("label");
    labelEl.setAttribute("for", elementId);
    labelEl.textContent = inputObj.title;
    fieldEl.appendChild(labelEl);
  }

  fieldEl.appendChild(resultEl);

  if (inputObj.info) {
    const infoEl = document.createElement("div");
    infoEl.className = "ui text info";
    infoEl.innerHTML = inputObj.info;
    fieldEl.appendChild(infoEl);
  }

  return fieldEl;
}
