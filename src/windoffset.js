function addWindToCoordinates(lat, lon, u, v, timeStep = 3600) {
  // Earth's radius in meters
  const R = 6371000;

  // Convert degrees to radians
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  // Calculate displacement (meters to degrees)
  const deltaLat = ((v * timeStep) / R) * (180 / Math.PI);
  const deltaLon = ((u * timeStep) / (R * Math.cos(latRad))) * (180 / Math.PI);

  // New coordinates
  const newLat = lat + deltaLat;
  const newLon = lon + deltaLon;

  return [newLon, newLat];
}

// Example usage:
//   const [newLon, newLat] = addWindToCoordinates(
//     37.7749,    // initial latitude
//     -122.4194,  // initial longitude
//     5,          // u (m/s, eastward)
//     3,          // v (m/s, northward)
//     3600        // time step in seconds (1 hour)
//   );

export { addWindToCoordinates };
