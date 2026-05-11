export const DEFAULT_PATHS = [];

export const DEFAULT_OBJECTS = [

  // ── Core resort buildings (unchanged positions) ────────────────────────────
  { type: "blue_radison_resort", wx:   5,   wz:  10   },
  { type: "resort",              wx: -15,   wz:   7.5 },
  { type: "asia_building",       wx:  25,   wz:   5   },
  { type: "dakota_building",     wx:  25,   wz: -15   },

  { type: "resort",              wx: -32,   wz:  20   },
  { type: "asia_building",       wx: -34,   wz:   6   },
  { type: "dakota_building",     wx: -30,   wz:  -8   },

  { type: "blue_radison_resort", wx:  -6,   wz:  50   },
  { type: "resort",              wx:  16,   wz:  46   },
  { type: "asia_building",       wx:  -8,   wz:  62   },

  { type: "resort",              wx:   8,   wz: -40   },
  { type: "dakota_building",     wx:  26,   wz: -34   },
  { type: "blue_radison_resort", wx:  -8,   wz: -52   },

  { type: "resort",              wx:  50,   wz:  10   },
  { type: "blue_radison_resort", wx:  48,   wz:  28   },
  { type: "asia_building",       wx:  52,   wz:  -8   },

  // ── Fountain plaza (interior, between building clusters) ───────────────────
  { type: "zsolnay_fountain",    wx:   8,   wz:  28   },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BEACH CLUB ZONE  (wz -58 → -120, centred around wx 15)               ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Pool (moved beach-side, overlooks the ocean) ───────────────────────────
  // Footprint 20×15 u: wx 5–25, wz -72.5 to -57.5
  { type: "swimming_pool",       wx:  15,   wz: -65   },
  { type: "pool_float",          wx:  15,   wz: -62   }, // inside pool
  // Entrance water feature at the north lip of the pool
  { type: "water_fountain",      wx:  15,   wz: -55   },

  // ── Inflatable pool (beach-edge, right on the sand) ───────────────────────
  // Footprint 10×10 u: wx -13 to -3, wz -85 to -75
  { type: "inflatable_pool",     wx:  -8,   wz: -80   },
  { type: "pool_float",          wx:  -8,   wz: -77   }, // inside inflatable

  // ── Wooden pier (beach edge → water) ──────────────────────────────────────
  // Footprint 15×30 u: wx 10.5–25.5, wz -105 to -135
  // North end on firm sand, south end submerged.
  { type: "simple_wooden_pier_or_dock", wx: 18,  wz: -120 },

  // ── Boats (shallow water, moored off the pier) ─────────────────────────────
  // Both positions sit in the land–ocean transition zone (terrain ≈ ocean level).
  { type: "fishing_boat",        wx:  10,   wz: -138  },
  { type: "tow_boat",            wx:  28,   wz: -136  },

  // ── Beach seating — West cluster (near inflatable pool) ───────────────────
  { type: "beach_kit",           wx: -28,   wz: -90   },
  { type: "beach_kit",           wx: -16,   wz: -94   },
  { type: "beach_table",         wx: -22,   wz: -85   },

  // ── Beach seating — Central cluster ───────────────────────────────────────
  { type: "beach_kit",           wx:  -2,   wz: -90   },
  { type: "beach_kit",           wx:  10,   wz: -88   },
  { type: "beach_table",         wx:   4,   wz: -84   },

  // ── Beach seating — East cluster (dock approach) ───────────────────────────
  { type: "beach_kit",           wx:  28,   wz: -86   },
  { type: "beach_kit",           wx:  38,   wz: -82   },
  { type: "beach_table",         wx:  34,   wz: -80   },

  // ── Coastal boulders ───────────────────────────────────────────────────────
  { type: "beach_boulder",       wx: -60,   wz: -92   },
  { type: "beach_boulder",       wx: -48,   wz: -102  },
  { type: "beach_boulder",       wx:  40,   wz: -96   },
  { type: "beach_boulder",       wx:  58,   wz: -84   },
  { type: "beach_boulder",       wx: -108,  wz:  22   },
  { type: "beach_boulder",       wx:  -98,  wz: -44   },
  { type: "beach_boulder",       wx:   92,  wz: -58   },
  { type: "beach_boulder",       wx:   55,  wz: 102   },
  { type: "beach_boulder",       wx:  -58,  wz: 100   },

  // ── Trees — central buildings and fountain plaza ───────────────────────────
  { type: "oak_tree",            wx: -12.5, wz:  33   },
  { type: "stylized_tree",       wx:  -5,   wz:  38   },
  { type: "oak_tree",            wx:   8,   wz:  35   },
  { type: "stylized_tree",       wx:  20,   wz:  35   },
  { type: "oak_tree",            wx:  30,   wz:  28   },
  { type: "stylized_tree",       wx:  -2,   wz:  22   },
  { type: "oak_tree",            wx:  18,   wz:  22   },
  { type: "stylized_tree",       wx:   8,   wz:  42   },

  { type: "oak_tree",            wx: -42,   wz:  24   },
  { type: "stylized_tree",       wx: -44,   wz:  12   },
  { type: "oak_tree",            wx: -44,   wz:  -2   },
  { type: "stylized_tree",       wx: -40,   wz: -14   },

  { type: "stylized_tree",       wx: -22,   wz:  56   },
  { type: "oak_tree",            wx:   2,   wz:  68   },
  { type: "stylized_tree",       wx:  22,   wz:  58   },

  { type: "oak_tree",            wx:  62,   wz:  22   },
  { type: "stylized_tree",       wx:  62,   wz:   4   },
  { type: "stylized_tree",       wx:  60,   wz: -16   },

  // Interior — between main buildings and beach club
  { type: "stylized_tree",       wx:  20,   wz: -38   },
  { type: "oak_tree",            wx: -20,   wz: -46   },
  { type: "stylized_tree",       wx:  18,   wz: -50   },

  // ── Trees — pool area (4 corners + entrance) ───────────────────────────────
  { type: "oak_tree",            wx:   4,   wz: -58   }, // NW
  { type: "stylized_tree",       wx:  28,   wz: -58   }, // NE
  { type: "oak_tree",            wx:   4,   wz: -74   }, // SW
  { type: "stylized_tree",       wx:  28,   wz: -74   }, // SE

  // ── Trees — inflatable pool / west beach ───────────────────────────────────
  { type: "oak_tree",            wx: -18,   wz: -74   },
  { type: "stylized_tree",       wx:   5,   wz: -74   },

  // ── Trees — dock approach (flanking the pier entrance) ────────────────────
  { type: "oak_tree",            wx:   6,   wz: -106  },
  { type: "stylized_tree",       wx:  30,   wz: -106  },

  // ── Trees — dense beach fringe ─────────────────────────────────────────────
  { type: "oak_tree",            wx: -50,   wz: -62   },
  { type: "stylized_tree",       wx: -38,   wz: -70   },
  { type: "oak_tree",            wx: -22,   wz: -76   },
  { type: "stylized_tree",       wx:  -6,   wz: -78   },
  { type: "oak_tree",            wx:  10,   wz: -76   },
  { type: "stylized_tree",       wx:  26,   wz: -72   },
  { type: "oak_tree",            wx:  40,   wz: -66   },
  { type: "oak_tree",            wx:  -4,   wz: -62   },
  { type: "stylized_tree",       wx: -40,   wz: -82   }, // west beach edge
  { type: "oak_tree",            wx: -26,   wz: -80   },
  { type: "stylized_tree",       wx:  20,   wz: -80   },
  { type: "oak_tree",            wx:  38,   wz: -76   }, // east beach edge

  // ── Perimeter tree ring (unchanged) ───────────────────────────────────────
  { type: "oak_tree",            wx:  55,   wz:  58   },
  { type: "stylized_tree",       wx: -42,   wz:  55   },
  { type: "oak_tree",            wx: -65,   wz:  22   },
  { type: "stylized_tree",       wx: -65,   wz: -15   },
  { type: "oak_tree",            wx: -55,   wz: -48   },
  { type: "stylized_tree",       wx: -32,   wz: -68   },
  { type: "oak_tree",            wx:  14,   wz: -75   },
  { type: "stylized_tree",       wx:  45,   wz: -65   },
  { type: "oak_tree",            wx:  68,   wz: -42   },
  { type: "stylized_tree",       wx:  72,   wz:  42   },

  { type: "oak_tree",            wx: -52,   wz:  88   },
  { type: "stylized_tree",       wx: -28,   wz:  98   },
  { type: "oak_tree",            wx:   0,   wz: 108   },
  { type: "stylized_tree",       wx:  25,   wz: 102   },
  { type: "oak_tree",            wx:  48,   wz:  88   },
  { type: "stylized_tree",       wx:  72,   wz:  72   },
  { type: "oak_tree",            wx:  88,   wz:  48   },
  { type: "stylized_tree",       wx: 102,   wz:  22   },
  { type: "oak_tree",            wx: 108,   wz:  -5   },
  { type: "stylized_tree",       wx: 102,   wz: -30   },
  { type: "oak_tree",            wx:  90,   wz: -55   },
  { type: "stylized_tree",       wx:  70,   wz: -75   },
  { type: "oak_tree",            wx:  45,   wz: -92   },
  { type: "stylized_tree",       wx:  18,   wz: -105  },
  { type: "oak_tree",            wx:  -8,   wz: -108  },
  { type: "stylized_tree",       wx: -32,   wz: -98   },
  { type: "oak_tree",            wx: -55,   wz: -85   },
  { type: "stylized_tree",       wx: -75,   wz: -65   },
  { type: "oak_tree",            wx: -92,   wz: -38   },
  { type: "stylized_tree",       wx: -105,  wz: -10   },
  { type: "oak_tree",            wx: -110,  wz:  15   },
  { type: "stylized_tree",       wx: -102,  wz:  42   },
  { type: "oak_tree",            wx: -88,   wz:  65   },
  { type: "stylized_tree",       wx: -68,   wz:  80   },
  { type: "oak_tree",            wx: -45,   wz:  92   },
];
