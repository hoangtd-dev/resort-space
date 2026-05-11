export const DEFAULT_PATHS = [];

export const DEFAULT_OBJECTS = [

  // ── Pool (beach-side) ──────────────────────────────────────────────────────
  { type: "swimming_pool",       wx:  15,   wz: -65   },
  { type: "pool_float",          wx:  15,   wz: -62   },

  // ── Inflatable pool (beach-edge) ───────────────────────────────────────────
  { type: "inflatable_pool",     wx:  -8,   wz: -80   },
  { type: "pool_float",          wx:  -8,   wz: -77   },

  // ── Wooden pier (beach edge → water) ──────────────────────────────────────
  // Footprint 15×30 u: wx 9–24, wz -109 to -139
  // North end on firm sand, south end submerged.
  { type: "simple_wooden_pier_or_dock", wx: 16,  wz: -124 },

  // ── Boats (shallow water, moored off the pier) ─────────────────────────────
  // Both positions sit in the land–ocean transition zone (terrain ≈ ocean level).
  { type: "fishing_boat",        wx:   6,   wz: -144  },
  { type: "tow_boat",            wx:  30,   wz: -141  },

  // ── Pool float at shoreline (near west beach seating, water's edge) ────────
  { type: "pool_float",          wx:  -2,   wz: -130  },

  // ── Beach seating — West cluster (near inflatable pool) ───────────────────
  { type: "beach_kit",           wx: -29,   wz: -91   },
  { type: "beach_kit",           wx: -15,   wz: -95   },
  { type: "beach_table",         wx: -23,   wz: -84   },

  // ── Beach seating — Central cluster ───────────────────────────────────────
  { type: "beach_kit",           wx:  -3,   wz: -92   },
  { type: "beach_kit",           wx:  11,   wz: -87   },
  { type: "beach_table",         wx:   3,   wz: -85   },

  // ── Beach seating — East cluster (dock approach) ───────────────────────────
  { type: "beach_kit",           wx:  27,   wz: -87   },
  { type: "beach_kit",           wx:  39,   wz: -83   },
  { type: "beach_table",         wx:  33,   wz: -79   },

  // ── Beach seating — Far west cluster ──────────────────────────────────────
  { type: "beach_kit",           wx: -42,   wz: -94   },
  { type: "beach_kit",           wx: -34,   wz: -104  },
  { type: "beach_table",         wx: -38,   wz: -92   },

  // ── Beach seating — South shoreline cluster ────────────────────────────────
  { type: "beach_kit",           wx: -22,   wz: -110  },
  { type: "beach_kit",           wx:  -8,   wz: -114  },
  { type: "beach_table",         wx: -16,   wz: -107  },

  // ── Beach seating — Far east cluster ──────────────────────────────────────
  { type: "beach_kit",           wx:  50,   wz: -100  },
  { type: "beach_kit",           wx:  52,   wz: -110  },
  { type: "beach_table",         wx:  44,   wz: -104  },

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

  // ── Coastal boulders — extended beach ─────────────────────────────────────
  { type: "beach_boulder",       wx: -30,   wz: -112  },
  { type: "beach_boulder",       wx:  14,   wz: -106  },
  { type: "beach_boulder",       wx:  46,   wz: -114  },

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
  { type: "stylized_tree",       wx: -40,   wz: -82   },
  { type: "oak_tree",            wx: -26,   wz: -80   },
  { type: "stylized_tree",       wx:  20,   wz: -80   },
  { type: "oak_tree",            wx:  38,   wz: -76   },

  // ── Trees — west beach extension (fringe continues south) ─────────────────
  { type: "stylized_tree",       wx: -48,   wz: -88   },
  { type: "oak_tree",            wx: -54,   wz: -98   },
  { type: "stylized_tree",       wx: -36,   wz: -100  },
  { type: "oak_tree",            wx: -32,   wz: -112  },

  // ── Trees — east beach extension ──────────────────────────────────────────
  { type: "oak_tree",            wx:  48,   wz: -80   },
  { type: "stylized_tree",       wx:  56,   wz: -90   },
  { type: "oak_tree",            wx:  48,   wz: -100  },
  { type: "stylized_tree",       wx:  60,   wz: -108  },

  // ── Trees — central beach scatter ─────────────────────────────────────────
  { type: "stylized_tree",       wx:  -8,   wz: -102  },
  { type: "oak_tree",            wx:   6,   wz: -100  },

  // ── Dense jungle zone (north arc, away from resort and beach) ────────────
  // Three overlapping clusters — tight interior spacing gives canopy density,
  // looser south fringe fades naturally into the open resort terrain.

  // Cluster A — northwest (thickest canopy)
  { type: "oak_tree",      wx: -58,  wz:  68  },
  { type: "stylized_tree", wx: -48,  wz:  72  },
  { type: "oak_tree",      wx: -38,  wz:  72  },
  { type: "oak_tree",      wx: -62,  wz:  76  },
  { type: "stylized_tree", wx: -52,  wz:  80  },
  { type: "oak_tree",      wx: -42,  wz:  78  },
  { type: "stylized_tree", wx: -64,  wz:  86  },
  { type: "oak_tree",      wx: -54,  wz:  84  },
  { type: "oak_tree",      wx: -44,  wz:  88  },
  { type: "stylized_tree", wx: -36,  wz:  82  },
  { type: "stylized_tree", wx: -46,  wz:  96  },
  { type: "oak_tree",      wx: -38,  wz:  94  },

  // Cluster B — center-north (medium density)
  { type: "stylized_tree", wx: -24,  wz:  72  },
  { type: "oak_tree",      wx: -12,  wz:  76  },
  { type: "stylized_tree", wx:  -2,  wz:  74  },
  { type: "oak_tree",      wx:  10,  wz:  74  },
  { type: "oak_tree",      wx: -20,  wz:  84  },
  { type: "stylized_tree", wx:  -8,  wz:  80  },
  { type: "oak_tree",      wx:   0,  wz:  86  },
  { type: "stylized_tree", wx:  16,  wz:  80  },
  { type: "oak_tree",      wx: -16,  wz:  96  },
  { type: "stylized_tree", wx:  -4,  wz: 100  },
  { type: "oak_tree",      wx:   8,  wz:  94  },
  { type: "stylized_tree", wx:  20,  wz:  88  },

  // Cluster C — northeast fringe (lighter, opens toward ocean)
  { type: "stylized_tree", wx:  28,  wz:  72  },
  { type: "oak_tree",      wx:  36,  wz:  78  },
  { type: "stylized_tree", wx:  42,  wz:  72  },
  { type: "oak_tree",      wx:  32,  wz:  84  },

  // South transition fringe — gradual fade into resort clearing
  { type: "oak_tree",      wx: -54,  wz:  64  },
  { type: "stylized_tree", wx: -36,  wz:  68  },
  { type: "oak_tree",      wx: -14,  wz:  70  },
  { type: "stylized_tree", wx:   6,  wz:  66  },
  { type: "oak_tree",      wx:  26,  wz:  68  },

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
