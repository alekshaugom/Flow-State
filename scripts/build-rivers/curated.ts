import type { PartialRiver } from './types';

// Hand-curated list of world-classic paddling rivers. Quality > breadth here —
// these anchor the search with good notes, difficulty, and direct learn-more links.
// Wikidata + American Whitewater pulls supply the long tail.

export const CURATED_RIVERS: PartialRiver[] = [
	// AFRICA
	{
		name: 'Zambezi', iso_country: 'ZM', country: 'Zambia', region: 'Southern Province',
		difficulty: 'Class IV-V', sections: 'Batoka Gorge, Lower Zambezi',
		note: 'Iconic big-water gorge below Victoria Falls — house-sized waves, technical rapids, and a wild riverside camping scene. Often guided.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Zambezi', source: 'curated',
		alternate_names: ['Zambezi River'],
	},
	{
		name: 'White Nile', iso_country: 'UG', country: 'Uganda', region: 'Jinja',
		difficulty: 'Class III-V', sections: 'Itanda, Bujagali (drowned)',
		note: 'Warm-water playboating and big rapids near Jinja. The historic upper sections were drowned by dams; what remains is still world-class.',
		learn_more_url: 'https://en.wikipedia.org/wiki/White_Nile', source: 'curated',
	},
	{
		name: 'Orange River', iso_country: 'ZA', country: 'South Africa', region: 'Northern Cape',
		difficulty: 'Class II-III', sections: 'Augrabies, Richtersveld',
		note: 'Desert multi-day floats through deep gorges along the Namibian border. Mostly intermediate water with scenic riverside camping.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Orange_River', source: 'curated',
	},
	{
		name: 'Tana River', iso_country: 'KE', country: 'Kenya', region: 'Eastern',
		difficulty: 'Class III-IV', sections: 'Sagana',
		note: 'Equatorial whitewater run just north of Nairobi — pool-drop rapids, year-round commercial rafting on the Sagana section.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Tana_River_(Kenya)', source: 'curated',
	},

	// ASIA — Nepal
	{
		name: 'Sun Kosi', iso_country: 'NP', country: 'Nepal', region: 'Eastern Nepal',
		difficulty: 'Class III-IV', sections: 'Dolalghat to Chatara',
		note: 'Classic Nepali multi-day — 270km from the mountains to the plains over 7-10 days. Big-volume pool-drop rapids and tropical beach camps.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Sun_Kosi', source: 'curated',
		alternate_names: ['Sunkosi', 'Sun Koshi'],
	},
	{
		name: 'Karnali', iso_country: 'NP', country: 'Nepal', region: 'Far-Western',
		difficulty: 'Class IV-V', sections: 'Sauli to Chisapani',
		note: 'Remote 10-day expedition through deep gorges in far-western Nepal. Big water, committing rapids, no road access on most of it.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Karnali_River', source: 'curated',
	},
	{
		name: 'Bhote Kosi', iso_country: 'NP', country: 'Nepal', region: 'Bagmati',
		difficulty: 'Class IV-V', sections: 'Borderlands to Lamosangu',
		note: 'Steep, continuous Class IV-V on cold glacial water. The day-run from the Tibetan border is one of the most intense in Nepal.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Bhote_Koshi_River', source: 'curated',
	},
	{
		name: 'Marsyangdi', iso_country: 'NP', country: 'Nepal', region: 'Gandaki',
		difficulty: 'Class IV-V', sections: 'Ngadi to Bhulbhule',
		note: 'Steep technical whitewater draining the Annapurna massif. Continuous bedrock rapids; the upper section is among the steepest commercially run.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Marshyangdi_River', source: 'curated',
		alternate_names: ['Marshyangdi'],
	},
	{
		name: 'Kali Gandaki', iso_country: 'NP', country: 'Nepal', region: 'Gandaki',
		difficulty: 'Class III-IV', sections: 'Beni to Andhi Khola',
		note: 'Three-day raft trip through the world\'s deepest gorge between Annapurna and Dhaulagiri. Solid intermediate whitewater.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Kali_Gandaki_River', source: 'curated',
	},
	{
		name: 'Trishuli', iso_country: 'NP', country: 'Nepal', region: 'Bagmati',
		difficulty: 'Class II-III', sections: 'Charaudi to Mugling',
		note: 'Roadside intermediate run, the most popular commercial day-trip in Nepal. Easy logistics, warm water, big-volume waves.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Trishuli_River', source: 'curated',
	},

	// ASIA — other
	{
		name: 'Zanskar', iso_country: 'IN', country: 'India', region: 'Ladakh',
		difficulty: 'Class III-IV', sections: 'Padum to Nimu',
		note: 'High-altitude expedition through Himalayan rock corridors. Late summer only; cold water and remote logistics.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Zanskar_River', source: 'curated',
	},
	{
		name: 'Tons', iso_country: 'IN', country: 'India', region: 'Uttarakhand',
		difficulty: 'Class IV-V', sections: 'Tiuni to Mori',
		note: 'Steep snowmelt-fed river in the western Garhwal — bigger, harder, and less crowded than the nearby Ganges runs.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Tons_River', source: 'curated',
	},
	{
		name: 'Mekong', iso_country: 'LA', country: 'Laos', region: 'Si Phan Don',
		difficulty: 'Class III-IV', sections: 'Khone Falls section',
		note: 'Massive Southeast Asian river — most paddled near the Khone Falls and through tributary canyons. Huge volumes, channeling rapids.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Mekong', source: 'curated',
	},

	// EUROPE — Norway
	{
		name: 'Sjoa', iso_country: 'NO', country: 'Norway', region: 'Innlandet',
		difficulty: 'Class III-V', sections: 'Asengjuvet, Amot, Sjoa Gorge',
		note: 'The classic Norwegian whitewater destination. Multiple sections from playful Class III to committing Class V gorges.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Sjoa', source: 'curated',
	},
	{
		name: 'Rauma', iso_country: 'NO', country: 'Norway', region: 'Møre og Romsdal',
		difficulty: 'Class IV-V', sections: 'Verma Gorge',
		note: 'Steep glacial bedrock river in a vertical-walled gorge below Trollveggen. Short season, big drops, technical lines.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Rauma_(river)', source: 'curated',
	},
	{
		name: 'Otra', iso_country: 'NO', country: 'Norway', region: 'Agder',
		difficulty: 'Class III-IV', sections: 'Brokke to Hovden',
		note: 'Long undammed sections through southern Norwegian forest. Pool-drop intermediate whitewater with reliable summer flows.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Otra', source: 'curated',
	},

	// EUROPE — Alps
	{
		name: 'Soča', iso_country: 'SI', country: 'Slovenia', region: 'Goriška',
		difficulty: 'Class III-IV', sections: 'Bovec, Trnovo, Kobarid',
		note: 'Famously emerald-green alpine river in the Julian Alps. Multiple sections from playful to steep; cold even in summer.',
		learn_more_url: 'https://en.wikipedia.org/wiki/So%C4%8Da', source: 'curated',
		alternate_names: ['Soca', 'Isonzo'],
	},
	{
		name: 'Inn', iso_country: 'AT', country: 'Austria', region: 'Tyrol',
		difficulty: 'Class III-IV', sections: 'Imster Schlucht, Landeck',
		note: 'Big-water alpine river through Tyrolean gorges. The Imster Schlucht is the most popular commercial section.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Inn_(river)', source: 'curated',
	},
	{
		name: 'Verzasca', iso_country: 'CH', country: 'Switzerland', region: 'Ticino',
		difficulty: 'Class IV-V', sections: 'Lavertezzo',
		note: 'Translucent green creek through polished granite in southern Switzerland. Highly technical; flows drop fast in summer.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Verzasca', source: 'curated',
	},
	{
		name: 'Aare', iso_country: 'CH', country: 'Switzerland', region: 'Bern',
		difficulty: 'Class II-III', sections: 'Thun, Bern',
		note: 'Glacial-blue urban river — locals float through Bern in summer. Cold and fast even on the easy sections.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Aare', source: 'curated',
	},
	{
		name: 'Salza', iso_country: 'AT', country: 'Austria', region: 'Styria',
		difficulty: 'Class II-III', sections: 'Palfau to Wildalpen',
		note: 'Crystal-clear limestone river — Austria\'s most popular rafting trip. Reliable summer flows from karst springs.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Salza', source: 'curated',
	},
	{
		name: 'Lütschine', iso_country: 'CH', country: 'Switzerland', region: 'Bern',
		difficulty: 'Class III-IV', sections: 'Schwarze, Weisse Lütschine',
		note: 'Glacial bedrock river below the Eiger/Mönch/Jungfrau. Two forks meet at Interlaken; steep continuous rapids.',
		learn_more_url: 'https://en.wikipedia.org/wiki/L%C3%BCtschine', source: 'curated',
	},

	// EUROPE — Balkans / Eastern
	{
		name: 'Tara', iso_country: 'ME', country: 'Montenegro', region: 'Northern Montenegro',
		difficulty: 'Class III-IV', sections: 'Šćepan Polje to Žabljak',
		note: 'Three-day raft through the deepest canyon in Europe. Translucent water, towering limestone walls, big swimming holes.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Tara_(Drina)', source: 'curated',
	},
	{
		name: 'Vrbas', iso_country: 'BG', country: 'Bulgaria', region: 'Banja Luka',
		difficulty: 'Class III-IV', sections: 'Banja Luka',
		note: 'Bosnia\'s most paddled river — clear water, big rapids, slalom course used for the 2009 World Championships.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Vrbas_(river)', source: 'curated',
	},
	{
		name: 'Vltava', iso_country: 'CZ', country: 'Czech Republic', region: 'South Bohemia',
		difficulty: 'Class I-II', sections: 'Český Krumlov, Vyšší Brod',
		note: 'Classic Central European canoe tour through medieval towns. Easy water, weirs to portage, beer at every campsite.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Vltava', source: 'curated',
	},

	// EUROPE — Iberia + France
	{
		name: 'Noguera Pallaresa', iso_country: 'ES', country: 'Spain', region: 'Catalonia',
		difficulty: 'Class III-IV', sections: 'Llavorsí to Sort',
		note: 'Snowmelt-fed Pyrenees river, the most paddled in Spain. Big-water Class III-IV from spring through early summer.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Noguera_Pallaresa', source: 'curated',
	},
	{
		name: 'Sella', iso_country: 'ES', country: 'Spain', region: 'Asturias',
		difficulty: 'Class I-II', sections: 'Arriondas to Ribadesella',
		note: 'Site of the famous Descenso del Sella canoe race every August — tens of thousands of paddlers down 20km of mellow water.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Sella_(river)', source: 'curated',
	},
	{
		name: 'Ubaye', iso_country: 'FR', country: 'France', region: 'Alpes-de-Haute-Provence',
		difficulty: 'Class III-V', sections: 'Le Martinet, Racing Course',
		note: 'Steep continuous alpine bedrock river. Multiple sections suit Class III through expert; high-quality French alps run.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Ubaye', source: 'curated',
	},
	{
		name: 'Verdon', iso_country: 'FR', country: 'France', region: 'Alpes-de-Haute-Provence',
		difficulty: 'Class IV-V', sections: 'Grand Canyon du Verdon',
		note: 'Turquoise river through Europe\'s deepest gorge. Releases controlled; the canyon section is committing, beautiful, and rarely run.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Verdon_(river)', source: 'curated',
	},
	{
		name: 'Durance', iso_country: 'FR', country: 'France', region: 'Hautes-Alpes',
		difficulty: 'Class III-IV', sections: 'L\'Argentière, Briançon',
		note: 'Long French Alps river — steep tributary canyons and a wide-open Class III run popular for commercial rafting.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Durance', source: 'curated',
	},

	// SOUTH AMERICA — Chile + Argentina
	{
		name: 'Futaleufú', iso_country: 'CL', country: 'Chile', region: 'Los Lagos',
		difficulty: 'Class IV-V', sections: 'Inferno, Throne Room, Casa de Piedra',
		note: 'Patagonian dream river — turquoise water, big waves, technical drops in a glacial valley. The benchmark for hard commercial trips.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Futaleuf%C3%BA_River', source: 'curated',
		alternate_names: ['Futaleufu', 'Fu'],
	},
	{
		name: 'Bío Bío', iso_country: 'CL', country: 'Chile', region: 'Bío Bío',
		difficulty: 'Class IV-V', sections: 'Upper Bío Bío (largely dammed)',
		note: 'Once Chile\'s most famous expedition — the upper canyons are now partly inundated by Ralco/Pangue dams. Still paddled in segments.',
		learn_more_url: 'https://en.wikipedia.org/wiki/B%C3%ADo_B%C3%ADo_River', source: 'curated',
		alternate_names: ['Bio Bio'],
	},
	{
		name: 'Baker', iso_country: 'CL', country: 'Chile', region: 'Aysén',
		difficulty: 'Class III-IV', sections: 'Confluence to mouth',
		note: 'Chile\'s most voluminous river — translucent glacial blue. Long sections of big-water Class III-IV in the heart of Patagonia.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Baker_River_(Chile)', source: 'curated',
	},
	{
		name: 'Manso', iso_country: 'AR', country: 'Argentina', region: 'Río Negro',
		difficulty: 'Class III-IV', sections: 'Manso a la Frontera',
		note: 'Trans-Andean river dropping from Argentina into Chile. Multi-day raft trip through cold-temperate rainforest.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Manso_River_(Patagonia)', source: 'curated',
	},

	// SOUTH AMERICA — Peru / Ecuador
	{
		name: 'Apurímac', iso_country: 'PE', country: 'Peru', region: 'Cusco',
		difficulty: 'Class IV-V', sections: 'Headwaters of the Amazon, Black Canyon',
		note: 'Source of the Amazon — committing multi-day expedition through limestone gorges. Big water, remote, only run May-October.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Apur%C3%ADmac_River', source: 'curated',
		alternate_names: ['Apurimac'],
	},
	{
		name: 'Urubamba', iso_country: 'PE', country: 'Peru', region: 'Cusco',
		difficulty: 'Class III-IV', sections: 'Sacred Valley, Pongo de Mainique',
		note: 'Flows past Machu Picchu — accessible day-trips upstream, plus the Pongo de Mainique pinch where the river squeezes through 2km of canyon.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Urubamba_River', source: 'curated',
	},
	{
		name: 'Quijos', iso_country: 'EC', country: 'Ecuador', region: 'Napo',
		difficulty: 'Class III-V', sections: 'Cosanga, Borja, Bombón',
		note: 'High-volume Amazon headwater on the east slope of the Andes. Year-round paddling — warm water, jungle riverbanks, big rapids.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Quijos_River', source: 'curated',
	},
	{
		name: 'Misahualli', iso_country: 'EC', country: 'Ecuador', region: 'Napo',
		difficulty: 'Class III-IV', sections: 'Upper, Lower',
		note: 'Quintessential Ecuadorian jungle paddle — tea-colored water, rainforest canopy, accessible from Tena.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Misahuall%C3%AD_River', source: 'curated',
	},
	{
		name: 'Pacuare', iso_country: 'CR', country: 'Costa Rica', region: 'Limón',
		difficulty: 'Class III-IV', sections: 'Upper, Lower',
		note: 'Costa Rica\'s most famous river — two-day jungle trip through deep rainforest gorges. Reliable year-round flows.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Pacuare_River', source: 'curated',
	},

	// OCEANIA — Australia
	{
		name: 'Franklin', iso_country: 'AU', country: 'Australia', region: 'Tasmania',
		difficulty: 'Class III-IV', sections: 'Collingwood to Gordon',
		note: 'Wilderness expedition through Tasmanian temperate rainforest — 10 days of self-support paddling. Famously saved from damming in 1983.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Franklin_River', source: 'curated',
	},
	{
		name: 'Snowy', iso_country: 'AU', country: 'Australia', region: 'New South Wales',
		difficulty: 'Class II-III', sections: 'McKillops Bridge to Buchan',
		note: 'Multi-day expedition through gorge country in Victoria/NSW. Long sections, infrequent water, classic Australian wilderness paddle.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Snowy_River', source: 'curated',
	},
	{
		name: 'Tully', iso_country: 'AU', country: 'Australia', region: 'Queensland',
		difficulty: 'Class III-IV', sections: 'Tully Gorge',
		note: 'Tropical rainforest river — reliable hydro releases mean year-round commercial rafting. Steep, continuous, hot.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Tully_River', source: 'curated',
	},

	// OCEANIA — NZ
	{
		name: 'Buller', iso_country: 'NZ', country: 'New Zealand', region: 'West Coast',
		difficulty: 'Class III-IV', sections: 'Earthquake Slip, Lower Buller Gorge',
		note: 'Long West Coast river — big-volume granite gorges, road access, classic NZ multi-day. Open most of the year.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Buller_River', source: 'curated',
	},
	{
		name: 'Kaituna', iso_country: 'NZ', country: 'New Zealand', region: 'Bay of Plenty',
		difficulty: 'Class III-IV', sections: 'Tutea Falls section',
		note: 'Short, intense run featuring Tutea Falls — at 7m the highest commercially-rafted waterfall in the world. Year-round, warm-ish.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Kaituna_River', source: 'curated',
	},
	{
		name: 'Shotover', iso_country: 'NZ', country: 'New Zealand', region: 'Otago',
		difficulty: 'Class III-V', sections: 'Skippers Canyon',
		note: 'Steep schist canyon near Queenstown — Class IV-V commercial rafting through narrow walls. Jet boats share the canyon below.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Shotover_River', source: 'curated',
	},
	{
		name: 'Rangitikei', iso_country: 'NZ', country: 'New Zealand', region: 'Manawatū-Whanganui',
		difficulty: 'Class IV-V', sections: 'Upper Rangitikei',
		note: 'Remote multi-day through deep papa-rock gorges in the central North Island. Bigger and harder than its more famous neighbors.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Rangit%C4%ABkei_River', source: 'curated',
	},
	{
		name: 'Landsborough', iso_country: 'NZ', country: 'New Zealand', region: 'West Coast',
		difficulty: 'Class IV-V', sections: 'Helicopter put-in to Haast',
		note: 'Heli-access wilderness expedition through Mt Aspiring NP. Granite, glaciers, kea overhead — one of NZ\'s premier expedition runs.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Landsborough_River', source: 'curated',
	},

	// NORTH AMERICA — Canada
	{
		name: 'Ottawa', iso_country: 'CA', country: 'Canada', region: 'Ontario',
		difficulty: 'Class III-IV', sections: 'Main, Middle, Lorne',
		note: 'World-renowned playboating river — huge wave features, warm summer water, beginner-friendly logistics. Bus from Ottawa or Montreal.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Ottawa_River', source: 'curated',
	},
	{
		name: 'Magpie', iso_country: 'CA', country: 'Canada', region: 'Quebec',
		difficulty: 'Class III-IV', sections: 'Lake Magpie to Saint Lawrence',
		note: 'Wilderness river on Quebec\'s North Shore — float-plane access, 13-day expedition through boreal forest. Listed as one of the world\'s top rivers.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Magpie_River_(Quebec)', source: 'curated',
	},
	{
		name: 'Nahanni', iso_country: 'CA', country: 'Canada', region: 'Northwest Territories',
		difficulty: 'Class II-IV', sections: 'Virginia Falls to Nahanni Butte',
		note: 'Iconic northern wilderness expedition. 500km through deep canyons below 90m Virginia Falls. Fly in, paddle out. 10-14 days.',
		learn_more_url: 'https://en.wikipedia.org/wiki/South_Nahanni_River', source: 'curated',
		alternate_names: ['South Nahanni'],
	},
	{
		name: 'Tatshenshini', iso_country: 'CA', country: 'Canada', region: 'Yukon',
		difficulty: 'Class III', sections: 'Dalton Post to Dry Bay',
		note: 'Big-water glacial expedition through the largest non-polar ice field on earth. 10-14 days, fly-out from the Alaska coast.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Tatshenshini_River', source: 'curated',
	},
	{
		name: 'Kicking Horse', iso_country: 'CA', country: 'Canada', region: 'British Columbia',
		difficulty: 'Class IV', sections: 'Lower Canyon',
		note: 'Tightly walled limestone canyon in the Rockies near Golden, BC. Big snowmelt water in early summer; commercial trips are intense.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Kicking_Horse_River', source: 'curated',
	},
	{
		name: 'Chilko', iso_country: 'CA', country: 'Canada', region: 'British Columbia',
		difficulty: 'Class IV', sections: 'Lava Canyon, White Mile',
		note: 'Glacial blue water through the Chilcotin — the White Mile is one continuous Class IV wave train. Wilderness multi-day takeout.',
		learn_more_url: 'https://en.wikipedia.org/wiki/Chilko_River', source: 'curated',
	},

	// NORTH AMERICA — US classics (non-Colorado)
	{
		name: 'Gauley', iso_country: 'US', country: 'United States', region: 'West Virginia',
		difficulty: 'Class IV-V', sections: 'Upper Gauley, Lower Gauley',
		note: 'Iconic East Coast big-water — 22 days of fall hydro releases from Summersville Dam. Pillow Rock, Lost Paddle, Iron Ring.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2061/', source: 'curated',
	},
	{
		name: 'New River', iso_country: 'US', country: 'United States', region: 'West Virginia',
		difficulty: 'Class III-V', sections: 'Lower New River Gorge',
		note: 'Big-volume Appalachian whitewater through deep gorge. Surf waves on every line; classic family river just below the New River Bridge.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2062/', source: 'curated',
	},
	{
		name: 'Salmon River - Main', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class III-IV', sections: 'Corn Creek to Carey Creek',
		note: '"River of No Return" — six days through the largest contiguous wilderness in the Lower 48. Sandy beaches, hot springs, big rapids.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2086/', source: 'curated',
		alternate_names: ['River of No Return'],
	},
	{
		name: 'Salmon River - Middle Fork', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class III-IV', sections: 'Boundary Creek to Big Creek',
		note: 'Six-day wilderness float through 100 miles of designated Wild & Scenic. Pool-drop rapids, hot springs, no roads, permit-only.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2088/', source: 'curated',
	},
	{
		name: 'Lochsa', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class IV', sections: 'Lower Lochsa',
		note: 'Roadside Class IV powerhouse in central Idaho — peak snowmelt in May/June creates wall-to-wall whitewater for 30+ miles.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2076/', source: 'curated',
	},
	{
		name: 'Selway', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class IV', sections: 'Paradise to Selway Falls',
		note: 'Most restricted permit in the Lower 48 — one launch per day. Five-day wilderness Class IV through pristine cedar forest.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2087/', source: 'curated',
	},
	{
		name: 'North Fork Payette', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class V', sections: 'Smith\'s Ferry to Banks',
		note: 'Roadside Class V — 16 miles of continuous big-water bedrock rapids paralleling Highway 55. Benchmark of expert kayaking.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2082/', source: 'curated',
	},
	{
		name: 'South Fork Payette', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class IV-V', sections: 'Canyon section, Staircase',
		note: 'Steep Idaho granite — multiple sections from intermediate to expert. The Canyon and Staircase are continuous Class IV-V.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2095/', source: 'curated',
	},
	{
		name: 'Snake River - Hells Canyon', iso_country: 'US', country: 'United States', region: 'Idaho',
		difficulty: 'Class III-IV', sections: 'Hells Canyon Dam to Heller Bar',
		note: 'Deepest gorge in North America — bigger than the Grand Canyon. Multi-day permit float with massive pool-drop rapids.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2168/', source: 'curated',
	},
	{
		name: 'Rogue', iso_country: 'US', country: 'United States', region: 'Oregon',
		difficulty: 'Class III', sections: 'Wild and Scenic section',
		note: 'Four-day permit float through southern Oregon wilderness. Black bears, salmon runs, comfortable Class III rapids, lodge or camp options.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2099/', source: 'curated',
	},
	{
		name: 'Deschutes', iso_country: 'US', country: 'United States', region: 'Oregon',
		difficulty: 'Class II-IV', sections: 'Lower Deschutes, Maupin',
		note: 'Desert canyon classic in north-central Oregon — popular three-day permit float with good fishing and accessible rapids.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2098/', source: 'curated',
	},
	{
		name: 'Owyhee', iso_country: 'US', country: 'United States', region: 'Oregon',
		difficulty: 'Class III-IV', sections: 'Three Forks to Rome, Rome to Birch',
		note: 'Remote high-desert canyon in the Owyhee canyonlands. Spring-only flows, short paddling window, no crowds.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2092/', source: 'curated',
	},
	{
		name: 'Tuolumne', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class IV-V', sections: 'Cherry Creek, Main Tuolumne',
		note: 'California granite classic — Cherry Creek is benchmark commercial Class V. The Main Tuolumne below is sustained Class IV.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2107/', source: 'curated',
	},
	{
		name: 'Merced', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class III-IV', sections: 'Briceburg to Bagby',
		note: 'Drains Yosemite — spring snowmelt creates a continuous Class III-IV wave train. Reliable season, easy logistics.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2078/', source: 'curated',
	},
	{
		name: 'Kern - Forks', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class III-V', sections: 'Forks of the Kern, Upper Kern, Thunder Run',
		note: 'Sierra Nevada granite playground — multiple steepness grades on one drainage. The Forks is committing Class V; lower Kern is family-friendly III.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2074/', source: 'curated',
	},
	{
		name: 'Kings - Middle Fork', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class V', sections: 'Middle Fork Kings',
		note: 'Deep Sierra wilderness Class V expedition — fly in, paddle out for ten days through Kings Canyon. Few first descents are this scenic.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2073/', source: 'curated',
	},
	{
		name: 'South Fork American', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class III', sections: 'Chili Bar, Coloma, Gorge',
		note: 'California\'s busiest commercial river — Sierra foothills near Sacramento. Reliable summer flows from PG&E releases.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2104/', source: 'curated',
	},
	{
		name: 'Green River - Utah', iso_country: 'US', country: 'United States', region: 'Utah',
		difficulty: 'Class II-III', sections: 'Desolation Canyon, Gray Canyon, Labyrinth',
		note: 'Long multi-day desert floats through red-rock canyons. Desolation/Gray are intermediate; Labyrinth/Stillwater are flatwater.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2065/', source: 'curated',
	},
	{
		name: 'San Juan', iso_country: 'US', country: 'United States', region: 'Utah',
		difficulty: 'Class II', sections: 'Sand Island to Clay Hills',
		note: 'Family-friendly desert float through Bears Ears. Slow water, sand waves, petroglyphs, ancestral sites at every camp.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2102/', source: 'curated',
	},
	{
		name: 'Cataract Canyon', iso_country: 'US', country: 'United States', region: 'Utah',
		difficulty: 'Class III-V', sections: 'Confluence to Hite',
		note: 'Where the Green and Colorado meet — the Big Drops are huge-volume Class IV-V at high water. Five-day permit float through Canyonlands.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2049/', source: 'curated',
	},
	{
		name: 'Chattooga', iso_country: 'US', country: 'United States', region: 'Georgia/South Carolina',
		difficulty: 'Class III-V', sections: 'Section III, Section IV',
		note: 'First Wild & Scenic river in the southeast — featured in Deliverance. Section IV ends with the famous Five Falls.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2055/', source: 'curated',
	},
	{
		name: 'Ocoee', iso_country: 'US', country: 'United States', region: 'Tennessee',
		difficulty: 'Class III-IV', sections: 'Upper, Middle',
		note: 'Hosted the 1996 Olympic slalom — scheduled dam releases create perfectly predictable Class III-IV every weekend in summer.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2090/', source: 'curated',
	},
	{
		name: 'Nantahala', iso_country: 'US', country: 'United States', region: 'North Carolina',
		difficulty: 'Class II-III', sections: 'Nantahala Falls',
		note: 'Cold-water, dam-fed family river — most-rafted commercial section in the US. Class III Nantahala Falls finishes the run.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2080/', source: 'curated',
	},
	{
		name: 'Penobscot - West Branch', iso_country: 'US', country: 'United States', region: 'Maine',
		difficulty: 'Class IV-V', sections: 'Ripogenus Gorge',
		note: 'Northern New England\'s big-water — released from Ripogenus Dam, the gorge is a tight Class V slot. Lower river is Class III-IV.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2096/', source: 'curated',
	},
	{
		name: 'Hudson - Gorge', iso_country: 'US', country: 'United States', region: 'New York',
		difficulty: 'Class III-IV', sections: 'Indian River to North Creek',
		note: 'Adirondack wilderness section, accessed via the Indian River dam release. Spring high water is best; summer floats are mellow.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2069/', source: 'curated',
	},
	{
		name: 'Moose - Bottom', iso_country: 'US', country: 'United States', region: 'New York',
		difficulty: 'Class IV-V', sections: 'Bottom Moose',
		note: 'Tight Adirondack creek — fall releases from Old Forge. Six waterfalls including the famous Crystal and Powerline.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2079/', source: 'curated',
	},
	{
		name: 'Skykomish', iso_country: 'US', country: 'United States', region: 'Washington',
		difficulty: 'Class IV', sections: 'Boulder Drop',
		note: 'Cascades classic just east of Seattle — Boulder Drop is the Pacific Northwest\'s most photographed Class IV rapid.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2103/', source: 'curated',
	},
	{
		name: 'White Salmon', iso_country: 'US', country: 'United States', region: 'Washington',
		difficulty: 'Class IV-V', sections: 'Husum Falls, Green Truss',
		note: 'Tight basalt canyon north of the Columbia Gorge. Husum Falls is a commercial Class V drop; Green Truss is committing.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2128/', source: 'curated',
	},
	{
		name: 'Klamath', iso_country: 'US', country: 'United States', region: 'California',
		difficulty: 'Class II-IV', sections: 'Upper Klamath, Hells Corner',
		note: 'Long stretches across the CA/OR border. Hells Corner section was opened up by recent dam removal — bigger water expected.',
		learn_more_url: 'https://www.americanwhitewater.org/content/River/detail/id/2071/', source: 'curated',
	},
];
