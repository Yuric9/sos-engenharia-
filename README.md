# S.O.S — Sistema de Ordens de Manutenção

Sistema para gestão das Ordens de Serviço de manutenção predial e das obras do Departamento de
Engenharia.

Versão atual: **0.5.0**

## Tecnologias

- React 18 + TypeScript + Vite
- Desktop Windows com Tauri v2 (Rust) e SQLite
- Vitest para testes automatizados e Prettier para formatação

## Como rodar

```bash
npm install
npm run dev          # versão web em http://localhost:5173
npm run tauri dev    # versão desktop (exige Rust instalado)
```

Comandos de verificação (os mesmos executados no CI):

```bash
npm run format:check # formatação
npm test             # testes automatizados
npm run typecheck    # checagem de tipos
npm run audit        # auditoria estática de UI e segurança
npm run build        # build de produção
cargo test --manifest-path src-tauri/Cargo.toml  # testes do backend Rust
```

## Armazenamento

- **Web:** dados no `localStorage` do navegador; anexos limitados a 900 KB.
- **Desktop:** banco SQLite, com cada O.S. gravada individualmente e auditoria de criação,
  alteração, exclusão e importação. Anexos (até 10 MB) ficam como arquivos em `sos-data/anexos/`.

### Modo portátil

Com o arquivo `portable.flag` ao lado do executável, o sistema grava tudo junto do programa (por
exemplo, num HD externo):

- `sos-data/data/sos.db`
- `sos-data/anexos/`
- `sos-data/backups/`
- `sos-data/logs/`

Backup automático diário ao iniciar e backup manual na tela **Backup / Migração**.

## Segurança

- Não existe usuário padrão: no primeiro acesso o sistema pede a criação do administrador.
- Senhas com PBKDF2-SHA256 (210.000 iterações) e salt aleatório.
- Bloqueio de 15 minutos após 5 tentativas incorretas.
- O backup JSON não inclui usuários, hashes ou senhas.
- No desktop, o login e as permissões são verificados no Rust (`src-tauri/src/session.rs`): só o
  Admin exclui O.S., importa, faz backup e altera usuários, cadastros e obras; operadores só gravam
  O.S. da própria área. Ao fechar o programa a sessão termina e é preciso entrar de novo.

## Importante

Mantenha backups regulares e não use o HD externo como única cópia dos dados oficiais. Nunca
remova o HD com o S.O.S aberto.

## Próximos passos

1. Migrar cadastros e usuários do snapshot JSON para tabelas próprias no SQLite.
2. Ampliar a auditoria para usuários, cadastros e autenticação.
3. Ampliar os testes (importação de planilha e regras de O.S.).

As regras de negócio estão documentadas em [`docs/LOGICA-SISTEMA.md`](docs/LOGICA-SISTEMA.md).
