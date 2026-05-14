// Comprehensive seed data for Colorado rafted rivers.
// Sources: USGS site IDs verified via waterdata.usgs.gov, CDSS station abbrevs
// via dwr.state.co.us, flow thresholds from American Whitewater and BLM/USFS.

export const RIVERS = [
	{ id: 'colorado', name: 'Colorado River', state: 'CO', watershed: 'Colorado River Basin', description: 'The major Western river flowing from Rocky Mountain National Park through Grand Valley to Utah. Multiple world-class rafting sections from Class I flatwater to Class V whitewater.' },
	{ id: 'arkansas', name: 'Arkansas River', state: 'CO', watershed: 'Arkansas River Basin', description: 'Most commercially rafted river in the US. Runs from Leadville through Browns Canyon National Monument and Royal Gorge. Flows managed by Fryingpan-Arkansas Project and Voluntary Flow Program.' },
	{ id: 'gunnison', name: 'Gunnison River', state: 'CO', watershed: 'Gunnison River Basin', description: 'Flows through Black Canyon of the Gunnison and Gunnison Gorge. Aspinall Unit dams (Blue Mesa, Morrow Point, Crystal) control flows.' },
	{ id: 'clear-creek', name: 'Clear Creek', state: 'CO', watershed: 'South Platte River Basin', description: 'Front Range whitewater close to Denver. Steep gradient through Clear Creek Canyon with reliable snowmelt-fed flows.' },
	{ id: 'cache-la-poudre', name: 'Cache la Poudre River', state: 'CO', watershed: 'South Platte River Basin', description: 'Colorado\'s only designated Wild and Scenic river. Poudre Canyon offers continuous Class III-IV whitewater during peak runoff.' },
	{ id: 'animas', name: 'Animas River', state: 'CO', watershed: 'San Juan River Basin', description: 'Free-flowing mountain river through Durango and the San Juan Mountains. Snowmelt-dependent with a short but intense rafting season.' },
	{ id: 'dolores', name: 'Dolores River', state: 'CO', watershed: 'Colorado River Basin', description: 'Remote desert canyon river below McPhee Dam. Flows are dam-controlled and highly variable — boatable windows can be brief.' },
	{ id: 'san-miguel', name: 'San Miguel River', state: 'CO', watershed: 'Colorado River Basin', description: 'Free-flowing tributary of the Dolores through the San Miguel Canyon near Telluride and Norwood.' },
	{ id: 'eagle', name: 'Eagle River', state: 'CO', watershed: 'Colorado River Basin', description: 'Runs through Eagle County paralleling I-70. Accessible Front Range day-trip whitewater with good early-season flows.' },
	{ id: 'roaring-fork', name: 'Roaring Fork River', state: 'CO', watershed: 'Colorado River Basin', description: 'Flows from Independence Pass through Aspen to Glenwood Springs. Ruedi Reservoir on Fryingpan tributary influences late-season flows.' },
	{ id: 'yampa', name: 'Yampa River', state: 'CO', watershed: 'Green River Basin', description: 'One of the last large free-flowing rivers in the Colorado system. Dinosaur National Monument section is a premier multi-day wilderness trip.' },
	{ id: 'blue', name: 'Blue River', state: 'CO', watershed: 'Colorado River Basin', description: 'Short whitewater run below Dillon Reservoir near Silverthorne. Dam-controlled flows can extend the season.' },
	{ id: 'piedra', name: 'Piedra River', state: 'CO', watershed: 'San Juan River Basin', description: 'Remote Class III-IV river in the San Juan Mountains near Pagosa Springs with a wilderness section and limited access.' },
	{ id: 'san-juan', name: 'San Juan River', state: 'CO', watershed: 'San Juan River Basin', description: 'Headwaters in the San Juan Mountains. The Pagosa Springs section offers accessible Class II-III water.' },
	{ id: 'north-platte', name: 'North Platte River', state: 'CO', watershed: 'Platte River Basin', description: 'Headwaters in North Park near Walden. Northgate Canyon section offers remote Class II-III water before the river enters Wyoming.' },
	{ id: 'south-platte', name: 'South Platte River', state: 'CO', watershed: 'Platte River Basin', description: 'Front Range river near Denver. Waterton Canyon and Deckers sections offer accessible Class II-III runs.' },
];

export const SECTIONS = [
	// === COLORADO RIVER ===
	{ id: 'colorado-pumphouse', riverId: 'colorado', name: 'Pumphouse to State Bridge', putIn: 'Pumphouse Recreation Site', takeOut: 'State Bridge', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 14, flowLow: 400, flowRunnable: 600, flowIdealMin: 800, flowIdealMax: 2500, flowHigh: 4000, flowExpert: 5500, flowDangerous: 8000, primaryGaugeId: 'usgs-09058000', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09060799', reservoirIds: 'green-mountain', snowpackBasinIds: 'upper-colorado-headwaters', notes: 'Most popular intermediate run on the upper Colorado. Class II-III rapids with one Class III (Eye of the Needle). Put-in at Pumphouse BLM site.', latitude: 39.987, longitude: -106.534 },
	{ id: 'colorado-gore-canyon', riverId: 'colorado', name: 'Gore Canyon', putIn: 'Pumphouse/Gore Canyon trailhead', takeOut: 'Below Gore Canyon', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 5, flowLow: 500, flowRunnable: 700, flowIdealMin: 800, flowIdealMax: 1800, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-09058000', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09060799', reservoirIds: '', snowpackBasinIds: 'upper-colorado-headwaters', notes: 'Expert-only Class IV-V canyon with mandatory portages at some levels. Remote with difficult access. Train tracks alongside. Scouting required.', latitude: 39.951, longitude: -106.502 },
	{ id: 'colorado-shoshone', riverId: 'colorado', name: 'Shoshone / Glenwood Canyon', putIn: 'Shoshone Power Plant', takeOut: 'Grizzly Creek or No Name', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 5, flowLow: 1500, flowRunnable: 2000, flowIdealMin: 3000, flowIdealMax: 8000, flowHigh: 12000, flowExpert: 16000, flowDangerous: 20000, primaryGaugeId: 'usgs-09070500', upstreamGaugeIds: 'usgs-09058000,usgs-09060799', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'upper-colorado-headwaters,eagle-river,roaring-fork', notes: 'High-volume Class III-IV through Glenwood Canyon along I-70. Shoshone rapids are the signature whitewater. Minimum flow maintained by Shoshone hydropower diversion rights.', latitude: 39.567, longitude: -107.239 },
	{ id: 'colorado-south-canyon', riverId: 'colorado', name: 'South Canyon to New Castle', putIn: 'South Canyon', takeOut: 'New Castle', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 8, flowLow: 2000, flowRunnable: 3000, flowIdealMin: 4000, flowIdealMax: 12000, flowHigh: 18000, flowExpert: 22000, flowDangerous: 28000, primaryGaugeId: 'usgs-09085000', upstreamGaugeIds: 'usgs-09070500', downstreamGaugeIds: 'usgs-09095500', reservoirIds: '', snowpackBasinIds: 'upper-colorado-headwaters,roaring-fork', notes: 'Wide, high-volume Class II-III below Glenwood Springs. Good for families and beginners at moderate flows.', latitude: 39.556, longitude: -107.374 },
	{ id: 'colorado-ruby-horsethief', riverId: 'colorado', name: 'Ruby-Horsethief Canyon', putIn: 'Loma boat launch', takeOut: 'Westwater Ranger Station (Utah)', difficultyMin: 'I', difficultyMax: 'II', lengthMiles: 25, flowLow: 1500, flowRunnable: 2000, flowIdealMin: 3000, flowIdealMax: 15000, flowHigh: 25000, flowExpert: 35000, flowDangerous: 45000, primaryGaugeId: 'usgs-09163500', upstreamGaugeIds: 'usgs-09095500', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'upper-colorado-headwaters,gunnison-river', notes: 'Scenic flatwater through red-rock canyons near the Colorado-Utah border. Popular 2-3 day canoe/kayak/raft trip. BLM managed. Permit not required but group size limits apply.', latitude: 39.060, longitude: -108.810 },
	{ id: 'colorado-cameo-to-palisade', riverId: 'colorado', name: 'Cameo to Palisade', putIn: 'Cameo', takeOut: 'Palisade', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 10, flowLow: 2000, flowRunnable: 3000, flowIdealMin: 5000, flowIdealMax: 15000, flowHigh: 20000, flowExpert: 28000, flowDangerous: 35000, primaryGaugeId: 'usgs-09095500', upstreamGaugeIds: 'usgs-09085000', downstreamGaugeIds: 'usgs-09163500', reservoirIds: '', snowpackBasinIds: 'upper-colorado-headwaters,gunnison-river', notes: 'High-volume Class II-III near Grand Junction. De Beque Canyon section upstream is more remote.', latitude: 39.189, longitude: -108.312 },

	// === ARKANSAS RIVER ===
	{ id: 'arkansas-numbers', riverId: 'arkansas', name: 'The Numbers', putIn: 'Railroad Bridge (Granite)', takeOut: 'Buena Vista', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 7, flowLow: 300, flowRunnable: 500, flowIdealMin: 700, flowIdealMax: 1800, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-07087050', upstreamGaugeIds: 'usgs-07086000', downstreamGaugeIds: 'usgs-07091200', reservoirIds: 'twin-lakes,turquoise-lake', snowpackBasinIds: 'arkansas-headwaters', notes: 'Named for numbered mile markers. Steep, continuous Class IV-V whitewater. Commercial trips run at lower flows; expert kayaking at higher flows. Fryingpan-Ark Project releases from Twin Lakes and Turquoise Lake affect flows.', latitude: 38.849, longitude: -106.289 },
	{ id: 'arkansas-fractions', riverId: 'arkansas', name: 'The Fractions (Buena Vista to Nathrop)', putIn: 'Buena Vista', takeOut: 'Nathrop', difficultyMin: 'III', difficultyMax: 'III+', lengthMiles: 9, flowLow: 300, flowRunnable: 400, flowIdealMin: 600, flowIdealMax: 2000, flowHigh: 3000, flowExpert: 4000, flowDangerous: 5500, primaryGaugeId: 'usgs-07091200', upstreamGaugeIds: 'usgs-07087050', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'arkansas-headwaters', notes: 'Class III between Numbers and Browns Canyon. Good intermediate section. Named because rapids are between the Numbers and Browns.', latitude: 38.777, longitude: -106.170 },
	{ id: 'arkansas-browns-canyon', riverId: 'arkansas', name: 'Browns Canyon', putIn: 'Hecla Junction (or Ruby Mountain)', takeOut: 'Stone Bridge / Fisherman\'s Bridge', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 10, flowLow: 300, flowRunnable: 500, flowIdealMin: 700, flowIdealMax: 2500, flowHigh: 3500, flowExpert: 4500, flowDangerous: 6000, primaryGaugeId: 'usgs-07091200', upstreamGaugeIds: 'usgs-07087050', downstreamGaugeIds: 'usgs-07094500', reservoirIds: '', snowpackBasinIds: 'arkansas-headwaters', notes: 'Browns Canyon National Monument. Most popular commercial rafting section in Colorado. Class III-IV rapids including Zoom Flume, Seidel\'s Suckhole, and Staircase. Managed by BLM and USFS.', latitude: 38.702, longitude: -106.085 },
	{ id: 'arkansas-bighorn-sheep', riverId: 'arkansas', name: 'Bighorn Sheep Canyon', putIn: 'Parkdale', takeOut: 'Canon City', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 7, flowLow: 300, flowRunnable: 500, flowIdealMin: 600, flowIdealMax: 3000, flowHigh: 4000, flowExpert: 5000, flowDangerous: 7000, primaryGaugeId: 'usgs-07094500', upstreamGaugeIds: 'usgs-07091200', downstreamGaugeIds: 'usgs-07096000', reservoirIds: 'pueblo', snowpackBasinIds: 'arkansas-headwaters', notes: 'Class III-IV through scenic canyon. Good commercial section. Arkansas Headwaters Recreation Area. Less intimidating than Royal Gorge.', latitude: 38.521, longitude: -105.651 },
	{ id: 'arkansas-royal-gorge', riverId: 'arkansas', name: 'Royal Gorge', putIn: 'Parkdale', takeOut: 'Canon City', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 10, flowLow: 400, flowRunnable: 600, flowIdealMin: 800, flowIdealMax: 2500, flowHigh: 3500, flowExpert: 4500, flowDangerous: 6000, primaryGaugeId: 'usgs-07094500', upstreamGaugeIds: 'usgs-07091200', downstreamGaugeIds: 'usgs-07096000', reservoirIds: 'pueblo', snowpackBasinIds: 'arkansas-headwaters', notes: 'Iconic deep canyon with Class IV-V rapids. Sunshine Falls (Class V) is the crux. Walls rise 1,000+ feet. Commercial and private trips. Below 600 CFS becomes technical Class IV.', latitude: 38.462, longitude: -105.328 },

	// === GUNNISON RIVER ===
	{ id: 'gunnison-upper-almont', riverId: 'gunnison', name: 'Upper Gunnison (Almont to Gunnison)', putIn: 'Almont (confluence of East and Taylor)', takeOut: 'Gunnison', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 12, flowLow: 300, flowRunnable: 500, flowIdealMin: 800, flowIdealMax: 3000, flowHigh: 5000, flowExpert: 7000, flowDangerous: 10000, primaryGaugeId: 'usgs-09114500', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: 'taylor-park', snowpackBasinIds: 'gunnison-river', notes: 'Taylor River and East River converge at Almont. Taylor Park Reservoir releases affect flows. Good intermediate run.', latitude: 38.667, longitude: -106.846 },
	{ id: 'gunnison-gorge', riverId: 'gunnison', name: 'Gunnison Gorge', putIn: 'Chukar Trail / North Fork confluence', takeOut: 'Gunnison Forks (Pleasure Park)', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 14, flowLow: 300, flowRunnable: 500, flowIdealMin: 800, flowIdealMax: 3000, flowHigh: 5000, flowExpert: 7000, flowDangerous: 10000, primaryGaugeId: 'usgs-09128000', upstreamGaugeIds: 'usgs-09114500', downstreamGaugeIds: 'usgs-09152500', reservoirIds: 'blue-mesa,morrow-point,crystal-dam', snowpackBasinIds: 'gunnison-river', notes: 'BLM Wilderness Study Area below Black Canyon. Permit required (lottery for commercial, self-issue for private). Aspinall Unit dams control flows. Class III-IV rapids, excellent trout fishing.', latitude: 38.650, longitude: -107.750 },
	{ id: 'gunnison-whitewater', riverId: 'gunnison', name: 'Whitewater to Grand Junction', putIn: 'Whitewater', takeOut: 'Grand Junction (confluence with Colorado)', difficultyMin: 'I', difficultyMax: 'II', lengthMiles: 12, flowLow: 500, flowRunnable: 1000, flowIdealMin: 1500, flowIdealMax: 5000, flowHigh: 8000, flowExpert: 12000, flowDangerous: 18000, primaryGaugeId: 'usgs-09152500', upstreamGaugeIds: 'usgs-09128000', downstreamGaugeIds: '', reservoirIds: 'blue-mesa,morrow-point,crystal-dam', snowpackBasinIds: 'gunnison-river', notes: 'Wide, mellow Class I-II through Grand Valley. Good float and fishing. Joins Colorado River at Grand Junction.', latitude: 38.825, longitude: -108.450 },

	// === CLEAR CREEK ===
	{ id: 'clear-creek-upper', riverId: 'clear-creek', name: 'Upper Clear Creek (Idaho Springs to Lawson)', putIn: 'Idaho Springs', takeOut: 'Lawson', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 5, flowLow: 150, flowRunnable: 250, flowIdealMin: 350, flowIdealMax: 800, flowHigh: 1200, flowExpert: 1500, flowDangerous: 2000, primaryGaugeId: 'usgs-06716500', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-06719505', reservoirIds: '', snowpackBasinIds: 'south-platte-headwaters', notes: 'Steep, technical Class IV-V close to Denver. Short season during peak runoff. Expert kayakers and commercial trips.', latitude: 39.741, longitude: -105.513 },
	{ id: 'clear-creek-lower', riverId: 'clear-creek', name: 'Lower Clear Creek Canyon', putIn: 'Above Tunnel 1 / Mayhem', takeOut: 'Golden', difficultyMin: 'III', difficultyMax: 'IV+', lengthMiles: 8, flowLow: 150, flowRunnable: 200, flowIdealMin: 300, flowIdealMax: 700, flowHigh: 1000, flowExpert: 1300, flowDangerous: 1800, primaryGaugeId: 'usgs-06719505', upstreamGaugeIds: 'usgs-06716500', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'south-platte-headwaters', notes: 'Popular Front Range whitewater in Clear Creek Canyon. Numerous rapids, good road access. Commercials run lower section. Kayakers run the full canyon.', latitude: 39.736, longitude: -105.290 },

	// === CACHE LA POUDRE ===
	{ id: 'poudre-upper-narrows', riverId: 'cache-la-poudre', name: 'Upper Poudre / Narrows', putIn: 'Poudre Park', takeOut: 'Stevens Gulch', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 6, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1200, flowHigh: 1800, flowExpert: 2500, flowDangerous: 3500, primaryGaugeId: 'usgs-06752260', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'cache-la-poudre', notes: 'Colorado\'s only Wild and Scenic river. Class IV-V Narrows section with continuous rapids. Peak season late May-June. Free-flowing, no dams.', latitude: 40.685, longitude: -105.329 },
	{ id: 'poudre-lower-canyon', riverId: 'cache-la-poudre', name: 'Lower Poudre Canyon (Filter Plant)', putIn: 'Filter Plant', takeOut: 'Picnic Rock', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 7, flowLow: 200, flowRunnable: 300, flowIdealMin: 400, flowIdealMax: 1200, flowHigh: 1800, flowExpert: 2400, flowDangerous: 3500, primaryGaugeId: 'usgs-06752260', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'cache-la-poudre', notes: 'Commercial rafting section. Class III-IV with Pineview Falls, Mad Dog, and Bridges rapids. Good road access along CO-14.', latitude: 40.670, longitude: -105.280 },

	// === ANIMAS ===
	{ id: 'animas-upper-silverton', riverId: 'animas', name: 'Upper Animas (Silverton to Rockwood)', putIn: 'Silverton', takeOut: 'Rockwood', difficultyMin: 'IV', difficultyMax: 'V+', lengthMiles: 26, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1200, flowHigh: 2000, flowExpert: 3000, flowDangerous: 4500, primaryGaugeId: 'usgs-09357500', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09361500', reservoirIds: '', snowpackBasinIds: 'animas-river', notes: 'Remote expert-only multi-day wilderness trip. No road access for 20+ miles. Railroad access only. Class IV-V with several mandatory portages at high water.', latitude: 37.721, longitude: -107.590 },
	{ id: 'animas-durango', riverId: 'animas', name: 'Animas through Durango', putIn: 'Trimble Bridge / Santa Rita', takeOut: 'Dallabetta Park / 32nd St', difficultyMin: 'II', difficultyMax: 'III+', lengthMiles: 8, flowLow: 300, flowRunnable: 500, flowIdealMin: 800, flowIdealMax: 3000, flowHigh: 5000, flowExpert: 7000, flowDangerous: 10000, primaryGaugeId: 'usgs-09361500', upstreamGaugeIds: 'usgs-09357500', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'animas-river', notes: 'Town run through Durango. Smelter Rapid is the main Class III feature. Very popular commercial and private run. Snowmelt peak typically mid-June.', latitude: 37.275, longitude: -107.880 },

	// === DOLORES ===
	{ id: 'dolores-slick-rock', riverId: 'dolores', name: 'Slick Rock Canyon', putIn: 'Bradfield Bridge', takeOut: 'Bedrock', difficultyMin: 'II', difficultyMax: 'III+', lengthMiles: 46, flowLow: 500, flowRunnable: 800, flowIdealMin: 1000, flowIdealMax: 4000, flowHigh: 6000, flowExpert: 8000, flowDangerous: 12000, primaryGaugeId: 'usgs-09169500', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: 'mcphee', snowpackBasinIds: 'san-juan-dolores', notes: 'Premier multi-day desert canyon trip. Flows entirely dependent on McPhee Dam releases — boatable windows can be very short (days to weeks). BLM managed, no permit required but limited camping. Check dam releases before planning.', latitude: 38.028, longitude: -108.899 },
	{ id: 'dolores-gateway', riverId: 'dolores', name: 'Gateway Canyon (Dolores to Gateway)', putIn: 'Below Slick Rock', takeOut: 'Gateway', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 30, flowLow: 400, flowRunnable: 600, flowIdealMin: 800, flowIdealMax: 3000, flowHigh: 5000, flowExpert: 7000, flowDangerous: 10000, primaryGaugeId: 'usgs-09171100', upstreamGaugeIds: 'usgs-09169500', downstreamGaugeIds: '', reservoirIds: 'mcphee', snowpackBasinIds: 'san-juan-dolores', notes: 'Continuation below Slick Rock Canyon. Remote desert canyon. Also McPhee Dam dependent.', latitude: 38.477, longitude: -108.983 },

	// === SAN MIGUEL ===
	{ id: 'san-miguel-norwood', riverId: 'san-miguel', name: 'Norwood Canyon', putIn: 'Norwood Bridge', takeOut: 'Naturita', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 18, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1500, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-09172500', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'san-juan-dolores', notes: 'Free-flowing tributary of the Dolores. Short but intense season during peak snowmelt. Remote canyon with limited access.', latitude: 38.147, longitude: -108.646 },

	// === EAGLE ===
	{ id: 'eagle-main', riverId: 'eagle', name: 'Eagle River (Minturn to Dowd Junction)', putIn: 'Minturn', takeOut: 'Dowd Junction', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 6, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1500, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-09064600', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09070000', reservoirIds: '', snowpackBasinIds: 'eagle-river', notes: 'Roadside Class III-IV near Vail. Accessible along I-70. Good early-season Front Range day trip. Snowmelt-fed.', latitude: 39.592, longitude: -106.424 },
	{ id: 'eagle-lower', riverId: 'eagle', name: 'Lower Eagle (Eagle to Dotsero)', putIn: 'Town of Eagle', takeOut: 'Dotsero', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 15, flowLow: 300, flowRunnable: 500, flowIdealMin: 700, flowIdealMax: 2000, flowHigh: 3500, flowExpert: 5000, flowDangerous: 7000, primaryGaugeId: 'usgs-09070000', upstreamGaugeIds: 'usgs-09064600', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'eagle-river', notes: 'Class II-III below the Town of Eagle. Joins Colorado River at Dotsero. Longer season than upper section.', latitude: 39.636, longitude: -106.819 },

	// === ROARING FORK ===
	{ id: 'roaring-fork-slaughterhouse', riverId: 'roaring-fork', name: 'Slaughterhouse Falls (Upper Roaring Fork)', putIn: 'Aspen', takeOut: 'Below Woody Creek', difficultyMin: 'IV', difficultyMax: 'V', lengthMiles: 8, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1200, flowHigh: 1800, flowExpert: 2500, flowDangerous: 4000, primaryGaugeId: 'usgs-09073300', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09085000', reservoirIds: '', snowpackBasinIds: 'roaring-fork', notes: 'Expert Class IV-V near Aspen. Slaughterhouse Falls is a notable Class V drop. Short season, snowmelt-dependent.', latitude: 39.195, longitude: -106.867 },
	{ id: 'roaring-fork-lower', riverId: 'roaring-fork', name: 'Lower Roaring Fork (Basalt to Glenwood)', putIn: 'Basalt', takeOut: 'Glenwood Springs', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 22, flowLow: 400, flowRunnable: 600, flowIdealMin: 800, flowIdealMax: 3000, flowHigh: 5000, flowExpert: 7000, flowDangerous: 10000, primaryGaugeId: 'usgs-09085000', upstreamGaugeIds: 'usgs-09073300', downstreamGaugeIds: '', reservoirIds: 'ruedi', snowpackBasinIds: 'roaring-fork', notes: 'Class II-III from Basalt to confluence with Colorado at Glenwood Springs. Ruedi Reservoir on Fryingpan tributary helps sustain late-season flows. Commercial trips available.', latitude: 39.417, longitude: -107.167 },

	// === YAMPA ===
	{ id: 'yampa-cross-mountain', riverId: 'yampa', name: 'Cross Mountain Gorge', putIn: 'Deerlodge Park Road', takeOut: 'Below Cross Mountain', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 5, flowLow: 500, flowRunnable: 1000, flowIdealMin: 2000, flowIdealMax: 8000, flowHigh: 12000, flowExpert: 16000, flowDangerous: 22000, primaryGaugeId: 'usgs-09251000', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09260050', reservoirIds: '', snowpackBasinIds: 'yampa-river', notes: 'Short, scenic gorge run above Dinosaur. Free-flowing — one of last un-dammed rivers in the Colorado system. Class III-IV, best at moderate flows.', latitude: 40.520, longitude: -108.450 },
	{ id: 'yampa-dinosaur', riverId: 'yampa', name: 'Yampa through Dinosaur National Monument', putIn: 'Deerlodge Park', takeOut: 'Split Mountain (Green River confluence)', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 71, flowLow: 800, flowRunnable: 1500, flowIdealMin: 3000, flowIdealMax: 12000, flowHigh: 18000, flowExpert: 25000, flowDangerous: 35000, primaryGaugeId: 'usgs-09260050', upstreamGaugeIds: 'usgs-09251000', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'yampa-river', notes: 'Premier 3-5 day wilderness trip. NPS permit required (lottery, very competitive). Warm Springs Rapid is a significant Class IV. Free-flowing river. Season typically late May through early July.', latitude: 40.448, longitude: -108.525 },

	// === BLUE RIVER ===
	{ id: 'blue-below-dillon', riverId: 'blue', name: 'Blue River (Below Dillon Dam)', putIn: 'Below Dillon Dam', takeOut: 'Green Mountain Reservoir', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 8, flowLow: 100, flowRunnable: 200, flowIdealMin: 300, flowIdealMax: 800, flowHigh: 1200, flowExpert: 1600, flowDangerous: 2200, primaryGaugeId: 'usgs-09050700', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: 'dillon,green-mountain', snowpackBasinIds: 'blue-river', notes: 'Dam-controlled flows from Dillon Reservoir. Class II-III with reliable flows. Short section near Silverthorne. Gold Medal fishing water.', latitude: 39.618, longitude: -106.072 },

	// === PIEDRA ===
	{ id: 'piedra-lower-box', riverId: 'piedra', name: 'Lower Piedra Box Canyon', putIn: 'Lower Piedra Road Bridge', takeOut: 'Navajo Reservoir backwater', difficultyMin: 'III', difficultyMax: 'IV+', lengthMiles: 8, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1500, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-09349800', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'san-juan-dolores', notes: 'Remote Class III-IV box canyon in the San Juans. Limited access, no road along river. Piedra River Wilderness section. Short snowmelt season.', latitude: 37.181, longitude: -107.367 },

	// === SAN JUAN ===
	{ id: 'san-juan-pagosa', riverId: 'san-juan', name: 'San Juan through Pagosa Springs', putIn: 'Above Pagosa Springs', takeOut: 'Below town', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 6, flowLow: 200, flowRunnable: 350, flowIdealMin: 500, flowIdealMax: 1500, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-09342500', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'san-juan-dolores', notes: 'Class II-III town run through Pagosa Springs. Accessible, family-friendly at moderate flows. Snowmelt-fed, short season.', latitude: 37.264, longitude: -107.010 },

	// === NORTH PLATTE ===
	{ id: 'north-platte-northgate', riverId: 'north-platte', name: 'Northgate Canyon', putIn: 'Routt National Forest access', takeOut: 'Below canyon', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 5, flowLow: 200, flowRunnable: 400, flowIdealMin: 600, flowIdealMax: 1500, flowHigh: 2500, flowExpert: 3500, flowDangerous: 5000, primaryGaugeId: 'usgs-06620000', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'north-platte', notes: 'Remote canyon run in North Park near Wyoming border. Class II-III through scenic granite canyon. Short season, limited access.', latitude: 40.935, longitude: -106.510 },

	// === SOUTH PLATTE ===
	{ id: 'south-platte-waterton', riverId: 'south-platte', name: 'Waterton Canyon', putIn: 'Waterton Canyon trailhead', takeOut: 'Chatfield Reservoir', difficultyMin: 'II', difficultyMax: 'III', lengthMiles: 6, flowLow: 100, flowRunnable: 200, flowIdealMin: 300, flowIdealMax: 800, flowHigh: 1200, flowExpert: 1800, flowDangerous: 2500, primaryGaugeId: 'usgs-06710247', upstreamGaugeIds: '', downstreamGaugeIds: '', reservoirIds: '', snowpackBasinIds: 'south-platte-headwaters', notes: 'Closest whitewater to Denver. Limited access — no vehicles in canyon, hike-in or bike-in. Class II-III during peak runoff.', latitude: 39.440, longitude: -105.100 },
	{ id: 'south-platte-deckers', riverId: 'south-platte', name: 'Deckers to Nighthawk', putIn: 'Deckers', takeOut: 'Nighthawk', difficultyMin: 'II', difficultyMax: 'III+', lengthMiles: 10, flowLow: 100, flowRunnable: 200, flowIdealMin: 300, flowIdealMax: 700, flowHigh: 1000, flowExpert: 1500, flowDangerous: 2000, primaryGaugeId: 'usgs-06701900', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-06710247', reservoirIds: '', snowpackBasinIds: 'south-platte-headwaters', notes: 'Class II-III+ in a scenic canyon southwest of Denver. Below Cheesman Reservoir. Popular fishing and kayaking.', latitude: 39.237, longitude: -105.184 },

	// === TAYLOR RIVER ===
	{ id: 'taylor-river-below-dam', riverId: 'gunnison', name: 'Taylor River (Below Taylor Park Dam)', putIn: 'Taylor Park Dam', takeOut: 'Almont', difficultyMin: 'III', difficultyMax: 'IV', lengthMiles: 16, flowLow: 100, flowRunnable: 200, flowIdealMin: 300, flowIdealMax: 700, flowHigh: 1000, flowExpert: 1400, flowDangerous: 2000, primaryGaugeId: 'usgs-09110000', upstreamGaugeIds: '', downstreamGaugeIds: 'usgs-09114500', reservoirIds: 'taylor-park', snowpackBasinIds: 'gunnison-river', notes: 'Dam-controlled flows from Taylor Park Reservoir. Class III-IV canyon. Popular commercial and kayak section. Reliable flows through summer.', latitude: 38.783, longitude: -106.700 },
];

export const GAUGES = [
	// === COLORADO RIVER GAUGES ===
	{ id: 'usgs-09058000', name: 'Colorado River near Kremmling, CO', source: 'usgs', sourceId: '09058000', riverId: 'colorado', latitude: 40.038, longitude: -106.440, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09058000', active: true },
	{ id: 'usgs-09060799', name: 'Colorado River near Dotsero, CO', source: 'usgs', sourceId: '09060799', riverId: 'colorado', latitude: 39.649, longitude: -107.059, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09060799', active: true },
	{ id: 'usgs-09070500', name: 'Colorado River near Dotsero, CO', source: 'usgs', sourceId: '09070500', riverId: 'colorado', latitude: 39.567, longitude: -107.239, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09070500', active: true },
	{ id: 'usgs-09085000', name: 'Roaring Fork River at Glenwood Springs, CO', source: 'usgs', sourceId: '09085000', riverId: 'roaring-fork', latitude: 39.544, longitude: -107.328, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09085000', active: true },
	{ id: 'usgs-09095500', name: 'Colorado River near Cameo, CO', source: 'usgs', sourceId: '09095500', riverId: 'colorado', latitude: 39.239, longitude: -108.316, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09095500', active: true },
	{ id: 'usgs-09163500', name: 'Colorado River near Colorado-Utah State Line', source: 'usgs', sourceId: '09163500', riverId: 'colorado', latitude: 39.126, longitude: -109.025, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09163500', active: true },

	// === ARKANSAS RIVER GAUGES ===
	{ id: 'usgs-07086000', name: 'Arkansas River at Granite, CO', source: 'usgs', sourceId: '07086000', riverId: 'arkansas', latitude: 39.032, longitude: -106.437, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=07086000', active: true },
	{ id: 'usgs-07087050', name: 'Arkansas River near Wellsville, CO', source: 'usgs', sourceId: '07087050', riverId: 'arkansas', latitude: 38.511, longitude: -105.902, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=07087050', active: true },
	{ id: 'usgs-07091200', name: 'Arkansas River at Salida, CO', source: 'usgs', sourceId: '07091200', riverId: 'arkansas', latitude: 38.530, longitude: -105.997, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=07091200', active: true },
	{ id: 'usgs-07094500', name: 'Arkansas River at Parkdale, CO', source: 'usgs', sourceId: '07094500', riverId: 'arkansas', latitude: 38.491, longitude: -105.373, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=07094500', active: true },
	{ id: 'usgs-07096000', name: 'Arkansas River at Canon City, CO', source: 'usgs', sourceId: '07096000', riverId: 'arkansas', latitude: 38.441, longitude: -105.214, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=07096000', active: true },

	// === GUNNISON RIVER GAUGES ===
	{ id: 'usgs-09110000', name: 'Taylor River at Almont, CO', source: 'usgs', sourceId: '09110000', riverId: 'gunnison', latitude: 38.666, longitude: -106.845, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09110000', active: true },
	{ id: 'usgs-09114500', name: 'Gunnison River near Gunnison, CO', source: 'usgs', sourceId: '09114500', riverId: 'gunnison', latitude: 38.526, longitude: -106.942, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09114500', active: true },
	{ id: 'usgs-09128000', name: 'Gunnison River below Gunnison Tunnel, CO', source: 'usgs', sourceId: '09128000', riverId: 'gunnison', latitude: 38.531, longitude: -107.648, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09128000', active: true },
	{ id: 'usgs-09152500', name: 'Gunnison River near Grand Junction, CO', source: 'usgs', sourceId: '09152500', riverId: 'gunnison', latitude: 38.983, longitude: -108.583, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09152500', active: true },

	// === CLEAR CREEK GAUGES ===
	{ id: 'usgs-06716500', name: 'Clear Creek near Lawson, CO', source: 'usgs', sourceId: '06716500', riverId: 'clear-creek', latitude: 39.764, longitude: -105.624, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06716500', active: true },
	{ id: 'usgs-06719505', name: 'Clear Creek at Golden, CO', source: 'usgs', sourceId: '06719505', riverId: 'clear-creek', latitude: 39.754, longitude: -105.223, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06719505', active: true },

	// === CACHE LA POUDRE GAUGES ===
	{ id: 'usgs-06752260', name: 'Cache la Poudre River at Canyon Mouth, CO', source: 'usgs', sourceId: '06752260', riverId: 'cache-la-poudre', latitude: 40.665, longitude: -105.225, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06752260', active: true },

	// === ANIMAS GAUGES ===
	{ id: 'usgs-09357500', name: 'Animas River at Howardsville, CO', source: 'usgs', sourceId: '09357500', riverId: 'animas', latitude: 37.834, longitude: -107.596, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09357500', active: true },
	{ id: 'usgs-09361500', name: 'Animas River at Durango, CO', source: 'usgs', sourceId: '09361500', riverId: 'animas', latitude: 37.278, longitude: -107.880, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09361500', active: true },

	// === DOLORES GAUGES ===
	{ id: 'usgs-09169500', name: 'Dolores River at Dolores, CO', source: 'usgs', sourceId: '09169500', riverId: 'dolores', latitude: 37.471, longitude: -108.499, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09169500', active: true },
	{ id: 'usgs-09171100', name: 'Dolores River near Bedrock, CO', source: 'usgs', sourceId: '09171100', riverId: 'dolores', latitude: 38.304, longitude: -108.831, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09171100', active: true },

	// === SAN MIGUEL GAUGES ===
	{ id: 'usgs-09172500', name: 'San Miguel River near Placerville, CO', source: 'usgs', sourceId: '09172500', riverId: 'san-miguel', latitude: 38.003, longitude: -108.209, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09172500', active: true },

	// === EAGLE RIVER GAUGES ===
	{ id: 'usgs-09064600', name: 'Eagle River near Minturn, CO', source: 'usgs', sourceId: '09064600', riverId: 'eagle', latitude: 39.584, longitude: -106.376, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09064600', active: true },
	{ id: 'usgs-09070000', name: 'Eagle River below Gypsum, CO', source: 'usgs', sourceId: '09070000', riverId: 'eagle', latitude: 39.644, longitude: -106.953, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09070000', active: true },

	// === ROARING FORK GAUGES ===
	{ id: 'usgs-09073300', name: 'Roaring Fork River above Aspen, CO', source: 'usgs', sourceId: '09073300', riverId: 'roaring-fork', latitude: 39.199, longitude: -106.843, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09073300', active: true },

	// === YAMPA GAUGES ===
	{ id: 'usgs-09251000', name: 'Yampa River near Maybell, CO', source: 'usgs', sourceId: '09251000', riverId: 'yampa', latitude: 40.491, longitude: -108.033, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09251000', active: true },
	{ id: 'usgs-09260050', name: 'Yampa River at Deerlodge Park, CO', source: 'usgs', sourceId: '09260050', riverId: 'yampa', latitude: 40.449, longitude: -108.530, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09260050', active: true },

	// === BLUE RIVER GAUGES ===
	{ id: 'usgs-09050700', name: 'Blue River below Dillon, CO', source: 'usgs', sourceId: '09050700', riverId: 'blue', latitude: 39.623, longitude: -106.049, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09050700', active: true },

	// === PIEDRA GAUGES ===
	{ id: 'usgs-09349800', name: 'Piedra River near Arboles, CO', source: 'usgs', sourceId: '09349800', riverId: 'piedra', latitude: 37.148, longitude: -107.380, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09349800', active: true },

	// === SAN JUAN GAUGES ===
	{ id: 'usgs-09342500', name: 'San Juan River at Pagosa Springs, CO', source: 'usgs', sourceId: '09342500', riverId: 'san-juan', latitude: 37.264, longitude: -107.009, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=09342500', active: true },

	// === NORTH PLATTE GAUGES ===
	{ id: 'usgs-06620000', name: 'North Platte River near Northgate, CO', source: 'usgs', sourceId: '06620000', riverId: 'north-platte', latitude: 40.945, longitude: -106.337, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06620000', active: true },

	// === SOUTH PLATTE GAUGES ===
	{ id: 'usgs-06701900', name: 'South Platte River near Deckers, CO', source: 'usgs', sourceId: '06701900', riverId: 'south-platte', latitude: 39.239, longitude: -105.195, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06701900', active: true },
	{ id: 'usgs-06710247', name: 'South Platte River at Waterton, CO', source: 'usgs', sourceId: '06710247', riverId: 'south-platte', latitude: 39.487, longitude: -105.095, parameter: 'discharge', unit: 'cfs', url: 'https://waterdata.usgs.gov/nwis/uv?site_no=06710247', active: true },
];

export const RESERVOIRS = [
	{ id: 'blue-mesa', name: 'Blue Mesa Reservoir', riverId: 'gunnison', operator: 'Bureau of Reclamation', latitude: 38.458, longitude: -107.324, maxStorageAcreFt: 829500, normalElevationFt: 7519.4, sourceId: '913', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Largest reservoir in Colorado. Part of Aspinall Unit. Controls Gunnison River flows downstream through Morrow Point and Crystal.' },
	{ id: 'morrow-point', name: 'Morrow Point Reservoir', riverId: 'gunnison', operator: 'Bureau of Reclamation', latitude: 38.451, longitude: -107.534, maxStorageAcreFt: 117190, normalElevationFt: 7160, sourceId: '915', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Middle reservoir of Aspinall Unit in Black Canyon. Hydroelectric generation.' },
	{ id: 'crystal-dam', name: 'Crystal Reservoir', riverId: 'gunnison', operator: 'Bureau of Reclamation', latitude: 38.499, longitude: -107.625, maxStorageAcreFt: 25600, normalElevationFt: 6755, sourceId: '914', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Lowest of the three Aspinall Unit dams. Outflow feeds Gunnison Gorge.' },
	{ id: 'taylor-park', name: 'Taylor Park Reservoir', riverId: 'gunnison', operator: 'Bureau of Reclamation', latitude: 38.819, longitude: -106.612, maxStorageAcreFt: 106200, normalElevationFt: 9330, sourceId: '916', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Headwater reservoir on Taylor River. Releases sustain Taylor River kayaking and fishing below dam.' },
	{ id: 'pueblo', name: 'Pueblo Reservoir', riverId: 'arkansas', operator: 'Bureau of Reclamation', latitude: 38.268, longitude: -104.870, maxStorageAcreFt: 357678, normalElevationFt: 4898.7, sourceId: '919', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Key Arkansas River storage. Fryingpan-Arkansas Project. Outflows affect downstream flows but main rafting sections are upstream.' },
	{ id: 'twin-lakes', name: 'Twin Lakes Reservoir', riverId: 'arkansas', operator: 'Bureau of Reclamation', latitude: 39.078, longitude: -106.363, maxStorageAcreFt: 141000, normalElevationFt: 9210, sourceId: '920', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Fryingpan-Arkansas Project storage on Lake Creek near Leadville. Releases flow into Arkansas River above The Numbers section.' },
	{ id: 'turquoise-lake', name: 'Turquoise Lake', riverId: 'arkansas', operator: 'Bureau of Reclamation', latitude: 39.261, longitude: -106.386, maxStorageAcreFt: 129440, normalElevationFt: 9868, sourceId: '918', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Fryingpan-Arkansas terminal reservoir near Leadville. Receives transmountain diversions. Releases into Lake Fork Arkansas and into Arkansas via pipeline.' },
	{ id: 'green-mountain', name: 'Green Mountain Reservoir', riverId: 'blue', operator: 'Bureau of Reclamation', latitude: 39.882, longitude: -106.336, maxStorageAcreFt: 154645, normalElevationFt: 7943, sourceId: '912', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'On the Blue River. Colorado-Big Thompson replacement reservoir. Releases affect upper Colorado River near Kremmling.' },
	{ id: 'dillon', name: 'Dillon Reservoir', riverId: 'blue', operator: 'Denver Water', latitude: 39.627, longitude: -106.070, maxStorageAcreFt: 257000, normalElevationFt: 9017, sourceId: '911', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Denver Water supply reservoir on Blue River. Dam-controlled flows sustain Blue River below.' },
	{ id: 'ruedi', name: 'Ruedi Reservoir', riverId: 'roaring-fork', operator: 'Bureau of Reclamation', latitude: 39.356, longitude: -106.819, maxStorageAcreFt: 102000, normalElevationFt: 7766, sourceId: '917', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'On Fryingpan River, tributary of Roaring Fork. Fryingpan-Arkansas Project. Releases help sustain Roaring Fork flows.' },
	{ id: 'mcphee', name: 'McPhee Reservoir', riverId: 'dolores', operator: 'Bureau of Reclamation', latitude: 37.568, longitude: -108.574, maxStorageAcreFt: 381100, normalElevationFt: 6924, sourceId: '921', source: 'bor-rise', url: 'https://data.usbr.gov/', notes: 'Second-largest reservoir in Colorado. Dolores Project. Controls all downstream Dolores River flows — rafting is entirely dependent on release timing and volume.' },
];

export const SNOWPACK_BASINS = [
	{ id: 'upper-colorado-headwaters', name: 'Upper Colorado Headwaters', state: 'CO', huc: '14010001', relevantRiverIds: 'colorado', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'blue-river', name: 'Blue River Basin', state: 'CO', huc: '14010002', relevantRiverIds: 'blue', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'eagle-river', name: 'Eagle River Basin', state: 'CO', huc: '14010003', relevantRiverIds: 'eagle', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'roaring-fork', name: 'Roaring Fork Basin', state: 'CO', huc: '14010004', relevantRiverIds: 'roaring-fork', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'gunnison-river', name: 'Gunnison River Basin', state: 'CO', huc: '14020001', relevantRiverIds: 'gunnison', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'arkansas-headwaters', name: 'Arkansas Headwaters', state: 'CO', huc: '11020001', relevantRiverIds: 'arkansas', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'south-platte-headwaters', name: 'South Platte Headwaters', state: 'CO', huc: '10190001', relevantRiverIds: 'south-platte,clear-creek', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'cache-la-poudre', name: 'Cache la Poudre Basin', state: 'CO', huc: '10190007', relevantRiverIds: 'cache-la-poudre', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'yampa-river', name: 'Yampa River Basin', state: 'CO', huc: '14050001', relevantRiverIds: 'yampa', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'san-juan-dolores', name: 'San Juan / Dolores Basin', state: 'CO', huc: '14080101', relevantRiverIds: 'dolores,san-juan,san-miguel,piedra', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'animas-river', name: 'Animas River Basin', state: 'CO', huc: '14080104', relevantRiverIds: 'animas', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
	{ id: 'north-platte', name: 'North Platte Headwaters', state: 'CO', huc: '10180001', relevantRiverIds: 'north-platte', source: 'snotel', url: 'https://wcc.sc.egov.usda.gov/awdbRestApi' },
];

export const DATA_SOURCES = [
	{ id: 'usgs', name: 'USGS Water Services', type: 'gauge', baseUrl: 'https://waterservices.usgs.gov/nwis', description: 'USGS instantaneous and daily streamflow data', updateFrequencyMinutes: 15, active: true, lastFetchAt: null, lastError: null },
	{ id: 'cdss', name: 'Colorado CDSS / DWR', type: 'gauge', baseUrl: 'https://dwr.state.co.us/Rest/GET/api/v2', description: 'Colorado Division of Water Resources telemetry and surface water data', updateFrequencyMinutes: 15, active: true, lastFetchAt: null, lastError: null },
	{ id: 'snotel', name: 'NRCS SNOTEL', type: 'snowpack', baseUrl: 'https://wcc.sc.egov.usda.gov/awdbRestApi', description: 'Snow water equivalent, depth, and precipitation from SNOTEL stations', updateFrequencyMinutes: 360, active: true, lastFetchAt: null, lastError: null },
	{ id: 'bor', name: 'Bureau of Reclamation RISE', type: 'reservoir', baseUrl: 'https://data.usbr.gov/rise/api', description: 'Reservoir storage, elevation, inflow, and outflow data', updateFrequencyMinutes: 360, active: true, lastFetchAt: null, lastError: null },
	{ id: 'noaa', name: 'NOAA / CBRFC', type: 'forecast', baseUrl: 'https://www.cbrfc.noaa.gov', description: 'Colorado Basin River Forecast Center runoff forecasts', updateFrequencyMinutes: 720, active: true, lastFetchAt: null, lastError: null },
];

// === FLOW BANDS ===
// Per (section, craft, skill) sets of bands describing what each flow level
// means. Generated from per-section baselines + craft/skill multipliers.
// Browns Canyon raft+intermediate has hand-authored copy; the rest is
// templated. All editable in admin later.

type CraftType = 'raft' | 'paddle-raft' | 'kayak';
type SkillLevel = 'beginner' | 'intermediate' | 'expert';

interface SectionBaseline {
	sectionId: string;
	shortName: string;
	// raft + intermediate breakpoints (cfs). other crafts/skills are derived.
	tooLowMax: number;
	lowRunnableMax: number;
	idealMin: number;
	idealMax: number;
	pushyMax: number;
	expertMax: number;
	character: string; // 1-line section character used in templated copy
}

const ARK_BASELINES: SectionBaseline[] = [
	{
		sectionId: 'arkansas-numbers',
		shortName: 'The Numbers',
		tooLowMax: 299,
		lowRunnableMax: 499,
		idealMin: 700,
		idealMax: 1800,
		pushyMax: 2500,
		expertMax: 3500,
		character: 'continuous Class IV-V whitewater',
	},
	{
		sectionId: 'arkansas-fractions',
		shortName: 'The Fractions',
		tooLowMax: 299,
		lowRunnableMax: 399,
		idealMin: 600,
		idealMax: 2000,
		pushyMax: 3000,
		expertMax: 4000,
		character: 'intermediate Class III between Numbers and Browns',
	},
	{
		sectionId: 'arkansas-browns-canyon',
		shortName: 'Browns Canyon',
		tooLowMax: 349,
		lowRunnableMax: 499,
		idealMin: 700,
		idealMax: 2500,
		pushyMax: 3500,
		expertMax: 4500,
		character: 'classic Class III-IV with Zoom Flume, Seidel\'s Suckhole, and Staircase',
	},
	{
		sectionId: 'arkansas-bighorn-sheep',
		shortName: 'Bighorn Sheep Canyon',
		tooLowMax: 299,
		lowRunnableMax: 499,
		idealMin: 600,
		idealMax: 3000,
		pushyMax: 4000,
		expertMax: 5000,
		character: 'Class III-IV scenic canyon, friendlier than the Gorge',
	},
	{
		sectionId: 'arkansas-royal-gorge',
		shortName: 'Royal Gorge',
		tooLowMax: 399,
		lowRunnableMax: 599,
		idealMin: 800,
		idealMax: 2500,
		pushyMax: 3500,
		expertMax: 4500,
		character: 'Class IV-V deep-canyon big water with Sunshine Falls',
	},
];

// Multipliers shift all thresholds for a given (craft, skill) relative to
// the raft+intermediate baseline. Smaller = the band starts at lower cfs
// (this craft/skill can handle less water).
const CRAFT_SKILL_MULT: Record<string, number> = {
	'raft|beginner':           1.40,
	'raft|intermediate':       1.00,
	'raft|expert':             0.75,
	'paddle-raft|beginner':    1.20,
	'paddle-raft|intermediate':0.85,
	'paddle-raft|expert':      0.65,
	'kayak|beginner':          0.90,
	'kayak|intermediate':      0.55,
	'kayak|expert':            0.40,
};

interface BandTemplate {
	bandName: string;
	rating: string;
	description: (section: SectionBaseline, craft: CraftType, skill: SkillLevel) => string;
	authorNote?: (section: SectionBaseline, craft: CraftType, skill: SkillLevel) => string | undefined;
}

function craftLabel(craft: CraftType): string {
	if (craft === 'paddle-raft') return 'paddle raft';
	return craft;
}

const TEMPLATES: BandTemplate[] = [
	{
		bandName: 'too-low',
		rating: 'no-go',
		description: (s, c) => `Below the runnable threshold for a ${craftLabel(c)} on ${s.shortName}. Expect frequent boat-stoppers, exposed rocks, and unsafe pinning risk. Wait for more water or move to a different section — this is not a day to run it.`,
	},
	{
		bandName: 'low-runnable',
		rating: 'marginal',
		description: (s, c, sk) =>
			sk === 'beginner'
				? `Not recommended at this level — ${s.shortName} is too technical for a beginner ${craftLabel(c)} crew at low water. Pick an easier section or wait for flows to come up before attempting this one.`
				: `Runnable for an experienced ${craftLabel(c)} crew. Expect frequent scraping, technical maneuvering around exposed rocks, and a slower day overall. Scout the bigger features if you're not already familiar with the section.`,
	},
	{
		bandName: 'technical',
		rating: 'good',
		description: (s, c) => `Lower end of ideal for a ${craftLabel(c)} on ${s.shortName}. Solid technical run — features are clean, lines are manageable, and the rapids have personality without being pushy. A great day if you like reading water.`,
	},
	{
		bandName: 'ideal',
		rating: 'ideal',
		description: (s, c) => `Sweet spot for a ${craftLabel(c)} on ${s.shortName}. The ${s.character} is at its best — clean lines, fun waves, and plenty of room to play in the bigger features without overwhelming consequence.`,
	},
	{
		bandName: 'pushy',
		rating: 'challenging',
		description: (s, c, sk) =>
			sk === 'expert'
				? `Big, pushy water — fun for an expert ${craftLabel(c)} crew but the consequences are real. Bigger boats and a strong roster preferred; smaller paddle setups should size up or sit this one out.`
				: `Pushy water on ${s.shortName}. Fewer eddies, swims travel further, and the bigger features hit harder. Experienced ${craftLabel(c)} crews with strong recoveries only — skip if you're not confident on this section.`,
	},
	{
		bandName: 'expert-only',
		rating: 'challenging',
		description: (s, c) => `Expert-only flows for a ${craftLabel(c)}. Most teams should sit this one out — consequences for swims and missed lines are significant, eddies are scarce, and rescue windows are short. Only with a proven crew.`,
	},
	{
		bandName: 'unsafe',
		rating: 'dangerous',
		description: (s) => `Not recommended at any skill on ${s.shortName}. Most outfitters close above this level, and self-rescue would be slim if anything went wrong. Wait for the river to come back into range before attempting.`,
	},
];

function generateBands(): any[] {
	const out: any[] = [];
	for (const base of ARK_BASELINES) {
		for (const [key, mult] of Object.entries(CRAFT_SKILL_MULT)) {
			const [craft, skill] = key.split('|') as [CraftType, SkillLevel];
			const tooLow = Math.round(base.tooLowMax * mult);
			const lowRun = Math.round(base.lowRunnableMax * mult);
			const ideal0 = Math.round(base.idealMin * mult);
			const ideal1 = Math.round(base.idealMax * mult);
			const pushy = Math.round(base.pushyMax * mult);
			const expert = Math.round(base.expertMax * mult);

			const bandsForCombo: Array<[string, number, number]> = [
				['too-low',     0,           tooLow],
				['low-runnable',tooLow + 1,  lowRun],
				['technical',   lowRun + 1,  ideal0 - 1],
				['ideal',       ideal0,      ideal1],
				['pushy',       ideal1 + 1,  pushy],
				['expert-only', pushy + 1,   expert],
				['unsafe',      expert + 1,  99999],
			];

			for (const [bandName, minCfs, maxCfs] of bandsForCombo) {
				if (minCfs > maxCfs) continue;
				const tpl = TEMPLATES.find(t => t.bandName === bandName)!;
				out.push({
					id: `${base.sectionId}_${craft}_${skill}_${bandName}`,
					sectionId: base.sectionId,
					craftType: craft,
					commercial: null,
					skillLevel: skill,
					bandName,
					minCfs,
					maxCfs,
					rating: tpl.rating,
					description: tpl.description(base, craft, skill),
					authorNote: tpl.authorNote?.(base, craft, skill) || null,
					source: 'guide-input',
					sourceUserId: null,
					updatedAt: '2026-05-13T00:00:00Z',
					active: true,
				});
			}
		}
	}
	return out;
}

const GENERATED_BANDS = generateBands();

// Hand-authored override for the canonical Browns Canyon raft+intermediate
// low-runnable band — v1 incorrectly labeled 396 cfs as "too low" here.
const BROWNS_RAFT_INT_LOW = GENERATED_BANDS.find(
	b => b.id === 'arkansas-browns-canyon_raft_intermediate_low-runnable',
);
if (BROWNS_RAFT_INT_LOW) {
	BROWNS_RAFT_INT_LOW.description =
		"Runnable for an experienced paddle crew. Expect frequent scraping and technical moves around the bigger features (Zoom Flume, Seidel's Suckhole, Staircase). Slow day, scout if unfamiliar.";
	BROWNS_RAFT_INT_LOW.authorNote =
		"Browns at this level scrubs but goes — v1 incorrectly labeled this as 'too low'. Private trips run it all season at the low end with a strong crew.";
}

export const FLOW_BANDS = GENERATED_BANDS;
