// Seed estimates for gradient, elevation drop, and velocity.
// elevationDropFt = gradientFtPerMile × lengthMiles (rounded to nearest ft).
// These are plausible values derived from published guidebook data and
// USGS topo profiles — pending replacement with real GIS-measured data.
// velocityFps is an average at moderate runnable flow.

export const SECTION_GEOMETRY: Record<
  string,
  { gradientFtPerMile: number; elevationDropFt: number; velocityFps: number }
> = {
  // ── Arkansas Headwaters ──────────────────────────────────────────────────
  // Pine Creek: tightest gorge on the Arkansas, ~100 ft/mi
  'arkansas-pine-creek': { gradientFtPerMile: 100, elevationDropFt: 515, velocityFps: 9.0 },
  // Numbers: continuous Class IV-V, ~80 ft/mi
  'arkansas-numbers': { gradientFtPerMile: 80, elevationDropFt: 477, velocityFps: 8.0 },
  // Fractions: Class III+, slightly mellower
  'arkansas-fractions': { gradientFtPerMile: 55, elevationDropFt: 359, velocityFps: 6.5 },
  // Browns Canyon (upper): Class III-IV
  'arkansas-browns-upper': { gradientFtPerMile: 45, elevationDropFt: 225, velocityFps: 6.0 },
  // Browns Canyon (lower): Class III+
  'arkansas-browns-lower': { gradientFtPerMile: 38, elevationDropFt: 152, velocityFps: 5.5 },
  // Bighorn Sheep Canyon upper: Class II-III, wide valley
  'arkansas-bighorn-sheep-upper': { gradientFtPerMile: 22, elevationDropFt: 508, velocityFps: 4.5 },
  // Bighorn Sheep Canyon: Class III-IV tighter reach
  'arkansas-bighorn-sheep': { gradientFtPerMile: 28, elevationDropFt: 593, velocityFps: 5.0 },
  // Royal Gorge: Class IV-V, dramatic canyon
  'arkansas-royal-gorge': { gradientFtPerMile: 70, elevationDropFt: 700, velocityFps: 8.5 },
  // Big Bend: Class II-III, below gorge
  'arkansas-big-bend': { gradientFtPerMile: 18, elevationDropFt: 206, velocityFps: 4.0 },
  // Milk Run: Class II-III, mellow canyon
  'arkansas-milk-run': { gradientFtPerMile: 20, elevationDropFt: 140, velocityFps: 4.0 },
  // Canon to Reservoir: Class I-II flatwater tailwater
  'arkansas-canon-to-reservoir': { gradientFtPerMile: 8, elevationDropFt: 264, velocityFps: 2.5 },
  // Town Boat Chute: Class II-III, short urban run
  'arkansas-town-boat-chute': { gradientFtPerMile: 35, elevationDropFt: 55, velocityFps: 5.0 },
  // Pueblo MUP: Class I-II engineered whitewater park
  'arkansas-pueblo-mup': { gradientFtPerMile: 12, elevationDropFt: 60, velocityFps: 3.0 },

  // ── Colorado River (Upper) ───────────────────────────────────────────────
  // Gore Canyon: steepest section on the upper Colorado, Class IV-V
  'colorado-gore-canyon': { gradientFtPerMile: 65, elevationDropFt: 325, velocityFps: 8.0 },
  // Pumphouse: Class II-III intro run
  'colorado-pumphouse': { gradientFtPerMile: 22, elevationDropFt: 308, velocityFps: 4.5 },
  // Shoshone: Class III-IV, famous hydroelectric rapid
  'colorado-shoshone': { gradientFtPerMile: 40, elevationDropFt: 200, velocityFps: 6.0 },
  // South Canyon: Class II-III through canyon walls
  'colorado-south-canyon': { gradientFtPerMile: 18, elevationDropFt: 144, velocityFps: 4.0 },
  // State Bridge to Dotsero: Class I-II flatwater float
  'colorado-state-bridge-to-dotsero': { gradientFtPerMile: 8, elevationDropFt: 360, velocityFps: 2.5 },
  // New Castle to Cameo: Class I-II wide valley
  'colorado-new-castle-to-cameo': { gradientFtPerMile: 7, elevationDropFt: 392, velocityFps: 2.5 },
  // Cameo to Palisade: Class II-III
  'colorado-cameo-to-palisade': { gradientFtPerMile: 12, elevationDropFt: 120, velocityFps: 3.0 },
  // Palisade to Corn Lake: Class I-II
  'colorado-palisade-to-corn-lake': { gradientFtPerMile: 7, elevationDropFt: 56, velocityFps: 2.5 },
  // Ruby-Horsethief: Class I-II desert canyon
  'colorado-ruby-horsethief': { gradientFtPerMile: 6, elevationDropFt: 150, velocityFps: 2.0 },

  // ── Gunnison ────────────────────────────────────────────────────────────
  // Upper Almont: Class II-III meadow/canyon transition
  'gunnison-upper-almont': { gradientFtPerMile: 25, elevationDropFt: 300, velocityFps: 4.5 },
  // Town to Blue Mesa: Class I-II reservoir approach
  'gunnison-town-to-blue-mesa': { gradientFtPerMile: 10, elevationDropFt: 70, velocityFps: 2.5 },
  // Gunnison Gorge: Class III-IV wilderness gorge
  'gunnison-gorge': { gradientFtPerMile: 38, elevationDropFt: 532, velocityFps: 6.0 },
  // Whitewater section near Grand Junction: Class I-II+
  'gunnison-whitewater': { gradientFtPerMile: 12, elevationDropFt: 144, velocityFps: 3.0 },
  // Lower Gunnison: Class I-II+, long flatwater stretch
  'gunnison-lower': { gradientFtPerMile: 6, elevationDropFt: 372, velocityFps: 2.0 },

  // ── Clear Creek ─────────────────────────────────────────────────────────
  // Upper Clear Creek: Class IV-V steep technical
  'clear-creek-upper': { gradientFtPerMile: 90, elevationDropFt: 450, velocityFps: 8.5 },
  // Canyon Mid: Class IV-V continuous
  'clear-creek-canyon-mid': { gradientFtPerMile: 72, elevationDropFt: 684, velocityFps: 8.0 },
  // Lower Clear Creek: Class III-IV+
  'clear-creek-lower': { gradientFtPerMile: 48, elevationDropFt: 384, velocityFps: 6.5 },
  // Headwaters (upper valley): Class II-IV mixed
  'clear-creek-headwaters': { gradientFtPerMile: 55, elevationDropFt: 618, velocityFps: 6.5 },

  // ── Cache la Poudre ─────────────────────────────────────────────────────
  // Headwaters to Narrows: Class IV-V
  'poudre-headwaters-to-narrows': { gradientFtPerMile: 75, elevationDropFt: 1275, velocityFps: 8.5 },
  // Upper Narrows: Class IV-V
  'poudre-upper-narrows': { gradientFtPerMile: 65, elevationDropFt: 390, velocityFps: 8.0 },
  // Mid Canyon: Class III-IV
  'poudre-mid-canyon': { gradientFtPerMile: 35, elevationDropFt: 910, velocityFps: 6.0 },
  // Lower Canyon: Class III-IV
  'poudre-lower-canyon': { gradientFtPerMile: 30, elevationDropFt: 210, velocityFps: 5.5 },
  // Front Range / lower valley: Class I-II
  'poudre-front-range': { gradientFtPerMile: 10, elevationDropFt: 100, velocityFps: 3.0 },

  // ── Roaring Fork ────────────────────────────────────────────────────────
  // Slaughterhouse: Class IV-V, steep urban gorge
  'roaring-fork-slaughterhouse': { gradientFtPerMile: 75, elevationDropFt: 600, velocityFps: 8.5 },
  // Wingo to Hooks: Class II-III
  'roaring-fork-wingo-to-hooks': { gradientFtPerMile: 28, elevationDropFt: 149, velocityFps: 5.0 },
  // Lower Roaring Fork to confluence: Class II-III float
  'roaring-fork-lower': { gradientFtPerMile: 14, elevationDropFt: 308, velocityFps: 3.5 },

  // ── Eagle River ─────────────────────────────────────────────────────────
  // Eagle Main (Dowd Chute): Class III-IV
  'eagle-main': { gradientFtPerMile: 50, elevationDropFt: 300, velocityFps: 6.5 },
  // Vail to Eagle River Park: Class II-III
  'eagle-vail-to-eagle-river-park': { gradientFtPerMile: 22, elevationDropFt: 572, velocityFps: 4.5 },
  // Lower Eagle: Class II-III
  'eagle-lower': { gradientFtPerMile: 18, elevationDropFt: 270, velocityFps: 4.0 },

  // ── Blue River ──────────────────────────────────────────────────────────
  // Below Dillon Reservoir: Class II-III
  'blue-below-dillon': { gradientFtPerMile: 25, elevationDropFt: 200, velocityFps: 4.5 },
  // Columbine to confluence: Class II-III long float
  'blue-columbine-to-confluence': { gradientFtPerMile: 14, elevationDropFt: 417, velocityFps: 3.5 },

  // ── Taylor River ────────────────────────────────────────────────────────
  // Below Taylor Park Dam: Class III-IV tailwater
  'taylor-river-below-dam': { gradientFtPerMile: 32, elevationDropFt: 512, velocityFps: 5.5 },

  // ── Animas River ────────────────────────────────────────────────────────
  // Upper Silverton: Class IV-V remote wilderness
  'animas-upper-silverton': { gradientFtPerMile: 68, elevationDropFt: 1768, velocityFps: 8.0 },
  // Durango section: Class II-III+
  'animas-durango': { gradientFtPerMile: 30, elevationDropFt: 240, velocityFps: 5.0 },
  // Lower Animas: Class I-II flatwater
  'animas-lower': { gradientFtPerMile: 8, elevationDropFt: 136, velocityFps: 2.5 },

  // ── Dolores River ───────────────────────────────────────────────────────
  // Tailwater (below McPhee): Class I-II
  'dolores-tailwater': { gradientFtPerMile: 12, elevationDropFt: 101, velocityFps: 3.0 },
  // Slick Rock Canyon: Class II-III+
  'dolores-slick-rock': { gradientFtPerMile: 10, elevationDropFt: 460, velocityFps: 2.5 },
  // Mesa Canyon: Class I-II+
  'dolores-mesa-canyon': { gradientFtPerMile: 8, elevationDropFt: 280, velocityFps: 2.5 },
  // Gateway: Class II-III desert canyon
  'dolores-gateway': { gradientFtPerMile: 12, elevationDropFt: 360, velocityFps: 3.0 },

  // ── San Miguel River ────────────────────────────────────────────────────
  // Upper San Miguel: Class III-IV steep mountain
  'san-miguel-upper': { gradientFtPerMile: 45, elevationDropFt: 885, velocityFps: 6.5 },
  // Norwood section: Class III-IV canyon
  'san-miguel-norwood': { gradientFtPerMile: 38, elevationDropFt: 684, velocityFps: 6.0 },
  // Lower San Miguel: Class II-III
  'san-miguel-lower': { gradientFtPerMile: 20, elevationDropFt: 380, velocityFps: 4.0 },

  // ── Piedra River ────────────────────────────────────────────────────────
  // Upper Piedra: Class III-IV wilderness
  'piedra-upper': { gradientFtPerMile: 55, elevationDropFt: 307, velocityFps: 7.0 },
  // Lower Box: Class III-IV+
  'piedra-lower-box': { gradientFtPerMile: 48, elevationDropFt: 384, velocityFps: 6.5 },
  // Arboles (lower): Class I-II flatwater
  'piedra-arboles': { gradientFtPerMile: 8, elevationDropFt: 115, velocityFps: 2.5 },

  // ── San Juan River ──────────────────────────────────────────────────────
  // Pagosa Springs: Class II-III
  'san-juan-pagosa': { gradientFtPerMile: 22, elevationDropFt: 132, velocityFps: 4.5 },
  // Headwaters: Class II-III
  'san-juan-headwaters': { gradientFtPerMile: 25, elevationDropFt: 211, velocityFps: 4.5 },
  // Navajo inflow (lower): Class I-II reservoir approach
  'san-juan-navajo-inflow': { gradientFtPerMile: 5, elevationDropFt: 164, velocityFps: 1.8 },

  // ── South Platte ────────────────────────────────────────────────────────
  // Upper South Platte: Class III-IV
  'south-platte-upper': { gradientFtPerMile: 50, elevationDropFt: 276, velocityFps: 6.5 },
  // Waterton Canyon: Class II-III
  'south-platte-waterton': { gradientFtPerMile: 22, elevationDropFt: 132, velocityFps: 4.5 },
  // Deckers: Class II-III+
  'south-platte-deckers': { gradientFtPerMile: 18, elevationDropFt: 180, velocityFps: 4.0 },
  // Denver / urban reach: Class I-II
  'south-platte-denver': { gradientFtPerMile: 8, elevationDropFt: 352, velocityFps: 2.5 },

  // ── North Platte ────────────────────────────────────────────────────────
  // Northgate Canyon: Class II-III remote
  'north-platte-northgate': { gradientFtPerMile: 20, elevationDropFt: 100, velocityFps: 4.0 },

  // ── Yampa River ─────────────────────────────────────────────────────────
  // Cross Mountain Gorge: Class III-IV steep
  'yampa-cross-mountain': { gradientFtPerMile: 40, elevationDropFt: 200, velocityFps: 6.0 },
  // Dinosaur (Gates of Lodore / Yampa Canyon): Class III-IV
  'yampa-dinosaur': { gradientFtPerMile: 12, elevationDropFt: 852, velocityFps: 3.5 },
  // Little Yampa Canyon: Class I-II
  'yampa-little-yampa': { gradientFtPerMile: 7, elevationDropFt: 245, velocityFps: 2.5 },
  // Stagecoach to Craig: Class II-III
  'yampa-stagecoach-to-craig': { gradientFtPerMile: 8, elevationDropFt: 640, velocityFps: 2.5 },
};
