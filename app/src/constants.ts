export type DesignStatus = 'low' | 'runnable' | 'ideal' | 'high' | 'dangerous';

export const STATUS_COLORS: Record<DesignStatus, { bg: string; fg: string; line: string; solid: string }> = {
	low:       { bg: 'var(--low-bg)',      fg: 'var(--low-fg)',      line: 'var(--low-line)',      solid: 'var(--low-solid)' },
	runnable:  { bg: 'var(--runnable-bg)', fg: 'var(--runnable-fg)', line: 'var(--runnable-line)', solid: 'var(--runnable-solid)' },
	ideal:     { bg: 'var(--ideal-bg)',    fg: 'var(--ideal-fg)',    line: 'var(--ideal-line)',    solid: 'var(--ideal-solid)' },
	high:      { bg: 'var(--high-bg)',     fg: 'var(--high-fg)',     line: 'var(--high-line)',     solid: 'var(--high-solid)' },
	dangerous: { bg: 'var(--danger-bg)',   fg: 'var(--danger-fg)',   line: 'var(--danger-line)',   solid: 'var(--danger-solid)' },
};

export const STATUS_ORDER: DesignStatus[] = ['ideal', 'runnable', 'high', 'low', 'dangerous'];

export const STATUS_LABEL: Record<string, string> = {
	ideal:       'Good',
	runnable:    'Runnable',
	high:        'High',
	low:         'Low',
	dangerous:   'Dangerous',
	'no-flow':   'No Flow',
	'too-low':   'Too Low',
	'expert-only': 'Expert Only',
	unknown:     'Unknown',
};

export const STATUS_BLURB: Record<DesignStatus, string> = {
	ideal:     'In the sweet spot for guided commercial trips.',
	runnable:  'Open for trips, on the low or shoulder end of ideal.',
	high:      'Pushy water — experienced crews and bigger boats.',
	low:       'Below the runnable threshold for most sections.',
	dangerous: 'Closed by most outfitters. Significant risk.',
};

export function mapStatusToDesign(apiStatus: string): DesignStatus {
	switch (apiStatus) {
		case 'ideal': return 'ideal';
		case 'runnable': return 'runnable';
		case 'high':
		case 'expert-only': return 'high';
		case 'dangerous': return 'dangerous';
		case 'low':
		case 'too-low':
		case 'no-flow':
		case 'unknown':
		default: return 'low';
	}
}

export function mapTrend(apiTrend: string): 'up' | 'down' | 'stable' {
	switch (apiTrend) {
		case 'rising': return 'up';
		case 'falling': return 'down';
		default: return 'stable';
	}
}
