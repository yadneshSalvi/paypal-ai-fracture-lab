import { PostgresDatabase, SqlPaymentStore } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { requiredConfig } from "./config";

const schema=[
  `CREATE TABLE IF NOT EXISTS lab_errand_operations(run_id TEXT PRIMARY KEY,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,stage TEXT NOT NULL,order_id TEXT,attempts INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_background_models(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,action_id TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_locks(id TEXT PRIMARY KEY)`,
  `INSERT INTO lab_locks(id) VALUES('worker-capacity') ON CONFLICT DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS lab_sessions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,role TEXT NOT NULL,selected_run_id TEXT,seeded INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS lab_runs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,request_id TEXT NOT NULL,input_hash TEXT NOT NULL,project_id TEXT NOT NULL,stage TEXT NOT NULL,checkpoint TEXT NOT NULL,source TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,cancelled INTEGER NOT NULL DEFAULT 0,document TEXT NOT NULL,UNIQUE(session_id,request_id))`,
  `CREATE INDEX IF NOT EXISTS lab_runs_session ON lab_runs(session_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS lab_jobs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT,kind TEXT NOT NULL,stage TEXT NOT NULL,available_at TEXT NOT NULL,lease_owner TEXT,lease_until TEXT,attempts INTEGER NOT NULL DEFAULT 0,document TEXT NOT NULL,error_code TEXT,UNIQUE(session_id,kind,id))`,
  `CREATE TABLE IF NOT EXISTS lab_events(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,sequence INTEGER NOT NULL,document TEXT NOT NULL,UNIQUE(run_id,sequence))`,
  `CREATE TABLE IF NOT EXISTS lab_evidence(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT,created_at TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lab_evidence_session ON lab_evidence(session_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS lab_repairs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_campaigns(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,request_id TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL,UNIQUE(session_id,request_id))`,
  `CREATE TABLE IF NOT EXISTS lab_actions(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,action TEXT NOT NULL,input_hash TEXT NOT NULL,stage TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(session_id,id))`,
  `CREATE TABLE IF NOT EXISTS lab_rate_windows(key TEXT NOT NULL,window_key TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,window_key))`,
  `CREATE TABLE IF NOT EXISTS lab_provider_resources(run_id TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,parent_id TEXT,document TEXT NOT NULL,PRIMARY KEY(run_id,id))`,
  `CREATE TABLE IF NOT EXISTS lab_provider_requests(run_id TEXT NOT NULL,endpoint TEXT NOT NULL,request_key TEXT NOT NULL,payload_hash TEXT NOT NULL,resource_id TEXT NOT NULL,PRIMARY KEY(run_id,endpoint,request_key))`,
  `CREATE TABLE IF NOT EXISTS lab_target_attempts(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_faults(run_id TEXT NOT NULL,fault_key TEXT NOT NULL,document TEXT NOT NULL,PRIMARY KEY(run_id,fault_key))`,
  `CREATE TABLE IF NOT EXISTS lab_target_state(run_id TEXT NOT NULL,intent_id TEXT NOT NULL,document TEXT NOT NULL,PRIMARY KEY(run_id,intent_id))`,
  `CREATE TABLE IF NOT EXISTS lab_fulfillments(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,intent_id TEXT NOT NULL,capture_id TEXT NOT NULL,entitlement_key TEXT NOT NULL,document TEXT NOT NULL,UNIQUE(run_id,entitlement_key))`,
  `CREATE TABLE IF NOT EXISTS lab_webhook_deliveries(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,event_id TEXT NOT NULL,verified INTEGER NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_target_event_claims(run_id TEXT NOT NULL,event_id TEXT NOT NULL,PRIMARY KEY(run_id,event_id))`,
  `CREATE TABLE IF NOT EXISTS lab_model_attempts(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT,role TEXT NOT NULL,status TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_evaluations(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lab_developer_grants(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS lab_repair_jobs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,action_id TEXT NOT NULL,kind TEXT NOT NULL,stage TEXT NOT NULL,created_at TEXT NOT NULL,lease_owner TEXT,lease_until TEXT,input_hash TEXT NOT NULL,document TEXT NOT NULL,error_code TEXT)`,
  `CREATE TABLE IF NOT EXISTS lab_generated_patches(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,source_hash TEXT NOT NULL,context_digest TEXT NOT NULL,document TEXT NOT NULL)`
];
export async function initializeDatabase(db:SqlDatabase){for(const statement of schema)await db.query(statement);await new SqlPaymentStore(db).initialize();return db;}
const state=globalThis as typeof globalThis&{fractureApplicationDatabase?:Promise<SqlDatabase>};
export function getDatabase(){
  if(!state.fractureApplicationDatabase)state.fractureApplicationDatabase=initializeDatabase(new PostgresDatabase(requiredConfig("DATABASE_URL"))).catch(error=>{delete state.fractureApplicationDatabase;throw error;});
  return state.fractureApplicationDatabase;
}
