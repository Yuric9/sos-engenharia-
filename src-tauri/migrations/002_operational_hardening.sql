PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS work_order_records(
  id INTEGER PRIMARY KEY,
  number INTEGER NOT NULL,
  order_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_work_order_records_number ON work_order_records(number);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

INSERT OR IGNORE INTO settings(key,value) VALUES('schema_version','2');
