export type RiverSource = 'curated' | 'american-whitewater' | 'wikidata';

export interface WorldRiverRecord {
	id: string;
	name: string;
	alternate_names: string[];
	country: string;
	iso_country: string;
	region: string | null;
	continent: string;
	source_lat: number | null;
	source_lon: number | null;
	mouth_lat: number | null;
	mouth_lon: number | null;
	center_lat: number | null;
	center_lon: number | null;
	difficulty: string | null;
	sections: string;
	note: string;
	learn_more_url: string;
	wikidata_id: string | null;
	has_flow_data: false;
	source: RiverSource;
}

export interface PartialRiver {
	name: string;
	alternate_names?: string[];
	country: string;
	iso_country: string;
	region?: string | null;
	continent?: string;
	source_lat?: number | null;
	source_lon?: number | null;
	mouth_lat?: number | null;
	mouth_lon?: number | null;
	center_lat?: number | null;
	center_lon?: number | null;
	difficulty?: string | null;
	sections?: string;
	note?: string;
	learn_more_url?: string;
	wikidata_id?: string | null;
	source: RiverSource;
}
