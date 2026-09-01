# S.O.S — Sistema de Ordens de Manutenção

Sistema para gestão das Ordens de Serviço de manutenção predial do Departamento de Engenharia.

## Versão atual — 0.4.0
- React + Vite + TypeScript
- Desktop Windows com Tauri v2
- Modo portátil para execução em HD externo
- SQLite no próprio HD (`sos-data/data/sos.db`)
- O.S. persistidas individualmente no SQLite, com migração automática do snapshot legado
- Auditoria de criação, alteração, exclusão e importação de O.S.
- Backup manual e backup automático diário ao iniciar
- Login Admin/Operador sem credenciais padrão expostas
- Senhas armazenadas com PBKDF2-SHA256 + salt no armazenamento de credenciais
- Bloqueio temporário após 5 tentativas incorretas
- Exportação JSON não inclui usuários, hashes ou senhas

## Estrutura portátil
Ao executar junto de `portable.flag`, o sistema usa:
- `sos-data/data/sos.db`
- `sos-data/anexos/`
- `sos-data/backups/`
- `sos-data/logs/`

## Estado da arquitetura
A persistência das O.S. deixou de usar um único blob global e passou a usar um registro individual por O.S. no SQLite, reduzindo o risco de perda da base inteira em uma única gravação. Cadastros e perfis ainda possuem uma camada de snapshot de compatibilidade enquanto a migração relacional completa é concluída.

Os anexos possuem limite de 900 KB por arquivo no frontend, mas ainda ficam incorporados à O.S. em base64. A próxima etapa arquitetural é mover os binários para `sos-data/anexos/` e manter somente metadados/caminho no banco.

## Segurança
Não existem mais usuários `admin/admin123` ou `operador/operador123` predefinidos. No primeiro acesso o sistema exige criação do primeiro administrador. Senhas não são exportadas no backup JSON. Após cinco tentativas incorretas o usuário é bloqueado por 15 minutos.

## Importante
Enquanto a migração relacional e o armazenamento físico dos anexos não forem concluídos e validados em campo, mantenha backups regulares e não use o HD externo como única cópia de dados oficiais. Nunca remova o HD enquanto o S.O.S estiver aberto.

## Próximos marcos
1. Mover anexos para `sos-data/anexos/` com validação no Rust.
2. Migrar cadastros e usuários para tabelas relacionais dedicadas.
3. Ampliar auditoria para usuários, cadastros e autenticação no SQLite.
4. Estruturar andamentos, paralisações, materiais e mão de obra nas tabelas relacionais existentes.
5. Adicionar testes automatizados de autenticação, persistência, importação e regras de O.S.
