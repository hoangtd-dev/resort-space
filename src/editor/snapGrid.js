export const GRID_CELL_SIZE = 5;
export const PLACED_OFFSET = 0.05;
export const PREVIEW_OFFSET = 0.06;

// Snap a tile (1×1) to the nearest cell centre.
export function toPlacementPoint(worldX, worldZ) {
  const half = GRID_CELL_SIZE / 2;
  return {
    x: Math.round((worldX - half) / GRID_CELL_SIZE) * GRID_CELL_SIZE + half,
    z: Math.round((worldZ - half) / GRID_CELL_SIZE) * GRID_CELL_SIZE + half,
  };
}

// Snap one axis: odd cell-count → cell centre, even → grid line.
export function snapAxis(value, cells) {
  if (cells % 2 === 1) {
    const half = GRID_CELL_SIZE / 2;
    return Math.round((value - half) / GRID_CELL_SIZE) * GRID_CELL_SIZE + half;
  }
  return Math.round(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

export function snapForObject(worldX, worldZ, cols, rows) {
  return { x: snapAxis(worldX, cols), z: snapAxis(worldZ, rows) };
}

// Returns all cell-centre keys covered by a footprint centred at (cx, cz).
export function getCoveredCellKeys(cx, cz, cols, rows) {
  const keys = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = cx + (i - (cols - 1) / 2) * GRID_CELL_SIZE;
      const z = cz + (j - (rows - 1) / 2) * GRID_CELL_SIZE;
      keys.push(`${Math.round(x * 100)},${Math.round(z * 100)}`);
    }
  }
  return keys;
}
