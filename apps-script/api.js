// NOTE: SPREADSHEET_ID must be defined as a global constant or retrieved via PropertiesService
// For demonstration, use a placeholder.
const SPREADSHEET_ID = "1tPKmIwF75q3-OCMyGzFMUO6VYTpAKWVqCBKng9h3m0s"; // YOUR_SPREADSHEET_ID_HERE
const DEFAULT_LIMIT = 5000; // Large limit, as dropdowns usually fetch all available options.

/**
 * Handles GET requests to the Web App URL.
 * Endpoint Structure:
 * 1. Fetch Provinces: /exec?level=propinsi
 * 2. Fetch Cities: /exec?level=kota&parentId={propinsi_id}
 * 3. Fetch Districts: /exec?level=kecamatan&parentId={kota_id}
 * 4. Fetch Sub-Districts: /exec?level=kelurahan&parentId={kecamatan_id}
 * 5. Fetch Postal Codes: /exec?level=kodepos&parentId={kelurahan_id}
 * 6. Fetch Detail: /exec?level=kodepos_detail&kodepos={kodepos_name}
 * 7. Geocode Address: /exec?level=geocode&kodepos=...&kelurahan=...&kecamatan=...&kota=...&propinsi=...
 *
 * @param {GoogleAppsScript.Events.DoGet} e The event object containing query parameters.
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response.
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const level = params.level;

    if (!level) {
      return serverResponse().badRequest("Missing required parameter: 'level'.");
    }

    // --- GEOCODING LOGIC ---
    if (level.toLowerCase() === "geocode") {
      const { kodepos, kelurahan, kecamatan, kota, propinsi } = params;

      const coordinates = _geocodeAddress(kodepos, kelurahan, kecamatan, kota, propinsi);

      if (coordinates) {
        // Here you can add logic to WRITE the Lat/Lng back to the 'key' sheet
        // using SpreadsheetApp if you want to cache it, but the geocoding is done.
        return serverResponse().ok("Geocoding Success", coordinates);
      } else {
        return serverResponse().notFound("Geocoding failed to find coordinates for the address.");
      }
    }

    // Determine the ID used for filtering. Use 'parentId' for cascading, or 'kodepos' for detail lookup.
    const filterId = params.parentId || params.kodepos;
    const getLocation = params.location || "false";
    const { sheetName, idCol, nameCol, parentCol, filterCol, selectCols } = _getMapping(level);

    if (!sheetName) {
      return serverResponse().badRequest(`Invalid level parameter: ${level}.`);
    }

    // 1. Build the Query String

    // Use selectCols for detail query, otherwise use idCol and nameCol for cascading query
    let query = selectCols ? `SELECT ${selectCols}` : `SELECT ${idCol}, ${nameCol}`;

    // Determine the column to filter on
    const targetFilterCol = parentCol || filterCol;

    if (targetFilterCol && filterId) {
      // CRITICAL FIX: Determine if filterId is a number or string for correct Gviz filtering.
      let filterValue = filterId;
      if (!isNaN(filterId) && !isNaN(parseFloat(filterId))) {
        // If it looks like a number, use it without quotes.
        filterValue = filterId;
      } else {
        // If it's a string (e.g., 'P-01'), wrap it in single quotes.
        filterValue = `'${filterId}'`;
      }

      // Append the WHERE clause with the correctly formatted value
      query += ` WHERE ${targetFilterCol} = ${filterValue}`;
    }

    query += ` LIMIT ${DEFAULT_LIMIT}`; // Apply a limit to prevent massive uncontrolled queries.

    // 2. Execute the Query using UrlFetchApp
    let data = _fetchDataFromGviz(SPREADSHEET_ID, sheetName, query);

    if (level === "detail" && data.length > 0) {
      // Fix 1: Properly destructure and call the function with the correct arguments.
      // We assume data[0] contains the required *_name keys based on your comments.
      const {
        kodepos_name,
        kelurahan_id,
        kelurahan_name,
        kecamatan_id,
        kecamatan_name,
        kota_id,
        kota_name,
        propinsi_id,
        propinsi_name,
      } = data[0];

      if (getLocation === "true") {
        const location = _geocodeAddress(
          kodepos_name, // Pass the postal code (kodepos_name value)
          kelurahan_name,
          kecamatan_name,
          kota_name,
          propinsi_name
        );
        // If a successful location is found, merge it back into the data object
        if (location) {
          data = [{ kelurahan_id, kecamatan_id, kota_id, propinsi_id, ...location }];
        } else {
          // Add a clear indicator if geocoding failed for this specific address
          data = [{ ...data[0], latitude: null, longitude: null, geocode_status: "FAILED_GENERIC_RESULT" }];
        }
      }
    }
    return serverResponse().ok("Success", data);
  } catch (error) {
    console.error("API Error:", error);
    return serverResponse().internalError(`Server error: ${error.message}`);
  }
}
