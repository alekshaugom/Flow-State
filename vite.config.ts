import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockCorridorPlugin } from './scripts/mock-corridor-server.ts';

const harperTarget = process.env.HARPER_TARGET ?? 'http://localhost:9926';
// Proxy Basic-auth creds are env-overridable so a local dev instance installed with
// different admin creds can authenticate without editing the committed default.
const harperUser = process.env.HARPER_USER ?? 'HDB_ADMIN';
const harperPass = process.env.HARPER_PASS ?? 'password';
const harperAuth = 'Basic ' + Buffer.from(`${harperUser}:${harperPass}`).toString('base64');
const useMock = process.env.MOCK_CORRIDOR_VIEW === '1';

const proxyEntry = (path: string) => ({
	[path]: {
		target: harperTarget,
		headers: { Authorization: harperAuth },
	},
});

export default defineConfig({
	plugins: [react(), ...(useMock ? [mockCorridorPlugin()] : [])],
	root: 'app',
	build: {
		outDir: '../web',
		emptyOutDir: true,
		assetsDir: '.',
	},
	server: {
		port: 5173,
		host: '127.0.0.1',
		proxy: {
			...proxyEntry('/Dashboard'),
			...proxyEntry('/CorridorTiles'),
			...proxyEntry('/AccessPoint'),
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
			...proxyEntry('/WeatherForecast'),
			...proxyEntry('/ForecastPipeline'),
			...proxyEntry('/ForecastRun'),
			...proxyEntry('/ForecastOutput'),
			...proxyEntry('/Ingestion'),
			...proxyEntry('/DataHealth'),
			...proxyEntry('/Seed'),
			...proxyEntry('/DataSource'),
			...proxyEntry('/IngestionLog'),
			...proxyEntry('/Me'),
			...proxyEntry('/FollowResource'),
			...proxyEntry('/Outfitter'),
			...proxyEntry('/AdminWaitlist'),
			...proxyEntry('/EmailLoginResource'),
			...proxyEntry('/AdminAuthResource'),
			...proxyEntry('/UserCredential'),
			...proxyEntry('/OneTimeLoginToken'),
			...proxyEntry('/WaitlistUser'),
			...proxyEntry('/RiverLogResource'),
			...proxyEntry('/RiverLog'),
			...proxyEntry('/UserCraftResource'),
			...proxyEntry('/UserCraft'),
			...proxyEntry('/SectionLogsView'),
			...proxyEntry('/MyLogsView'),
			...proxyEntry('/MyConnectionsView'),
			...proxyEntry('/LogShareResource'),
			...proxyEntry('/LogShare'),
			...proxyEntry('/TripParticipantResource'),
			...proxyEntry('/TripParticipant'),
			...proxyEntry('/RiverSearch'),
			...proxyEntry('/WorldRiver'),
			...proxyEntry('/WorldRiverView'),
			...proxyEntry('/RiverRequest'),
			...proxyEntry('/RiverRequestResource'),
			...proxyEntry('/AdminRiverRequests'),
			// Slice 21 — contributions
			...proxyEntry('/ContributionResource'),
			...proxyEntry('/Contribution'),
			// Slice 22 — bounties + credit ledger
			...proxyEntry('/BountyResource'),
			...proxyEntry('/Bounty'),
			...proxyEntry('/LedgerResource'),
			...proxyEntry('/LedgerEntry'),
			// Slice 24 — trust, reputation & governance
			...proxyEntry('/ContentFlagResource'),
			...proxyEntry('/ModerationResource'),
			...proxyEntry('/ContributorReputationResource'),
			...proxyEntry('/ContentFlag'),
			...proxyEntry('/ModerationEvent'),
			...proxyEntry('/ContributorReputation'),
			...proxyEntry('/oauth'),
		},
	},
});
