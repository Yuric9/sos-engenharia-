# S.O.S Desktop — Lógica Funcional Consolidada

## Centro do sistema
A Dashboard é a visão operacional. Exibe cards/gráficos simples no topo e uma tabela compacta com O.S., data, Secretaria/Unidade, serviço, equipe, prazo/tempo e situação. Clicar em uma linha abre a ficha completa da O.S.

## Ficha completa da O.S.
Cada O.S. funciona como um prontuário: Resumo, Andamentos, Fotos e Arquivos, Materiais, Mão de Obra, Histórico e Encerramento. Permite editar todos os dados, adicionar/remover anexos, arquivar/restaurar e excluir conforme permissão.

## Dados principais
Número automático sequencial infinito; data de abertura; solicitante/setor/contato; origem (ofício, memorando, verbal, telefone, e-mail, outro); Secretaria > Unidade > Local em cascata; tipo e descrição do serviço; prioridade; prazo; tempo estimado em horas/diárias; equipe executora; origem da mão de obra; materiais; observações; status; progresso; atendimento e encerramento.

## Status
ABERTA; EM_ANDAMENTO; PARALISADA; AGUARDANDO_MATERIAL; ATENDIDA; CONCLUIDA; CANCELADA. Paralisação exige motivo. Conclusão/cancelamento só podem ser reabertos por Admin.

## Progresso e resumo
Progresso de 0–100%, sugerido pelo status e editável. Botão Gerar Resumo produz versão interna, compartilhável e relatório PDF com início, andamento e conclusão. Pode abrir WhatsApp com texto preparado; integração API pode ser adicionada depois.

## Anexos
Fotos Antes/Durante/Final, prints, ofícios, notas fiscais, comprovantes, orçamentos, laudos e outros. Múltiplos anexos por O.S.; registrar usuário/data/hora; exclusão controlada e auditada.

## CRUD e arquivamento
Cadastros: criar, visualizar, editar, inativar, restaurar e excluir quando não houver vínculos. O.S.: editar, arquivar, restaurar e excluir por permissão. Exclusão definitiva deve ser confirmada e auditada.

## Equipes
Saúde, Educação, Administrativo, Equipe Própria e quaisquer outras cadastradas. Registrar origem da mão de obra: própria, equipe da Secretaria, terceirizada ou outra. Dashboard e relatórios filtram por equipe.

## Dashboard e relatórios
Cards de abertas, em andamento, paralisadas, aguardando material, atendidas, concluídas, atrasadas, canceladas e arquivadas. Gráficos mensais, por Secretaria, Unidade, Equipe, Serviço e status. Cards/gráficos funcionam como filtros da lista.

## Segurança
ADMIN e OPERADOR. Hash de senha, bloqueio após 5 tentativas, log de acesso e auditoria. Histórico registra mudanças relevantes e valores antes/depois.

## Backup e portabilidade
Tauri + React/Vite + Rust + SQLite. Modo instalado usa pasta local do Windows. Modo portátil é ativado com `portable.flag` ao lado do executável e mantém `sos-data/data`, `anexos`, `backups`, `logs`. Backup diário + manual/restauração. Não executar banco diretamente em pasta sincronizada durante uso simultâneo.

## Importação histórica
A planilha Excel antiga será importada como base legada preservando número, data, local, serviço, atendimento, horas/diárias, observação, material e entrega. Duplicidades e datas suspeitas são sinalizadas, não apagadas automaticamente.
