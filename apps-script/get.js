/**
 * Maps the logical level name to the corresponding sheet name and column letters.
 * NOTE: Column letters (A, B, C) are based on the assumption that:
 * A = ID, B = Name, C = Parent ID, etc. Adjust these letters to match your sheet structure.
 */
function _getMapping(level) {
  switch (level.toLowerCase()) {
    case "propinsi":
      // propinsi_id (A), propinsi_name (B)
      return { sheetName: "propinsi", idCol: "A", nameCol: "B", parentCol: null };
    case "kota":
      // kota_id (A), kota_name (B), propinsi_id (C)
      return { sheetName: "kota", idCol: "A", nameCol: "B", parentCol: "C" };
    case "kecamatan":
      // kecamatan_id (A), kecamatan_name (B), kota_id (C)
      return { sheetName: "kecamatan", idCol: "A", nameCol: "B", parentCol: "C" };
    case "kelurahan":
      // kelurahan_id (A), kelurahan_name (B), kecamatan_id (C)
      return { sheetName: "kelurahan", idCol: "A", nameCol: "B", parentCol: "C" };
    case "kodepos":
      // kodepos_id (A), kodepos_name (B), kelurahan_id (C)
      return { sheetName: "kodepos", idCol: "A", nameCol: "B", parentCol: "C" };
    case "detail":
      // Search 'detail' sheet by kodepos_name (Column B) and select all detail columns.
      // Assuming 'detail' sheet structure:
      // B: kodepos_name | D: kelurahan_name | F: kecamatan_name | H: kota_name | J: propinsi_name
      return {
        sheetName: "detail",
        filterCol: "B", // Column to filter by (kodepos_name)
        selectCols: "B, C, D, E, F, G, H, I, J", // Columns to return
      };
    default:
      return {};
  }
}

/**
 * Executes the Gviz query via UrlFetchApp.
 * Adds muteHttpExceptions: true to handle non-200 responses gracefully.
 * @param {string} spreadsheetId The ID of the spreadsheet.
 * @param {string} sheetName The name of the sheet (tab) to query.
 * @param {string} query The TQ query string.
 * @returns {Array<Object>} The parsed data array.
 */
function _fetchDataFromGviz(spreadsheetId, sheetName, query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}&tq=${encodedQuery}`;

  const options = {
    // Crucial to prevent script execution from stopping on 401 or 404 errors
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);

  // Check the response code immediately
  if (response.getResponseCode() !== 200) {
    throw new Error(
      `Gviz query failed with code ${response.getResponseCode()}. Check spreadsheet sharing permissions (must be 'Anyone with the link').`
    );
  }

  return _parseGvizResponse(response.getContentText());
}

/**
 * Parses the raw Gviz response format (which is JSONP-like) into a clean array of objects.
 * (Implementation is complex and assumed to be a working utility function in your project.)
 */
function _parseGvizResponse(rawText) {
  // This is a placeholder for your existing utility to parse the Gviz JSONP format.
  // It should strip the 'google.visualization.Query.setResponse(' prefix/suffix
  // and map the columns/rows into an array of objects.

  // Example implementation idea:
  // Use a more robust regex to handle various script formats
  const match = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!match || match.length < 2) {
    // If parsing fails, try to return the raw content if it looks like plain JSON
    try {
      return JSON.parse(rawText);
    } catch (e) {
      throw new Error("Failed to parse Gviz response. Received non-JSON content.");
    }
  }

  const jsonString = match[1];
  const responseJson = JSON.parse(jsonString);
  const cols = responseJson.table.cols;
  const rows = responseJson.table.rows;
  const data = [];

  rows.forEach((row) => {
    const item = {};
    row.c.forEach((cell, i) => {
      // Use the column label (header text) as the key if available
      // Otherwise, use the column ID (e.g., A, B, C)
      const key = cols[i].label || cols[i].id;
      if (cell && cell.v !== null) {
        item[key] = cell.v;
      }
    });
    data.push(item);
  });

  return data;
}

/**
 * --- NEW UTILITY FUNCTION FOR ID-TO-NAME LOOKUP ---
 * Maps the desired lookup property (e.g., 'propinsi_id') to its sheet, ID column, and Name column.
 * Assumes ID is column A and Name is column B in all single-level sheets.
 * This is used by _getNameById.
 */
function _getIdToNameMapping(idKey) {
  const map = {
    propinsi_id: { sheet: "propinsi", idCol: "A", nameCol: "B" },
    kota_id: { sheet: "kota", idCol: "A", nameCol: "B" },
    kecamatan_id: { sheet: "kecamatan", idCol: "A", nameCol: "B" },
    kelurahan_id: { sheet: "kelurahan", idCol: "A", nameCol: "B" },
    kodepos_id: { sheet: "kodepos", idCol: "A", nameCol: "B" },
  };

  // The sheet name is derived from the key (e.g., 'propinsi' from 'propinsi_id')
  const baseName = idKey.replace("_id", "").toLowerCase();

  if (map.hasOwnProperty(idKey.toLowerCase())) {
    return map[idKey.toLowerCase()];
  }

  // Fallback if the key format is unexpected but we can guess the sheet name
  return { sheet: baseName, idCol: "A", nameCol: "B" };
}

/**
 * Looks up a name (e.g., 'propinsi_name') based on its ID from the corresponding sheet.
 * Uses the efficient gviz/tq query method for server-side lookup.
 *
 * @param {string} idKey The ID field name to search (e.g., 'propinsi_id').
 * @param {string} valueId The value of the ID to match.
 * @returns {string|null} The corresponding name (e.g., 'Jawa Barat') or null if not found.
 */
function _getNameById(idKey = "propinsi_id", valueId = 12) {
  if (!valueId) return null;

  // 1. Get the lookup configuration
  const config = _getIdToNameMapping(idKey);
  if (!config || !config.sheet) {
    console.error(`Invalid ID key for lookup: ${idKey}`);
    return null;
  }

  // 2. Determine the correctly quoted filter value
  let filterValue = valueId;
  if (!isNaN(valueId) && !isNaN(parseFloat(valueId))) {
    filterValue = valueId; // As number
  } else {
    filterValue = `'${valueId}'`; // As string
  }

  // 3. Build the Gviz query: SELECT NameCol WHERE IDCol = Value
  const query = `SELECT ${config.nameCol} WHERE ${config.idCol} = ${filterValue} LIMIT 1`;

  // 4. Fetch the data
  try {
    // The sheet name is based on the ID key (e.g., 'propinsi' for 'propinsi_id')
    const data = _fetchDataFromGviz(SPREADSHEET_ID, config.sheet, query);

    // 5. Return the name from the first result
    if (data && data.length > 0) {
      // The name key will be the column label (header) of the nameCol,
      // but since we only select one column, we can grab the first property's value.
      const nameKey = Object.keys(data[0])[0];
      const result = data[0][nameKey];
      return result;
    }
    return null; // Not found
  } catch (e) {
    console.error(`Error during ID-to-Name lookup for ${idKey}:${valueId}. Error: ${e.message}`);
    return null;
  }
}
