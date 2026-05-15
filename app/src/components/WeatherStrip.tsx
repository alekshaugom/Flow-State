import { Icon } from './Icon';

const conditionToIcon: Record<string, string> = {
	'clear': 'sun',
	'partly-cloudy': 'cloud-sun',
	'cloudy': 'cloud',
	'fog': 'cloud-fog',
	'rain': 'cloud-rain',
	'snow': 'cloud-snow',
	'thunderstorm': 'cloud-bolt',
};

const conditionColor = (cond: string | null): string => {
	switch (cond) {
		case 'clear':         return 'var(--ideal-solid)';
		case 'partly-cloudy': return 'var(--ink-2)';
		case 'cloudy':        return 'var(--ink-3)';
		case 'fog':           return 'var(--ink-3)';
		case 'rain':          return 'var(--river-700)';
		case 'snow':          return 'var(--river-500)';
		case 'thunderstorm':  return 'var(--danger-solid)';
		default:              return 'var(--ink-3)';
	}
};

const dayLabel = (iso: string, idx: number): string => {
	if (idx === 0) return 'Today';
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(y, (m || 1) - 1, d || 1);
	return date.toLocaleDateString(undefined, { weekday: 'short' });
};

const monthDay = (iso: string): string => {
	const [, m, d] = iso.split('-');
	return `${Number(m)}/${Number(d)}`;
};

interface WeatherStripProps {
	weather: any[];
}

export function WeatherStrip({ weather }: WeatherStripProps) {
	if (!weather?.length) return null;

	return (
		<div style={{
			display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
			scrollbarWidth: 'thin',
		}}>
			{weather.map((w: any, idx: number) => {
				const cond = w.condition || null;
				const iconName = conditionToIcon[cond] || 'cloud';
				const iconColor = conditionColor(cond);
				const high = w.tempHighF != null ? Math.round(w.tempHighF) : null;
				const low = w.tempLowF != null ? Math.round(w.tempLowF) : null;
				const precip = w.precipProb != null && w.precipProb > 0 ? Math.round(w.precipProb) : null;
				return (
					<div key={w.date} style={{
						flex: '0 0 auto',
						width: 58,
						padding: '8px 6px',
						borderRadius: 'var(--r-md)',
						background: idx === 0 ? 'var(--bg-tint)' : 'var(--bg-sunken)',
						border: idx === 0 ? '1px solid var(--river-100)' : '1px solid var(--rule)',
						display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
					}}>
						<div style={{
							fontSize: 10, fontWeight: 700,
							color: idx === 0 ? 'var(--river-700)' : 'var(--ink-1)',
							textTransform: 'uppercase', letterSpacing: '0.04em',
						}}>{dayLabel(w.date, idx)}</div>
						<div style={{
							fontSize: 9, fontFamily: 'var(--font-mono)',
							color: 'var(--ink-3)',
						}}>{monthDay(w.date)}</div>
						<div style={{
							height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
							color: iconColor,
						}}>
							<Icon name={iconName} size={20} color={iconColor} strokeWidth={1.6} />
						</div>
						<div style={{
							fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
							fontSize: 12, fontWeight: 600, color: 'var(--ink-0)',
						}}>{high != null ? `${high}°` : '—'}</div>
						<div style={{
							fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
							fontSize: 10, color: 'var(--ink-3)',
						}}>{low != null ? `${low}°` : '—'}</div>
						{precip != null && (
							<div style={{
								fontSize: 9, color: iconColor, fontWeight: 600,
								fontFamily: 'var(--font-mono)', marginTop: 1,
							}}>{precip}%</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
