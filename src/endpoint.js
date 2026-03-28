import GeographicLib from "geographiclib";

const geod = GeographicLib.Geodesic.WGS84;
/**
 * Calculates the destination point given a starting point, bearing, and distance.
 *
 * @param {number} lat1 Starting latitude in degrees.
 * @param {number} lon1 Starting longitude in degrees.
 * @param {number} bearing Initial bearing in degrees (clockwise from North).
 * @param {number} d Distance in meters.
 * @returns {Array<number>} An array containing [destination_latitude, destination_longitude] in degrees.
 */
function getEndpoint(lat1, lon1, bearing, distanceMeters) {
  // Get the WGS84 geodesic instance (a = Constants.WGS84_a, f = Constants.WGS84_f)
  const geod = GeographicLib.Geodesic.WGS84;

  // Perform the direct geodesic calculation
  // Input: lat1, lon1, bearing (azimuth), distance (in meters)
  // Output is an object containing { lat2, lon2, ... }
  const result = geod.Direct(lat1, lon1, bearing, distanceMeters);

  // Return the destination latitude and longitude
  return [result.lat2, result.lon2];
}

export { getEndpoint };
