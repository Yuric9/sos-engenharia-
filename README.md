# S.O.S — Sistema de Ordens de Manutenção

Aplicativo desktop Windows para gestão de Ordens de Serviço de manutenção predial.

## Arquitetura
- Tauri 2
- React + Vite + TypeScript
- Rust
- SQLite (`rusqlite`)
- Instalável Windows (NSIS/MSI)
- Modo portátil via `portable.flag`

## Estado atual — v0.1.0
- Estrutura visual inicial do Dashboard.
- Ficha detalhada de O.S. com edição/arquivamento/exclusão representados na interface.
- Seções de materiais, anexos, andamento e mão de obra.
- Cards e gráfico mensal iniciais.
- Banco SQLite inicial com entidades principais e auditoria.
- Arquitetura portátil/instalada preparada.
- Lógica funcional consolidada em `docs/LOGICA-SISTEMA.md`.

## Próximos marcos
1. Persistência real do Dashboard e CRUD de O.S.
2. Login e permissões Admin/Operador.
3. Cadastros em cascata Secretaria > Unidade > Local.
4. Upload/visualização/exclusão de fotos e documentos.
5. Histórico/auditoria e transições de status.
6. Importador da planilha legada.
7. Relatórios/PDF e compartilhamento WhatsApp.
8. Backup/restauração e build Windows instalável + portátil.
