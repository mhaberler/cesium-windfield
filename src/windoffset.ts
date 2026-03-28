/**
 * Calculates new coordinates after displacing a position by wind velocity over a time step.
 *
 * @param lat Latitude in degrees.
 * @param lon Longitude in degrees.
 * @param u Eastward wind component in m/s.
 * @param v Northward wind component in m/s.
 * @param timeStep Time step in seconds (default: 3600).
 * @returns [new_longitude, new_latitude] in degrees.
 */
export function addWindToCoordinates(
  lat: number,
  lon: number,
  u: number,
  v: number,
  timeStep: number = 3600,
): [number, number] {
  const R = 6371000; // Earth's radius in meters

  const latRad = (lat * Math.PI) / 180;

  const deltaLat = ((v * timeStep) / R) * (180 / Math.PI);
  const deltaLon =
    ((u * timeStep) / (R * Math.cos(latRad))) * (180 / Math.PI);

  return [lon + deltaLon, lat + deltaLat];
}
