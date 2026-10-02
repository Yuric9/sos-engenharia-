-- Usuários e cadastros em tabelas próprias (antes ficavam num único JSON em app_snapshots).
-- `position` guarda a ordem da lista exibida na tela; `extra_json` guarda campos que ainda
-- não têm coluna, para que nada se perca numa gravação.

CREATE TABLE IF NOT EXISTS user_accounts(
  position INTEGER PRIMARY KEY,
  id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  login TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'OPERADOR',
  scope TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT,
  password_salt TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  extra_json TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_accounts_id ON user_accounts(id);

CREATE TABLE IF NOT EXISTS catalog_items(
  kind TEXT NOT NULL,
  position INTEGER NOT NULL,
  id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  parent TEXT,
  detail TEXT,
  address TEXT,
  extra_json TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(kind, position)
);
CREATE INDEX IF NOT EXISTS idx_catalog_items_kind_id ON catalog_items(kind, id);

INSERT INTO settings(key,value,updated_at) VALUES('schema_version','3',CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP;
