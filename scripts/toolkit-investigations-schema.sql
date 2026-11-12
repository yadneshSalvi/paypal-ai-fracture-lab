-- Additive schema only. Back up the exact target database and inspect its
-- original rows before applying this migration in a separately authorized lane.
BEGIN;
SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE;
CREATE TABLE IF NOT EXISTS lab_toolkit_reviews(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,request_id TEXT NOT NULL,input_hash TEXT NOT NULL,witness_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,status TEXT NOT NULL,phase TEXT NOT NULL,lease_owner TEXT,lease_until TEXT,workflow_id TEXT,dispatch_version INTEGER NOT NULL DEFAULT 0,result_evidence_id TEXT,error_code TEXT,document TEXT NOT NULL,UNIQUE(session_id,request_id));
CREATE INDEX IF NOT EXISTS lab_toolkit_reviews_session ON lab_toolkit_reviews(session_id,created_at);
CREATE TABLE IF NOT EXISTS lab_toolkit_commands(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,review_id TEXT NOT NULL,input_hash TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS lab_toolkit_commands_review ON lab_toolkit_commands(session_id,review_id,created_at);
COMMIT;
