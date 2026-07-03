const BUILD_INCLUDES = {
  "library": [
    "library/helper.js.html",
    "library/id-address-adapter.base.js.html",
    "library/id-address-adapter.js.html",
    "library/id-address-adapter.native.js.html",
    "library/id-address-adapter.semantic-ui.js.html",
    "library/id-address-builder.js.html",
    "library/input-builder.native.js.html",
    "library/input-builder.semantic-ui.js.html"
  ],
  "client": [
    "client/script.js.html",
    "client/styles.css.html"
  ]
};

  /**
   * Includes any Apps Script HTML file by path.
   *
   * Existing templates can keep calling include("style.html") or include("script.html").
   * Generated build files can be included by path, for example include("library/id-address-builder.js").
   *
   * @param {string} filename Apps Script HTML filename or folder path.
   * @return {string}
   */
  function include(filename) {
    // const normalized = String(filename).replace(/.html$/, ""); // if we want to allow omitting the .html extension in calls to include()
    return HtmlService.createHtmlOutputFromFile(String(filename)).getContent();
  }

  /**
   * Aggregates and returns built assets (scripts and styles) for a specific build group.
   * 
   * How it works: It looks up the file manifest in `BUILD_INCLUDES` for the specified type,
   * iterates through the file paths, fetches their HTML content via the `include` helper,
   * and categorizes them into script and style strings.
   * 
   * @param {"library"|"client"} [type="library"] - The build group key from BUILD_INCLUDES.
   * @returns {{scripts: string, styles: string}} An object containing concatenated HTML strings.
   * @throws {Error} Logs error to Logger if a file cannot be found or included.
   * 
   * @example
   * const assets = includeBuildFiles("client");
   * template.scripts = assets.scripts;
   * template.styles = assets.styles;
   */
  function includeBuildFiles(type = "library") {
    // Step 1: Initialize containers for the processed content.
    const scripts = [];
    const styles = [];

    try {
      // Step 2: Retrieve the list of files associated with the requested type.
      const files = BUILD_INCLUDES[type] || [];
      // Step 3: Iterate through each file path in the manifest.
      for (const file of files) {
        // Step 4: If it's a JavaScript partial, wrap content in script tags (handled by include).
        if (file.endsWith(".js.html")) {
          scripts.push(include(file));
        }
        // Step 5: If it's a CSS partial, wrap content in style tags (handled by include).
        if (file.endsWith(".css.html")) {
          styles.push(include(file));
        }
      }
      // Step 6: Return the joined strings for injection into the HTML template.
      return {
        scripts: scripts.join("\n"),
        styles: styles.join("\n"),
      };
    } catch (err) {
      Logger.log(`Error processing include ${type} file: ${err}`);

      return {
        scripts: "",
        styles: "",
      };
    }
  }