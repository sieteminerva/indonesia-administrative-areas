export function createNativeInputElement(level, readonly = false, autocompleteFn) {
  const field = document.createElement("div");
  field.classList.add("input-wrapper");
  field.innerHTML = `
      <label for="${level}">${level}</label>
      <input type="text" id="${level}" name="${level}" autocomplete="${autocompleteFn}" placeholder="Isi ${level} tujuan" data-level="${level}">
      <span class="spinner"></span>
    `;

  if (readonly) field.querySelector("input").readOnly = readonly;
  return field;
}

export function createNativeInputGroupElement(
  inputs = [
    { name: "", readonly: false },
    { name: "", readonly: false },
  ],
  display = "inline"
) {
  const templates = [];
  const field = document.createElement("div");
  field.classList.add("input-wrapper", "group");

  for (const input of inputs) {
    const fieldTemplate = `
      <label for="${input.name}">${input.name}</label>
      <input type="text" id="${input.name}" name="${input.name}" placeholder="Isi ${input.name} tujuan" ${
      input.readonly ? "readonly" : ""
    }>
      <span class="spinner"></span>`;

    templates.push(fieldTemplate);
  }

  field.innerHTML = templates.join("");
  if (display) field.dataset.display = display;
  return field;
}

export function createNativeSelectElement(level, options = [], autocompleteFn) {
  const field = document.createElement("div");
  field.classList.add("input-wrapper");
  field.innerHTML = `
      <label for="${level}">${level}</label>
      <select id="${level}" name="${level}" autocomplete="${autocompleteFn}" data-level="${level}">
        <option class="placeholder" value="">Pilih ${level}</option>
      </select>
    `;
  if (options.length) {
    const select = field.querySelector("select");
    for (const option of options) {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.text = option.text;
      select.appendChild(opt);
    }
  }
  return field;
}

/**
 * Creates a compact checkbox switch used by the demo configurator.
 *
 * @param {Object} options - Switch creation options.
 * @param {string} options.id - Input id and name.
 * @param {string} options.label - Visible switch label.
 * @param {boolean} options.checked - Initial checked state.
 * @param {"top"|"left"|"right"|"bottom"} [options.position="left"] - Label position around the switch.
 * @param {"round"|"square"} [options.shape="round"] - Slider shape.
 * @returns {HTMLDivElement}
 */
export function createNativeSwitchElement({ id, label, checked, position = "left", shape = "round" }) {
  const field = document.createElement("div");
  field.classList.add("input-wrapper", "toggle-switch");
  field.innerHTML = `
      <label data-position="${position}" for="${id}">${label}</label>
      <div class="control">
        <input id="${id}" name="${id}" type="checkbox"/>
        <span class="slider" data-shape="${shape}"></span>
      </div>`;
  field.querySelector("input").checked = checked;
  return field;
}

export function createNativeTextareaElement(level, readonly = true, autocompleteFn) {
  const field = document.createElement("div");
  field.classList.add("input-wrapper");
  field.innerHTML = `
    <label for="${level}">${level}</label>
    <textarea readonly="${readonly}" id="${level}" name="${level}" autocomplete="${autocompleteFn}" placeholder="Isi ${level} tujuan" data-level="${level}"></textarea>
  `;
  return field;
}
