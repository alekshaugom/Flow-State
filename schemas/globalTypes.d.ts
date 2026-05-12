/**
 Generated from your schema files
 Manual changes will be lost!
 > harper dev .
 */
import type { Table } from 'harperdb';
import type { Agent, AgentSecret, AppState, Approval, Artifact, Budget, Conversation, DamRelease, DataSource, DeveloperNote, ExternalFetch, ForecastOutput, ForecastRun, Gauge, GaugeReading, IngestionLog, Memory, Message, Metric, Reservoir, River, RiverSection, Scene, SnowpackBasin, SnowpackReading, Spend, Task, ToolRegistry, Trigger, UILayout, User, WebhookEvent, geofence_Store, geolookup_Cell, geolookup_DataLoadJob, geolookup_Location, oauth_csrf_token } from './types.ts';

declare module 'harperdb' {
	export const tables: {
		Agent: { new(...args: any[]): Table<Agent> };
		AgentSecret: { new(...args: any[]): Table<AgentSecret> };
		AppState: { new(...args: any[]): Table<AppState> };
		Approval: { new(...args: any[]): Table<Approval> };
		Artifact: { new(...args: any[]): Table<Artifact> };
		Budget: { new(...args: any[]): Table<Budget> };
		Conversation: { new(...args: any[]): Table<Conversation> };
		DamRelease: { new(...args: any[]): Table<DamRelease> };
		DataSource: { new(...args: any[]): Table<DataSource> };
		DeveloperNote: { new(...args: any[]): Table<DeveloperNote> };
		ExternalFetch: { new(...args: any[]): Table<ExternalFetch> };
		ForecastOutput: { new(...args: any[]): Table<ForecastOutput> };
		ForecastRun: { new(...args: any[]): Table<ForecastRun> };
		Gauge: { new(...args: any[]): Table<Gauge> };
		GaugeReading: { new(...args: any[]): Table<GaugeReading> };
		IngestionLog: { new(...args: any[]): Table<IngestionLog> };
		Memory: { new(...args: any[]): Table<Memory> };
		Message: { new(...args: any[]): Table<Message> };
		Metric: { new(...args: any[]): Table<Metric> };
		Reservoir: { new(...args: any[]): Table<Reservoir> };
		River: { new(...args: any[]): Table<River> };
		RiverSection: { new(...args: any[]): Table<RiverSection> };
		Scene: { new(...args: any[]): Table<Scene> };
		SnowpackBasin: { new(...args: any[]): Table<SnowpackBasin> };
		SnowpackReading: { new(...args: any[]): Table<SnowpackReading> };
		Spend: { new(...args: any[]): Table<Spend> };
		Task: { new(...args: any[]): Table<Task> };
		ToolRegistry: { new(...args: any[]): Table<ToolRegistry> };
		Trigger: { new(...args: any[]): Table<Trigger> };
		UILayout: { new(...args: any[]): Table<UILayout> };
		User: { new(...args: any[]): Table<User> };
		WebhookEvent: { new(...args: any[]): Table<WebhookEvent> };
	};

	export const databases: {
		data: {
			Agent: { new(...args: any[]): Table<Agent> };
			AgentSecret: { new(...args: any[]): Table<AgentSecret> };
			AppState: { new(...args: any[]): Table<AppState> };
			Approval: { new(...args: any[]): Table<Approval> };
			Artifact: { new(...args: any[]): Table<Artifact> };
			Budget: { new(...args: any[]): Table<Budget> };
			Conversation: { new(...args: any[]): Table<Conversation> };
			DamRelease: { new(...args: any[]): Table<DamRelease> };
			DataSource: { new(...args: any[]): Table<DataSource> };
			DeveloperNote: { new(...args: any[]): Table<DeveloperNote> };
			ExternalFetch: { new(...args: any[]): Table<ExternalFetch> };
			ForecastOutput: { new(...args: any[]): Table<ForecastOutput> };
			ForecastRun: { new(...args: any[]): Table<ForecastRun> };
			Gauge: { new(...args: any[]): Table<Gauge> };
			GaugeReading: { new(...args: any[]): Table<GaugeReading> };
			IngestionLog: { new(...args: any[]): Table<IngestionLog> };
			Memory: { new(...args: any[]): Table<Memory> };
			Message: { new(...args: any[]): Table<Message> };
			Metric: { new(...args: any[]): Table<Metric> };
			Reservoir: { new(...args: any[]): Table<Reservoir> };
			River: { new(...args: any[]): Table<River> };
			RiverSection: { new(...args: any[]): Table<RiverSection> };
			Scene: { new(...args: any[]): Table<Scene> };
			SnowpackBasin: { new(...args: any[]): Table<SnowpackBasin> };
			SnowpackReading: { new(...args: any[]): Table<SnowpackReading> };
			Spend: { new(...args: any[]): Table<Spend> };
			Task: { new(...args: any[]): Table<Task> };
			ToolRegistry: { new(...args: any[]): Table<ToolRegistry> };
			Trigger: { new(...args: any[]): Table<Trigger> };
			UILayout: { new(...args: any[]): Table<UILayout> };
			User: { new(...args: any[]): Table<User> };
			WebhookEvent: { new(...args: any[]): Table<WebhookEvent> };
		};
		geofence: {
			Store: { new(...args: any[]): Table<geofence_Store> };
		};
		geolookup: {
			Cell: { new(...args: any[]): Table<geolookup_Cell> };
			DataLoadJob: { new(...args: any[]): Table<geolookup_DataLoadJob> };
			Location: { new(...args: any[]): Table<geolookup_Location> };
		};
		oauth: {
			csrf_tokens: { new(...args: any[]): Table<oauth_csrf_token> };
		};
	};
}
