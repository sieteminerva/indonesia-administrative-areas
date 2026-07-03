/**
 * Creates a JSON response for the API endpoint with status code and payload.
 *
 * @param {number} statusCode - HTTP-like status code (e.g. 200, 400).
 * @param {string} message - Message to return to the client.
 * @param {Object=} data - Optional extra payload.
 * @returns {GoogleAppsScript.Content.TextOutput} The response object.
 * @private
 */
function _createResponse(statusCode, message, data) {
  const success = statusCode >= 200 && statusCode < 300;
  const response = {
    statusCode,
    success,
    message,
    ...(data ? { data } : {}),
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @typedef {Object} ServerResponseHelper
 * @property {(message?: string, data?: Object) => GoogleAppsScript.Content.TextOutput} ok
 *   Create a 200 OK response.
 * @property {(message?: string) => GoogleAppsScript.Content.TextOutput} badRequest
 *   Create a 400 Bad Request response.
 * @property {(message?: string) => GoogleAppsScript.Content.TextOutput} unauthorized
 *   Create a 401 Unauthorized response.
 * @property {(message?: string) => GoogleAppsScript.Content.TextOutput} forbidden
 *   Create a 403 Forbidden response.
 * @property {(message?: string) => GoogleAppsScript.Content.TextOutput} notFound
 *   Create a 404 Not Found response.
 * @property {(message?: string) => GoogleAppsScript.Content.TextOutput} internalError
 *   Create a 500 Internal Server Error response.
 * @property {(status: number, message: string, data?: Object) => GoogleAppsScript.Content.TextOutput} custom
 *   Create a custom status response.
 */

/**
 * Unified server response factory.
 *
 * @returns {ServerResponseHelper}
 */
function serverResponse() {
  return {
    ok: (message = "OK", data) => _createResponse(200, message, data),
    badRequest: (message = "Bad Request") => _createResponse(400, message),
    unauthorized: (message = "Unauthorized") => _createResponse(401, message),
    forbidden: (message = "Forbidden") => _createResponse(403, message),
    notFound: (message = "Not Found") => _createResponse(404, message),
    internalError: (message = "Internal Server Error") => _createResponse(500, message),
    custom: (status, message, data) => _createResponse(status, message, data),
  };
}

function _sortData(data, sortBy, order) {
  const sortOrder = order && (order.toLowerCase() === "des" || order.toLowerCase() === "desc") ? -1 : 1;

  // Use a more robust sort function that handles both strings and numbers.
  return data.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle null/undefined values by placing them at the end (or beginning based on sortOrder)
    if (aValue === null || aValue === undefined) return sortOrder;
    if (bValue === null || bValue === undefined) return -sortOrder;

    // Simple numeric comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * sortOrder;
    }

    // String comparison using localeCompare for correctness
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * sortOrder;
    }

    // Fallback for other types or mixed types (e.g., boolean, objects)
    if (aValue > bValue) return sortOrder;
    if (aValue < bValue) return -sortOrder;
    return 0;
  });
}
