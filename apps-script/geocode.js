/**
 * --- NEW GEOCODING FUNCTION ---
 * Uses Google Maps Service to convert an administrative address into Lat/Lng coordinates.
 * NOTE: Requires the 'Maps Service' to be enabled in Apps Script project settings.
 */
function _geocodeAddress(kodepos, kelurahan, kecamatan, kota, propinsi) {
  // Construct a clean, highly specific address string for the geocoder
  const addressParts = [kelurahan, kecamatan, kota, propinsi, 'Indonesia'];
  if (kodepos) {
      // Adding postal code often helps accuracy
      addressParts.unshift(kodepos); 
  }

  // Filter out any empty/null values and join with comma and space
  const address = addressParts.filter(Boolean).join(', ');
  
  if (address.length < 10) return null; // Too short to be reliable

  try {
    const geocoder = Maps.newGeocoder();
    const response = geocoder.geocode(address);

    if (response.status === 'OK' && response.results.length > 0) {
      const location = response.results[0].geometry.location;
      
      // Return the coordinates and the highly accurate address found by Google
      return { 
        latitude: location.lat, 
        longitude: location.lng, 
        formatted_address: response.results[0].formatted_address
      };
    }
  } catch (e) {
    console.error(`Geocoding failed for address: "${address}". Error: ${e.message}`);
  }
  
  return null;
}

