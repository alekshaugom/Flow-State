import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const harperTarget = 'http://localhost:9926';
const harperAuth = 'Basic ' + Buffer.from('HDB_ADMIN:password').toString('base64');

const proxyEntry = (path: string) => ({
	[path]: {
		target: harperTarget,
		headers: { Authorization: harperAuth },
	},
});

export default defineConfig({
	plugins: [react()],
	root: 'app',
	build: {
		outDir: '../web',
		emptyOutDir: true,
		assetsDir: '.',
	},
	server: {
		port: 5173,
		proxy: {
			...proxyEntry('/Dashboard'),
			...proxyEntry('/RiverDetail'),
			...proxyEntry('/WatershedView'),
			...proxyEntry('/CorridorView'),
			...proxyEntry('/Watershed'),
			...proxyEntry('/RiverCorridor'),
			...proxyEntry('/River'),
			...proxyEntry('/RiverSection'),
			...proxyEntry('/FlowBand'),
			...proxyEntry('/Gauge'),
			...proxyEntry('/GaugeReading'),
			...proxyEntry('/Reservoir'),
			...proxyEntry('/DamRelease'),
			...proxyEntry('/SnowpackBasin'),
			...proxyEntry('/SnowpackReading'),
			...proxyEntry('/ForecastPipeline'),
			...proxyEntry('/ForecastRun'),
			...proxyEntry('/ForecastOutput'),
			...proxyEntry('/Ingestion'),
			...proxyEntry('/Seed'),
			...proxyEntry('/DataSource'),
			...proxyEntry('/IngestionLog'),
			...proxyEntry('/Me'),
			...proxyEntry('/AdminWaitlist'),
			...proxyEntry('/WaitlistUser'),
			...proxyEntry('/oauth'),
		},
	},
});
