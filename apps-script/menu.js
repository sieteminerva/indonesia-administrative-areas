function onOpen() {
  createTopMenu();
}

function createTopMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Custom Menu").addItem("Show Form Input", "openSidebarForm").addToUi();
}

function openSidebarForm() {
  const template = HtmlService.createTemplateFromFile("index");

  const libraries = includeBuildFiles("library");
  const clients = includeBuildFiles("client");

  template.scripts = [libraries.scripts, clients.scripts].join("\n");

  template.styles = [libraries.styles, clients.styles].join("\n");

  const html = template.evaluate();

  html.setTitle("Form");

  SpreadsheetApp.getUi().showSidebar(html);
}
