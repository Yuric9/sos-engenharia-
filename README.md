# S.O.S — Sistema Web de Ordens de Manutenção

Sistema web para gestão das Ordens de Serviço de manutenção predial da Engenharia.

## Arquitetura atual — fase de desenvolvimento
- React + Vite + TypeScript
- Aplicação web acessada pelo navegador
- Persistência provisória em `localStorage` para validar o fluxo antes da escolha do banco definitivo
- Sem Cloudflare, D1, R2 ou Workers

## Funcional na v0.3
- Dashboard com indicadores, gráfico mensal, pesquisa e filtros.
- Cadastro de Nova O.S. com numeração automática.
- Ficha completa ao clicar na O.S.
- Edição dos dados da O.S., status e progresso.
- Arquivar e restaurar O.S.
- Exclusão com confirmação.
- Materiais, observações, equipe, prazo e ofício.
- Upload e exclusão de fotos/documentos pequenos durante a fase de teste.
- Impressão da ficha.
- Geração de resumo para copiar e enviar pelo WhatsApp.
- Dados de teste persistem no navegador entre recarregamentos.

## Importante
O armazenamento do navegador é apenas provisório. Ele não é o banco de produção e não deve ser usado como cópia única de dados oficiais. Após a validação da interface e das regras, será conectado um banco central e armazenamento de arquivos no servidor.

## Próximos marcos
1. Login e perfis Admin/Operador.
2. Cadastros em cascata Secretaria > Unidade > Local.
3. Cadastro estruturado de equipes, técnicos e materiais.
4. Histórico/auditoria completo por alteração.
5. Andamentos, paralisações e mão de obra estruturados.
6. Relatórios e PDF com início/durante/final.
7. Importador da planilha legada.
8. Migração do armazenamento provisório para banco definitivo.
