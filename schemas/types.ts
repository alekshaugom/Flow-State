/**
 Generated from HarperDB schema
 Manual changes will be lost!
 > harper dev .
 */
export interface Agent {
	id: string;
	capabilities?: string[];
	created_at?: string;
	model?: string;
	name?: string;
	role?: string;
	status?: string;
	system_prompt?: string;
	updated_at?: string;
}

export type NewAgent = Omit<Agent, 'id'>;
export type { Agent as AgentRecord };
export type AgentRecords = Agent[];
export type NewAgentRecord = Omit<Agent, 'id'>;

export interface AgentSecret {
	id: string;
	created_at?: string;
	created_by?: string;
	key?: string;
	last_used_at?: string;
	value?: string;
	vendor?: string;
}

export type NewAgentSecret = Omit<AgentSecret, 'id'>;
export type { AgentSecret as AgentSecretRecord };
export type AgentSecretRecords = AgentSecret[];
export type NewAgentSecretRecord = Omit<AgentSecret, 'id'>;

export interface AppState {
	id: string;
	userId?: string;
	activeSceneId?: string;
	transitions?: string;
}

export type NewAppState = Omit<AppState, 'id'>;
export type { AppState as AppStateRecord };
export type AppStateRecords = AppState[];
export type NewAppStateRecord = Omit<AppState, 'id'>;

export interface Approval {
	id: string;
	action_kind?: string;
	auto_decision?: string;
	batch_id?: string;
	children_count?: number;
	conversation_id?: string;
	decided_at?: string;
	decided_by?: string;
	decision_notes?: string;
	expires_at?: string;
	is_batch?: boolean;
	linked_task_id?: string;
	payload?: string;
	rationale?: string;
	requested_at?: string;
	requester_agent_id?: string;
	status?: string;
	summary?: string;
}

export type NewApproval = Omit<Approval, 'id'>;
export type { Approval as ApprovalRecord };
export type ApprovalRecords = Approval[];
export type NewApprovalRecord = Omit<Approval, 'id'>;

export interface Artifact {
	id: string;
	approval_id?: string;
	body?: string;
	created_at?: string;
	created_by?: string;
	description?: string;
	diff?: string;
	kind?: string;
	operation?: string;
	path?: string;
	status?: string;
	supersedes_id?: string;
	title?: string;
	updated_at?: string;
	version?: number;
}

export type NewArtifact = Omit<Artifact, 'id'>;
export type { Artifact as ArtifactRecord };
export type ArtifactRecords = Artifact[];
export type NewArtifactRecord = Omit<Artifact, 'id'>;

export interface Budget {
	id: string;
	created_at?: string;
	limit_cents?: number;
	name?: string;
	period?: string;
	period_end?: string;
	period_start?: string;
	rolls_over?: boolean;
	spent_cents?: number;
}

export type NewBudget = Omit<Budget, 'id'>;
export type { Budget as BudgetRecord };
export type BudgetRecords = Budget[];
export type NewBudgetRecord = Omit<Budget, 'id'>;

export interface Conversation {
	id: string;
	agent_ids?: string[];
	created_at?: string;
	last_message_at?: string;
	title?: string;
	transcript?: any;
	updated_at?: string;
	user_id?: string;
}

export type NewConversation = Omit<Conversation, 'id'>;
export type { Conversation as ConversationRecord };
export type ConversationRecords = Conversation[];
export type NewConversationRecord = Omit<Conversation, 'id'>;

export interface DamRelease {
	id: string;
	reservoirId?: string;
	reservoir?: Reservoir;
	timestamp?: string;
	outflowCfs?: number;
	inflowCfs?: number;
	storageAcreFt?: number;
	elevationFt?: number;
	source?: string;
}

export type NewDamRelease = Omit<DamRelease, 'id'>;
export type { DamRelease as DamReleaseRecord };
export type DamReleaseRecords = DamRelease[];
export type NewDamReleaseRecord = Omit<DamRelease, 'id'>;

export interface DataSource {
	id: string;
	name?: string;
	type?: string;
	baseUrl?: string;
	description?: string;
	updateFrequencyMinutes?: number;
	active?: boolean;
	lastFetchAt?: string;
	lastError?: string;
}

export type NewDataSource = Omit<DataSource, 'id'>;
export type { DataSource as DataSourceRecord };
export type DataSourceRecords = DataSource[];
export type NewDataSourceRecord = Omit<DataSource, 'id'>;

export interface DeveloperNote {
	id: string;
	author?: string;
	body?: string;
	created_at?: string;
	embedding?: number[];
	file_path?: string;
	kind?: string;
	summary?: string;
	tags?: string[];
	title?: string;
}

export type NewDeveloperNote = Omit<DeveloperNote, 'id'>;
export type { DeveloperNote as DeveloperNoteRecord };
export type DeveloperNoteRecords = DeveloperNote[];
export type NewDeveloperNoteRecord = Omit<DeveloperNote, 'id'>;

export interface ExternalFetch {
	id: string;
	agent_id?: string;
	bytes?: number;
	conversation_id?: string;
	fetched_at?: string;
	method?: string;
	status?: number;
	url?: string;
}

export type NewExternalFetch = Omit<ExternalFetch, 'id'>;
export type { ExternalFetch as ExternalFetchRecord };
export type ExternalFetchRecords = ExternalFetch[];
export type NewExternalFetchRecord = Omit<ExternalFetch, 'id'>;

export interface ForecastOutput {
	id: string;
	forecastRunId?: string;
	forecastRun?: ForecastRun;
	date?: string;
	flowMin?: number;
	flowMax?: number;
	flowExpected?: number;
	confidence?: number;
	assumptions?: string;
	safetyNotes?: string;
}

export type NewForecastOutput = Omit<ForecastOutput, 'id'>;
export type { ForecastOutput as ForecastOutputRecord };
export type ForecastOutputRecords = ForecastOutput[];
export type NewForecastOutputRecord = Omit<ForecastOutput, 'id'>;

export interface ForecastRun {
	id: string;
	sectionId?: string;
	section?: RiverSection;
	createdAt?: string;
	model?: string;
	status?: string;
	inputPackage?: string;
	notes?: string;
	outputs?: ForecastOutput[];
}

export type NewForecastRun = Omit<ForecastRun, 'id'>;
export type { ForecastRun as ForecastRunRecord };
export type ForecastRunRecords = ForecastRun[];
export type NewForecastRunRecord = Omit<ForecastRun, 'id'>;

export interface Gauge {
	id: string;
	name?: string;
	source?: string;
	sourceId?: string;
	riverId?: string;
	river?: River;
	latitude?: number;
	longitude?: number;
	parameter?: string;
	unit?: string;
	url?: string;
	active?: boolean;
	readings?: GaugeReading[];
}

export type NewGauge = Omit<Gauge, 'id'>;
export type { Gauge as GaugeRecord };
export type GaugeRecords = Gauge[];
export type NewGaugeRecord = Omit<Gauge, 'id'>;

export interface GaugeReading {
	id: string;
	gaugeId?: string;
	gauge?: Gauge;
	timestamp?: string;
	value?: number;
	unit?: string;
	qualityFlag?: string;
	source?: string;
}

export type NewGaugeReading = Omit<GaugeReading, 'id'>;
export type { GaugeReading as GaugeReadingRecord };
export type GaugeReadingRecords = GaugeReading[];
export type NewGaugeReadingRecord = Omit<GaugeReading, 'id'>;

export interface IngestionLog {
	id: string;
	sourceId?: string;
	source?: DataSource;
	timestamp?: string;
	status?: string;
	recordsProcessed?: number;
	errors?: string;
	durationMs?: number;
}

export type NewIngestionLog = Omit<IngestionLog, 'id'>;
export type { IngestionLog as IngestionLogRecord };
export type IngestionLogRecords = IngestionLog[];
export type NewIngestionLogRecord = Omit<IngestionLog, 'id'>;

export interface Memory {
	id: string;
	agent_id?: string;
	content?: string;
	created_at?: string;
	embedding?: number[];
	expires_at?: string;
	references?: string[];
	salience?: number;
	source?: string;
	subtype?: string;
	summary?: string;
	tags?: string[];
	type?: string;
}

export type NewMemory = Omit<Memory, 'id'>;
export type { Memory as MemoryRecord };
export type MemoryRecords = Memory[];
export type NewMemoryRecord = Omit<Memory, 'id'>;

export interface Message {
	id: string;
	author?: string;
	completed_at?: string;
	content?: string;
	conversation_id?: string;
	created_at?: string;
	current_step?: string;
	model?: string;
	role?: string;
	status?: string;
	steps?: string;
	token_count?: number;
	tool_call_id?: string;
	tool_calls?: string;
}

export type NewMessage = Omit<Message, 'id'>;
export type { Message as MessageRecord };
export type MessageRecords = Message[];
export type NewMessageRecord = Omit<Message, 'id'>;

export interface Metric {
	id: string;
	dimensions?: string;
	name?: string;
	source?: string;
	timestamp?: string;
	unit?: string;
	value?: number;
}

export type NewMetric = Omit<Metric, 'id'>;
export type { Metric as MetricRecord };
export type MetricRecords = Metric[];
export type NewMetricRecord = Omit<Metric, 'id'>;

export interface Reservoir {
	id: string;
	name?: string;
	riverId?: string;
	river?: River;
	operator?: string;
	latitude?: number;
	longitude?: number;
	maxStorageAcreFt?: number;
	normalElevationFt?: number;
	sourceId?: string;
	source?: string;
	url?: string;
	notes?: string;
	releases?: DamRelease[];
}

export type NewReservoir = Omit<Reservoir, 'id'>;
export type { Reservoir as ReservoirRecord };
export type ReservoirRecords = Reservoir[];
export type NewReservoirRecord = Omit<Reservoir, 'id'>;

export interface River {
	id: string;
	name?: string;
	state?: string;
	description?: string;
	watershed?: string;
	sections?: RiverSection[];
	gauges?: Gauge[];
	reservoirs?: Reservoir[];
}

export type NewRiver = Omit<River, 'id'>;
export type { River as RiverRecord };
export type RiverRecords = River[];
export type NewRiverRecord = Omit<River, 'id'>;

export interface RiverSection {
	id: string;
	riverId?: string;
	river?: River;
	name?: string;
	putIn?: string;
	takeOut?: string;
	difficultyMin?: string;
	difficultyMax?: string;
	lengthMiles?: number;
	flowLow?: number;
	flowRunnable?: number;
	flowIdealMin?: number;
	flowIdealMax?: number;
	flowHigh?: number;
	flowExpert?: number;
	flowDangerous?: number;
	primaryGaugeId?: string;
	upstreamGaugeIds?: string;
	downstreamGaugeIds?: string;
	reservoirIds?: string;
	snowpackBasinIds?: string;
	notes?: string;
	latitude?: number;
	longitude?: number;
}

export type NewRiverSection = Omit<RiverSection, 'id'>;
export type { RiverSection as RiverSectionRecord };
export type RiverSectionRecords = RiverSection[];
export type NewRiverSectionRecord = Omit<RiverSection, 'id'>;

export interface Scene {
	id: string;
	userId?: string;
	name?: string;
	kind?: string;
	canvas?: string;
	blocks?: string;
	accent?: string;
	externals?: string;
	github?: string;
	sortOrder?: number;
}

export type NewScene = Omit<Scene, 'id'>;
export type { Scene as SceneRecord };
export type SceneRecords = Scene[];
export type NewSceneRecord = Omit<Scene, 'id'>;

export interface SnowpackBasin {
	id: string;
	name?: string;
	state?: string;
	huc?: string;
	relevantRiverIds?: string;
	source?: string;
	url?: string;
	readings?: SnowpackReading[];
}

export type NewSnowpackBasin = Omit<SnowpackBasin, 'id'>;
export type { SnowpackBasin as SnowpackBasinRecord };
export type SnowpackBasinRecords = SnowpackBasin[];
export type NewSnowpackBasinRecord = Omit<SnowpackBasin, 'id'>;

export interface SnowpackReading {
	id: string;
	basinId?: string;
	basin?: SnowpackBasin;
	timestamp?: string;
	sweInches?: number;
	swePercentMedian?: number;
	snowDepthInches?: number;
	precipAccumInches?: number;
	source?: string;
}

export type NewSnowpackReading = Omit<SnowpackReading, 'id'>;
export type { SnowpackReading as SnowpackReadingRecord };
export type SnowpackReadingRecords = SnowpackReading[];
export type NewSnowpackReadingRecord = Omit<SnowpackReading, 'id'>;

export interface Spend {
	id: string;
	agent_id?: string;
	amount_cents?: number;
	approval_id?: string;
	budget_id?: string;
	created_at?: string;
	meta?: string;
	purpose?: string;
	vendor?: string;
}

export type NewSpend = Omit<Spend, 'id'>;
export type { Spend as SpendRecord };
export type SpendRecords = Spend[];
export type NewSpendRecord = Omit<Spend, 'id'>;

export interface Task {
	id: string;
	agent_id?: string;
	approval_id?: string;
	completed_at?: string;
	created_at?: string;
	description?: string;
	due_at?: string;
	parent_task_id?: string;
	priority?: string;
	result?: string;
	source?: string;
	status?: string;
	title?: string;
}

export type NewTask = Omit<Task, 'id'>;
export type { Task as TaskRecord };
export type TaskRecords = Task[];
export type NewTaskRecord = Omit<Task, 'id'>;

export interface ToolRegistry {
	id: string;
	action_kind?: string;
	added_by?: string;
	call_count?: number;
	created_at?: string;
	description?: string;
	input_schema?: string;
	kind?: string;
	last_used_at?: string;
	source_path?: string;
}

export type NewToolRegistry = Omit<ToolRegistry, 'id'>;
export type { ToolRegistry as ToolRegistryRecord };
export type ToolRegistryRecords = ToolRegistry[];
export type NewToolRegistryRecord = Omit<ToolRegistry, 'id'>;

export interface Trigger {
	id: string;
	action_kind?: string;
	action_payload?: string;
	created_at?: string;
	enabled?: boolean;
	event_topic?: string;
	kind?: string;
	last_fired_at?: string;
	name?: string;
	next_fire_at?: string;
	schedule?: string;
	severity?: string;
}

export type NewTrigger = Omit<Trigger, 'id'>;
export type { Trigger as TriggerRecord };
export type TriggerRecords = Trigger[];
export type NewTriggerRecord = Omit<Trigger, 'id'>;

export interface UILayout {
	id: string;
	scope?: string;
	updated_at?: string;
	updated_by?: string;
	version?: number;
	widgets?: string;
}

export type NewUILayout = Omit<UILayout, 'id'>;
export type { UILayout as UILayoutRecord };
export type UILayoutRecords = UILayout[];
export type NewUILayoutRecord = Omit<UILayout, 'id'>;

export interface User {
	id: string;
	email?: string;
	name?: string;
	provider?: string;
	createdAt?: string;
	lastLoginDate?: string;
}

export type NewUser = Omit<User, 'id'>;
export type { User as UserRecord };
export type UserRecords = User[];
export type NewUserRecord = Omit<User, 'id'>;

export interface WebhookEvent {
	id: string;
	body?: string;
	processed_at?: string;
	processed_result?: string;
	received_at?: string;
	signature_ok?: boolean;
	topic?: string;
	vendor?: string;
}

export type NewWebhookEvent = Omit<WebhookEvent, 'id'>;
export type { WebhookEvent as WebhookEventRecord };
export type WebhookEventRecords = WebhookEvent[];
export type NewWebhookEventRecord = Omit<WebhookEvent, 'id'>;

export interface geofence_Store {
	id: string;
	address?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
	name?: string;
	state?: string;
	store_id?: string;
	zip?: string;
}

export type geofence_NewStore = Omit<geofence_Store, 'id'>;
export type { geofence_Store as geofence_StoreRecord };
export type geofence_StoreRecords = geofence_Store[];
export type geofence_NewStoreRecord = Omit<geofence_Store, 'id'>;

export interface geolookup_Cell {
	h3_index: string;
	tier_1?: string;
	tier_2?: string;
	tier_3?: string;
}

export type geolookup_NewCell = Omit<geolookup_Cell, 'h3_index'>;
export type { geolookup_Cell as geolookup_CellRecord };
export type geolookup_CellRecords = geolookup_Cell[];
export type geolookup_NewCellRecord = Omit<geolookup_Cell, 'h3_index'>;

export interface geolookup_DataLoadJob {
	id: string;
	cell_count?: number;
	completed_at?: string;
	duration_ms?: number;
	error_message?: string;
	location_count?: number;
	started_at?: string;
	state?: string;
	status?: string;
}

export type geolookup_NewDataLoadJob = Omit<geolookup_DataLoadJob, 'id'>;
export type { geolookup_DataLoadJob as geolookup_DataLoadJobRecord };
export type geolookup_DataLoadJobRecords = geolookup_DataLoadJob[];
export type geolookup_NewDataLoadJobRecord = Omit<geolookup_DataLoadJob, 'id'>;

export interface geolookup_Location {
	id: string;
	country_code?: string;
	county_fips?: string;
	county_name?: string;
	feature_type?: string;
	h3_index?: string;
	lat?: number;
	lon?: number;
	lsad?: string;
	name?: string;
	name_full?: string;
	state_abbrev?: string;
	state_name?: string;
	tier?: number;
	tier_label?: string;
}

export type geolookup_NewLocation = Omit<geolookup_Location, 'id'>;
export type { geolookup_Location as geolookup_LocationRecord };
export type geolookup_LocationRecords = geolookup_Location[];
export type geolookup_NewLocationRecord = Omit<geolookup_Location, 'id'>;

export interface oauth_csrf_token {
	token_id: string;
	data?: string;
	created_at?: number;
}

export type oauth_Newcsrf_token = Omit<oauth_csrf_token, 'token_id'>;
export type oauth_csrf_tokens = oauth_csrf_token[];
export type { oauth_csrf_token as oauth_csrf_tokenRecord };
export type oauth_csrf_tokenRecords = oauth_csrf_token[];
export type oauth_Newcsrf_tokenRecord = Omit<oauth_csrf_token, 'token_id'>;
