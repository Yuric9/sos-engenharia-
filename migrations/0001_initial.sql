PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('ADMIN','OPERADOR')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secretarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT,
  nome TEXT NOT NULL UNIQUE,
  responsavel TEXT,
  telefone TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  secretaria_id INTEGER NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  endereco TEXT,
  responsavel TEXT,
  telefone TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (secretaria_id) REFERENCES secretarias(id)
);

CREATE TABLE IF NOT EXISTS locais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unidade_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS equipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  origem_mao_obra TEXT,
  responsavel TEXT,
  observacao TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tecnicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  especialidade TEXT,
  telefone TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tipos_servico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  unidade_medida TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL UNIQUE,
  data_abertura TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  solicitante TEXT,
  setor_solicitante TEXT,
  contato_solicitante TEXT,
  origem_solicitacao TEXT,
  numero_oficio TEXT,
  data_oficio TEXT,
  secretaria_id INTEGER NOT NULL,
  unidade_id INTEGER NOT NULL,
  local_id INTEGER,
  tipo_servico_id INTEGER,
  descricao TEXT NOT NULL,
  servico_executado TEXT,
  prioridade TEXT NOT NULL DEFAULT 'MEDIA',
  prazo_previsto TEXT,
  tempo_estimado_valor REAL,
  tempo_estimado_unidade TEXT,
  status TEXT NOT NULL DEFAULT 'ABERTA',
  atendimento TEXT NOT NULL DEFAULT 'NAO',
  equipe_id INTEGER,
  responsavel_interno TEXT,
  progresso_percentual INTEGER NOT NULL DEFAULT 10,
  observacao_final TEXT,
  data_inicio TEXT,
  data_atendimento TEXT,
  data_conclusao TEXT,
  motivo_cancelamento TEXT,
  motivo_paralisacao TEXT,
  arquivada_em TEXT,
  excluida_em TEXT,
  criado_por INTEGER,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (secretaria_id) REFERENCES secretarias(id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id),
  FOREIGN KEY (local_id) REFERENCES locais(id),
  FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id),
  FOREIGN KEY (equipe_id) REFERENCES equipes(id),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS os_observacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL,
  texto TEXT NOT NULL,
  usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS os_mao_obra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL,
  tecnico_id INTEGER,
  equipe_id INTEGER,
  data_execucao TEXT NOT NULL,
  hora_inicio TEXT,
  hora_fim TEXT,
  diarias REAL,
  atividade TEXT,
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
  FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id),
  FOREIGN KEY (equipe_id) REFERENCES equipes(id)
);

CREATE TABLE IF NOT EXISTS os_materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL,
  material_id INTEGER,
  descricao_livre TEXT,
  quantidade REAL NOT NULL,
  unidade_medida TEXT,
  situacao TEXT NOT NULL DEFAULT 'NECESSARIO',
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
  FOREIGN KEY (material_id) REFERENCES materiais(id)
);

CREATE TABLE IF NOT EXISTS os_anexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  tipo_mime TEXT,
  tamanho_bytes INTEGER,
  descricao TEXT,
  usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  excluido_em TEXT,
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS os_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  os_id INTEGER NOT NULL,
  tipo_evento TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  comentario TEXT,
  usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id INTEGER,
  detalhes TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_secretaria ON ordens_servico(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_os_unidade ON ordens_servico(unidade_id);
CREATE INDEX IF NOT EXISTS idx_os_equipe ON ordens_servico(equipe_id);
CREATE INDEX IF NOT EXISTS idx_os_prazo ON ordens_servico(prazo_previsto);
CREATE INDEX IF NOT EXISTS idx_os_anexos_os ON os_anexos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_os ON os_historico(os_id);
