import { Geodesic } from "geographiclib";

interface DirectResult {
  lat2: number;
  lon2: number;
}

/**
 * Calculates the destination point given a starting point, bearing, and distance.
 *
 * @param lat1 Starting latitude in degrees.
 * @param lon1 Starting longitude in degrees.
 * @param bearing Initial bearing in degrees (clockwise from North).
 * @param distanceMeters Distance in meters.
 * @returns [destination_latitude, destination_longitude] in degrees.
 */
export function getEndpoint(
  lat1: number,
  lon1: number,
  bearing: number,
  distanceMeters: number,
): [number, number] {
  const geod = Geodesic.WGS84;
  const result = geod.Direct(
    lat1,
    lon1,
    bearing,
    distanceMeters,
  ) as unknown as DirectResult;
  return [result.lat2, result.lon2];
}
