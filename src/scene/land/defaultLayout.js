export const DEFAULT_PATHS = [];

export const DEFAULT_OBJECTS = [
  // ── Lighthouse ─────────────────────────────────────────────────────────────
  // { type: "lighthouse", wx: 110, wz: -55 },

  // // ── Boats in water ─────────────────────────────────────────────────────────
  // { type: "tugboat",  wx:  10, wz: -168, y: -0.5 },

  // { type: "yacht",    wx:  55, wz: -192, y: -0.5 },
  // { type: "titanic",  wx: -105, wz: -205, y: -0.5 },

  // ── Beach objects ──────────────────────────────────────────────────────────
  { type: "simple_wooden_pier_or_dock", wx: 19, wz: -130 },
  { type: "tow_boat", wx: 30, wz: -141 },

  // ── Beach tables ───────────────────────────────────────────────────────────
  { type: "beach_table", wx: -21.93, wz: -113.05 },
  { type: "beach_table", wx: -31.38, wz: -112.4 },
  { type: "beach_table", wx: -44.95, wz: -112.92 },
  { type: "beach_table", wx: -26.04, wz: -123.66 },
  { type: "beach_table", wx: -35.27, wz: -123.5 },
  { type: "beach_table", wx: -45.32, wz: -123.0 },

  // ── Buildings ──────────────────────────────────────────────────────────────
  { type: "resort", wx: 61.92, wz: -26.69 },
  { type: "resort", wx: -35.62, wz: -22.25 },

  { type: "blue_radison_resort", wx: -72, wz: -65.62 },
  { type: "blue_radison_resort", wx: 65.07, wz: -69.62 },

  { type: "swimming_pool", wx: 3, wz: -82.1 },

  // ── Boulders flanking the pier (wx 17, wz -132) ────────────────────────────
  // Left side
  { type: "beach_boulder", wx: -4, wz: -127 },
  { type: "beach_boulder", wx: -11, wz: -121 },
  { type: "beach_boulder", wx: 1, wz: -134 },
  { type: "beach_boulder", wx: -7, wz: -117 },
  { type: "beach_boulder", wx: 6, wz: -139 },
  // Right side
  { type: "beach_boulder", wx: 32, wz: -125 },
  { type: "beach_boulder", wx: 39, wz: -119 },
  { type: "beach_boulder", wx: 27, wz: -133 },
  { type: "beach_boulder", wx: 44, wz: -114 },
  { type: "beach_boulder", wx: 35, wz: -140 },

  // ── Island trees (every 3rd removed globally — 102 of 152 kept) ───────────

  // z = -136
  { type: "stylized_tree", wx: -136, wz: -136 },
  { type: "stylized_tree", wx: -119, wz: -136 },
  { type: "stylized_tree", wx: -85, wz: -136 },
  { type: "stylized_tree", wx: -68, wz: -136 },
  { type: "stylized_tree", wx: 51, wz: -136 },
  { type: "oak_tree", wx: 68, wz: -136 },
  { type: "stylized_tree", wx: 102, wz: -136 },
  { type: "stylized_tree", wx: 119, wz: -136 },

  // z = -102
  { type: "stylized_tree", wx: -136, wz: -102 },
  { type: "stylized_tree", wx: -119, wz: -102 },
  { type: "stylized_tree", wx: 102, wz: -102 },
  { type: "stylized_tree", wx: 119, wz: -102 },

  // z = -85
  { type: "stylized_tree", wx: -136, wz: -85 },
  { type: "stylized_tree", wx: -119, wz: -85 },
  { type: "oak_tree", wx: 119, wz: -85 },
  { type: "stylized_tree", wx: 136, wz: -85 },

  // z = -68
  { type: "stylized_tree", wx: -119, wz: -68 },
  { type: "stylized_tree", wx: 85, wz: -68 },
  { type: "stylized_tree", wx: 119, wz: -68 },
  { type: "stylized_tree", wx: 136, wz: -68 },

  // z = -51
  { type: "oak_tree", wx: -119, wz: -51 },
  { type: "stylized_tree", wx: 85, wz: -51 },
  { type: "oak_tree", wx: 119, wz: -51 },
  { type: "stylized_tree", wx: 136, wz: -51 },

  // z = -34
  { type: "stylized_tree", wx: -119, wz: -34 },
  { type: "oak_tree", wx: -102, wz: -34 },
  { type: "stylized_tree", wx: 85, wz: -34 },
  { type: "stylized_tree", wx: 102, wz: -34 },
  { type: "oak_tree", wx: 136, wz: -34 },

  // z = -17
  { type: "stylized_tree", wx: -136, wz: -17 },
  { type: "stylized_tree", wx: -85, wz: -17 },
  { type: "stylized_tree", wx: 34, wz: -17 },
  { type: "stylized_tree", wx: 102, wz: -17 },
  { type: "stylized_tree", wx: 119, wz: -17 },

  // z = 0
  { type: "stylized_tree", wx: -119, wz: 0 },
  { type: "oak_tree", wx: -102, wz: 0 },
  { type: "stylized_tree", wx: -51, wz: 0 },
  { type: "stylized_tree", wx: -17, wz: 0 },
  { type: "stylized_tree", wx: 51, wz: 0 },
  { type: "stylized_tree", wx: 68, wz: 0 },
  { type: "stylized_tree", wx: 119, wz: 0 },
  { type: "stylized_tree", wx: 136, wz: 0 },

  // z = 17
  { type: "stylized_tree", wx: -102, wz: 17 },
  { type: "oak_tree", wx: -85, wz: 17 },
  { type: "stylized_tree", wx: -34, wz: 17 },
  { type: "stylized_tree", wx: 0, wz: 17 },
  { type: "stylized_tree", wx: 68, wz: 17 },
  { type: "oak_tree", wx: 85, wz: 17 },
  { type: "stylized_tree", wx: 136, wz: 17 },

  // z = 34
  { type: "oak_tree", wx: -136, wz: 34 },
  { type: "stylized_tree", wx: -85, wz: 34 },
  { type: "stylized_tree", wx: -68, wz: 34 },
  { type: "stylized_tree", wx: -17, wz: 34 },
  { type: "stylized_tree", wx: 34, wz: 34 },
  { type: "stylized_tree", wx: 85, wz: 34 },
  { type: "oak_tree", wx: 102, wz: 34 },

  // z = 51
  { type: "oak_tree", wx: -119, wz: 51 },
  { type: "stylized_tree", wx: -102, wz: 51 },
  { type: "stylized_tree", wx: -51, wz: 51 },
  { type: "oak_tree", wx: -17, wz: 51 },
  { type: "stylized_tree", wx: 51, wz: 51 },
  { type: "stylized_tree", wx: 68, wz: 51 },
  { type: "oak_tree", wx: 119, wz: 51 },
  { type: "stylized_tree", wx: 136, wz: 51 },

  // z = 68
  { type: "oak_tree", wx: -102, wz: 68 },
  { type: "stylized_tree", wx: -85, wz: 68 },
  { type: "stylized_tree", wx: -34, wz: 68 },
  { type: "oak_tree", wx: 0, wz: 68 },
  { type: "stylized_tree", wx: 51, wz: 68 },
  { type: "stylized_tree", wx: 68, wz: 68 },
  { type: "stylized_tree", wx: 119, wz: 68 },

  // z = 85
  { type: "stylized_tree", wx: -136, wz: 85 },
  { type: "oak_tree", wx: -85, wz: 85 },
  { type: "stylized_tree", wx: -68, wz: 85 },
  { type: "stylized_tree", wx: -17, wz: 85 },
  { type: "oak_tree", wx: 17, wz: 85 },
  { type: "stylized_tree", wx: 68, wz: 85 },
  { type: "stylized_tree", wx: 85, wz: 85 },
  { type: "stylized_tree", wx: 136, wz: 85 },

  // z = 102
  { type: "stylized_tree", wx: -119, wz: 102 },
  { type: "oak_tree", wx: -68, wz: 102 },
  { type: "stylized_tree", wx: -51, wz: 102 },
  { type: "stylized_tree", wx: 0, wz: 102 },
  { type: "oak_tree", wx: 34, wz: 102 },
  { type: "stylized_tree", wx: 85, wz: 102 },
  { type: "stylized_tree", wx: 102, wz: 102 },

  // z = 119
  { type: "stylized_tree", wx: -136, wz: 119 },
  { type: "stylized_tree", wx: -102, wz: 119 },
  { type: "oak_tree", wx: -51, wz: 119 },
  { type: "stylized_tree", wx: -34, wz: 119 },
  { type: "stylized_tree", wx: 17, wz: 119 },
  { type: "oak_tree", wx: 51, wz: 119 },
  { type: "stylized_tree", wx: 102, wz: 119 },
  { type: "stylized_tree", wx: 119, wz: 119 },

  // z = 136
  { type: "stylized_tree", wx: -119, wz: 136 },
  { type: "stylized_tree", wx: -85, wz: 136 },
  { type: "oak_tree", wx: -34, wz: 136 },
  { type: "stylized_tree", wx: -17, wz: 136 },
  { type: "stylized_tree", wx: 34, wz: 136 },
  { type: "oak_tree", wx: 68, wz: 136 },
  { type: "stylized_tree", wx: 119, wz: 136 },
  { type: "stylized_tree", wx: 136, wz: 136 },
];
