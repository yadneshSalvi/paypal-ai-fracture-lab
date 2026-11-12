/** Additive only: historical lab_campaigns and all study tables are untouched. */
export const campaignSchema = [
  `CREATE TABLE IF NOT EXISTS lab_campaign_plans(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,request_id TEXT NOT NULL,input_hash TEXT NOT NULL,manifest_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL,reason TEXT,lease_owner TEXT,lease_until TEXT,lease_epoch INTEGER NOT NULL DEFAULT 0,dispatch_version INTEGER NOT NULL DEFAULT 0,workflow_id TEXT,document TEXT NOT NULL,UNIQUE(session_id,request_id))`,
  `CREATE INDEX IF NOT EXISTS lab_campaign_plans_session ON lab_campaign_plans(session_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS lab_campaign_cases_v1(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,session_id TEXT NOT NULL,ordinal INTEGER NOT NULL,status TEXT NOT NULL,run_id TEXT NOT NULL,reason TEXT,document TEXT NOT NULL,result TEXT,UNIQUE(campaign_id,ordinal),UNIQUE(run_id))`,
  `CREATE TABLE IF NOT EXISTS lab_campaign_events_v1(campaign_id TEXT NOT NULL,sequence INTEGER NOT NULL,document TEXT NOT NULL,PRIMARY KEY(campaign_id,sequence))`,
  `CREATE TABLE IF NOT EXISTS lab_campaign_commands_v1(session_id TEXT NOT NULL,request_id TEXT NOT NULL,campaign_id TEXT NOT NULL,input_hash TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(session_id,request_id))`,
];
