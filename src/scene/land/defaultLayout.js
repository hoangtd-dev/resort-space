export const DEFAULT_PATHS = [];

export const DEFAULT_OBJECTS = [

  // ── Beach objects ──────────────────────────────────────────────────────────
  { type: "simple_wooden_pier_or_dock", wx:  19, wz: -130 },
  { type: "tow_boat",                   wx:  30, wz: -141 },

  // ── Island trees (every 3rd removed globally — 102 of 152 kept) ───────────

  // z = -136
  { type: "stylized_tree", wx: -136, wz: -136 }, { type: "stylized_tree", wx: -119, wz: -136 },
  { type: "stylized_tree", wx:  -85, wz: -136 }, { type: "stylized_tree", wx:  -68, wz: -136 },
  { type: "stylized_tree", wx:   51, wz: -136 }, { type: "oak_tree",      wx:   68, wz: -136 },
  { type: "stylized_tree", wx:  102, wz: -136 }, { type: "stylized_tree", wx:  119, wz: -136 },

  // z = -102
  { type: "stylized_tree", wx: -136, wz: -102 }, { type: "stylized_tree", wx: -119, wz: -102 },
  { type: "stylized_tree", wx:  102, wz: -102 }, { type: "stylized_tree", wx:  119, wz: -102 },

  // z = -85
  { type: "stylized_tree", wx: -136, wz:  -85 }, { type: "stylized_tree", wx: -119, wz:  -85 },
  { type: "oak_tree",      wx:  119, wz:  -85 }, { type: "stylized_tree", wx:  136, wz:  -85 },

  // z = -68
  { type: "stylized_tree", wx: -119, wz:  -68 }, { type: "stylized_tree", wx:   85, wz:  -68 },
  { type: "stylized_tree", wx:  119, wz:  -68 }, { type: "stylized_tree", wx:  136, wz:  -68 },

  // z = -51
  { type: "oak_tree",      wx: -119, wz:  -51 }, { type: "stylized_tree", wx:   85, wz:  -51 },
  { type: "oak_tree",      wx:  119, wz:  -51 }, { type: "stylized_tree", wx:  136, wz:  -51 },

  // z = -34
  { type: "stylized_tree", wx: -119, wz:  -34 }, { type: "oak_tree",      wx: -102, wz:  -34 },
  { type: "stylized_tree", wx:   85, wz:  -34 }, { type: "stylized_tree", wx:  102, wz:  -34 },
  { type: "oak_tree",      wx:  136, wz:  -34 },

  // z = -17
  { type: "stylized_tree", wx: -136, wz:  -17 }, { type: "stylized_tree", wx:  -85, wz:  -17 },
  { type: "stylized_tree", wx:   34, wz:  -17 }, { type: "stylized_tree", wx:  102, wz:  -17 },
  { type: "stylized_tree", wx:  119, wz:  -17 },

  // z = 0
  { type: "stylized_tree", wx: -119, wz:    0 }, { type: "oak_tree",      wx: -102, wz:    0 },
  { type: "stylized_tree", wx:  -51, wz:    0 }, { type: "stylized_tree", wx:  -17, wz:    0 },
  { type: "stylized_tree", wx:   51, wz:    0 }, { type: "stylized_tree", wx:   68, wz:    0 },
  { type: "stylized_tree", wx:  119, wz:    0 }, { type: "stylized_tree", wx:  136, wz:    0 },

  // z = 17
  { type: "stylized_tree", wx: -102, wz:   17 }, { type: "oak_tree",      wx:  -85, wz:   17 },
  { type: "stylized_tree", wx:  -34, wz:   17 }, { type: "stylized_tree", wx:    0, wz:   17 },
  { type: "stylized_tree", wx:   68, wz:   17 }, { type: "oak_tree",      wx:   85, wz:   17 },
  { type: "stylized_tree", wx:  136, wz:   17 },

  // z = 34
  { type: "oak_tree",      wx: -136, wz:   34 }, { type: "stylized_tree", wx:  -85, wz:   34 },
  { type: "stylized_tree", wx:  -68, wz:   34 }, { type: "stylized_tree", wx:  -17, wz:   34 },
  { type: "stylized_tree", wx:   34, wz:   34 }, { type: "stylized_tree", wx:   85, wz:   34 },
  { type: "oak_tree",      wx:  102, wz:   34 },

  // z = 51
  { type: "oak_tree",      wx: -119, wz:   51 }, { type: "stylized_tree", wx: -102, wz:   51 },
  { type: "stylized_tree", wx:  -51, wz:   51 }, { type: "oak_tree",      wx:  -17, wz:   51 },
  { type: "stylized_tree", wx:   51, wz:   51 }, { type: "stylized_tree", wx:   68, wz:   51 },
  { type: "oak_tree",      wx:  119, wz:   51 }, { type: "stylized_tree", wx:  136, wz:   51 },

  // z = 68
  { type: "oak_tree",      wx: -102, wz:   68 }, { type: "stylized_tree", wx:  -85, wz:   68 },
  { type: "stylized_tree", wx:  -34, wz:   68 }, { type: "oak_tree",      wx:    0, wz:   68 },
  { type: "stylized_tree", wx:   51, wz:   68 }, { type: "stylized_tree", wx:   68, wz:   68 },
  { type: "stylized_tree", wx:  119, wz:   68 },

  // z = 85
  { type: "stylized_tree", wx: -136, wz:   85 }, { type: "oak_tree",      wx:  -85, wz:   85 },
  { type: "stylized_tree", wx:  -68, wz:   85 }, { type: "stylized_tree", wx:  -17, wz:   85 },
  { type: "oak_tree",      wx:   17, wz:   85 }, { type: "stylized_tree", wx:   68, wz:   85 },
  { type: "stylized_tree", wx:   85, wz:   85 }, { type: "stylized_tree", wx:  136, wz:   85 },

  // z = 102
  { type: "stylized_tree", wx: -119, wz:  102 }, { type: "oak_tree",      wx:  -68, wz:  102 },
  { type: "stylized_tree", wx:  -51, wz:  102 }, { type: "stylized_tree", wx:    0, wz:  102 },
  { type: "oak_tree",      wx:   34, wz:  102 }, { type: "stylized_tree", wx:   85, wz:  102 },
  { type: "stylized_tree", wx:  102, wz:  102 },

  // z = 119
  { type: "stylized_tree", wx: -136, wz:  119 }, { type: "stylized_tree", wx: -102, wz:  119 },
  { type: "oak_tree",      wx:  -51, wz:  119 }, { type: "stylized_tree", wx:  -34, wz:  119 },
  { type: "stylized_tree", wx:   17, wz:  119 }, { type: "oak_tree",      wx:   51, wz:  119 },
  { type: "stylized_tree", wx:  102, wz:  119 }, { type: "stylized_tree", wx:  119, wz:  119 },

  // z = 136
  { type: "stylized_tree", wx: -119, wz:  136 }, { type: "stylized_tree", wx:  -85, wz:  136 },
  { type: "oak_tree",      wx:  -34, wz:  136 }, { type: "stylized_tree", wx:  -17, wz:  136 },
  { type: "stylized_tree", wx:   34, wz:  136 }, { type: "oak_tree",      wx:   68, wz:  136 },
  { type: "stylized_tree", wx:  119, wz:  136 }, { type: "stylized_tree", wx:  136, wz:  136 },

];
