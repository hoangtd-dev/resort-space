// Terrain height at or below this value is considered beach/sea.
// The ocean mesh sits at y = -0.5. Terrain above -0.5 is visible and has vertex
// color (land). Terrain at or below -0.5 is submerged under the ocean mesh (sea).
export const BEACH_SEA_HEIGHT_THRESHOLD = -0.5;

// Zone identifiers
export const ZONE_LAND = "land";
export const ZONE_BEACH_SEA = "beach_sea";
export const ZONE_ANY = "any";

// Defines which zone each object type is restricted to.
// Objects not listed default to ZONE_LAND.
export const OBJECT_ZONES = {
  tow_boat: ZONE_BEACH_SEA,
  tugboat:  ZONE_BEACH_SEA,
  sailboat: ZONE_BEACH_SEA,
  titanic:  ZONE_BEACH_SEA,
  yacht:    ZONE_BEACH_SEA,
};

// Returns the zone for a world position based on terrain height.
export function getZoneAt(worldX, worldZ, sampleHeight) {
  const h = sampleHeight(worldX, worldZ);
  return h <= BEACH_SEA_HEIGHT_THRESHOLD ? ZONE_BEACH_SEA : ZONE_LAND;
}

// Returns true if the object type is allowed at the given world position.
export function isPlacementAllowed(type, worldX, worldZ, sampleHeight) {
  const required = OBJECT_ZONES[type] ?? ZONE_LAND;
  if (required === ZONE_ANY) return true;
  const h = sampleHeight(worldX, worldZ);
  const zone = h <= BEACH_SEA_HEIGHT_THRESHOLD ? ZONE_BEACH_SEA : ZONE_LAND;
  return zone === required;
}
