# S.O.S — Pacote para Auditoria Externa por IA

## PRIORIDADE MÁXIMA: LOGOS E ÍCONES
Antes de qualquer outra melhoria visual, confira e, se possível, CORRIJA diretamente a identidade visual do aplicativo.

Arquivos relacionados que acompanham este pacote:
- `src/brand.ts`
- `src/brandIcon.ts`
- `src/brand-fix.css`
- `public/prefeitura-trindade.png`
- `public/prefeitura-trindade-exata.png`
- `public/prefeitura-trindade-final.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`

A identidade aprovada é a marca SOS criada para o sistema. Verifique e corrija, se necessário:
1. logo da tela inicial / criação do primeiro ADMIN;
2. logo da tela de login;
3. logo/cabeçalho dentro do sistema;
4. identidade no menu lateral;
5. ícone do `.exe` no Windows Explorer;
6. ícone da janela do aplicativo;
7. ícone na barra de tarefas;
8. ícone de atalhos do Windows;
9. proporção e tamanho em cada uso, sem esticar, cortar ou achatar;
10. funcionamento da logo mesmo sem internet e sem depender de URL externa;
11. inclusão correta dos assets na build Tauri de produção.

Se encontrar arquivo de logo quebrado, placeholder, asset inválido ou configuração de ícone incorreta, corrija no projeto e explique exatamente o que foi alterado. Não substitua a identidade aprovada por um ícone genérico.

## Objetivo
Analise este projeto existente sem reconstruí-lo do zero. O objetivo é encontrar bugs, riscos de segurança, falhas de persistência, botões sem função, problemas de UX e inconsistências de regras de negócio. Preserve o que já funciona.

## Projeto
S.O.S — Sistema de Ordens de Manutenção / Departamento de Engenharia.
Stack atual: React + Vite + TypeScript no frontend; Tauri v2 + Rust + SQLite na versão desktop portátil para Windows.

## Regras importantes que NÃO devem ser alteradas sem apontar claramente o motivo
1. O número da O.S. é manual.
2. Possível duplicidade de número/ano/origem gera aviso, mas não bloqueia o salvamento.
3. Identificação de importação histórica considera número + ano + origem (Executivo, Saúde, Educação ou outra origem), pois o mesmo número pode existir em bases diferentes.
4. Dashboard operacional considera apenas o ano atual e não deve incluir itens arquivados.
5. Registros de anos anteriores importados são arquivados automaticamente.
6. Campos obrigatórios para salvar O.S.: Número da O.S., Data, Secretaria, Tipo de serviço, Equipe, Prazo, Prioridade e Tempo previsto. Unidade/Órgão, Local, Descrição, Ofício, Materiais e Observações são opcionais.
7. Ao importar PDF de O.S., o sistema deve tentar preencher número, data oficial da O.S. e demais dados detectáveis; PDF original permanece anexado.
8. PDF de materiais é apenas arquivado, sem tentativa de interpretar itens.
9. ADMIN: acesso administrativo completo. Máximo de 2 perfis ADMIN no desenho atual.
10. OPERADOR: sem menus administrativos. Operador da Saúde vê O.S. da Saúde; Educação vê Educação; Executivo vê Executivo. Gabinete do Prefeito possui visão geral, porém sem funções administrativas.
11. Obras são um módulo separado das O.S. e não entram nas métricas do Dashboard de O.S.
12. Todos podem consultar Obras; somente ADMIN pode cadastrar/editar dados de Obras.
13. Resumo financeiro de Obras é individual dentro de cada obra. Percentual pago considera somente medições pagas.
14. Sistema portátil deve funcionar com `SOS-Engenharia.exe` + `portable.flag`; dados em `sos-data/` ao lado do executável.
15. Produção Windows deve abrir sem janela de console preta.
16. Anexos desktop devem ser gravados fisicamente em `sos-data/anexos`, não como grandes blobs base64 no SQLite.
17. Não misture este projeto com outros sistemas/repositórios.

## Auditoria solicitada

### 1. Build e integridade
- Rode `npm install`.
- Rode `npm run audit`.
- Rode `npm run typecheck`.
- Rode `npm run build`.
- Se possível em Windows, rode o build Tauri de produção.
- Relate qualquer erro/warning relevante.

### 2. Botões e navegação
Teste ou inspecione TODOS os botões visíveis. Procure especialmente:
- botão sem `onClick` ou sem submit funcional;
- botão que aparenta executar uma função, mas não altera estado/dados;
- filtros que não filtram;
- linhas clicáveis que não abrem a ficha;
- voltar/cancelar que leva para tela errada;
- ações de editar, arquivar, restaurar, excluir, imprimir, anexar, abrir e remover arquivos.

Não considere uma ação funcional somente porque existe um handler: siga o fluxo até a persistência quando possível.

### 3. Persistência e SQLite
Faça revisão detalhada de:
- criação/edição/exclusão de O.S.;
- reinício do aplicativo e recuperação dos dados;
- persistência de usuários e primeiro ADMIN;
- cadastros;
- importação de planilhas;
- Obras, medições, documentos e andamentos;
- backup automático e manual;
- comportamento se o HD for desconectado ou a gravação falhar;
- transações e possibilidade de perda parcial de dados.

### 4. Arquivos e anexos
Teste/inspecione:
- JPG/JPEG/PNG/WEBP/GIF/PDF/DOC/DOCX;
- limite de tamanho;
- arquivo vazio/corrompido;
- extensão incompatível com MIME;
- nomes de arquivo estranhos;
- path traversal (`../`, caminhos absolutos, etc.);
- abrir e excluir;
- exclusão física e metadados;
- anexos de O.S. e de Obras;
- migração de anexos antigos base64;
- arquivos órfãos após importação/substituição/exclusão.

### 5. Segurança
Analise:
- hashing de senha e salt;
- tentativas inválidas/bloqueio;
- sessão;
- proteção do último ADMIN;
- limite de ADMINs;
- segregação Saúde/Educação/Executivo/Gabinete;
- chamadas Tauri que poderiam ser invocadas sem autorização do backend;
- validação apenas no frontend versus validação Rust/SQLite;
- importação de JSON/XLSX malformados;
- exposição de dados ou credenciais;
- logs/auditoria;
- permissões de exclusão.

Diferencie risco atual do modo local/portátil de riscos que se tornam críticos em uma futura arquitetura multiusuário.

### 6. Importação de planilha
Verifique planilhas com:
- cabeçalho na primeira linha;
- títulos/células mescladas antes do cabeçalho;
- cabeçalho em linhas posteriores;
- nomes alternativos de colunas;
- anos diferentes;
- mesmo número de O.S. em origens diferentes;
- linhas vazias e totais/rodapés;
- datas Excel e datas como texto;
- registros incompletos;
- duplicidades.

O sistema deve mostrar prévia e somente salvar após confirmação.

### 7. PDF de O.S.
Verifique:
- número da O.S.;
- DATA OFICIAL da O.S.;
- secretaria;
- tipo de serviço;
- equipe;
- descrição quando disponível;
- PDF sem texto selecionável;
- PDF com várias datas;
- PDF original anexado após leitura.

Não use OCR como se fosse requisito atual; apenas indique a limitação para PDFs escaneados.

### 8. Obras
Teste/inspecione:
- Nova obra;
- editar obra;
- ficha individual;
- contrato/projeto/fotos/aditivos/outros anexos;
- medições;
- marcar medição como paga;
- percentual pago;
- histórico de andamento;
- progresso físico;
- permissões ADMIN versus consulta geral;
- separação total das métricas de O.S.

### 9. Relatórios, impressão e dashboard
- Dashboard: apenas ano atual operacional.
- Arquivadas não devem contaminar métricas operacionais.
- Relatórios devem respeitar filtros.
- Impressão da O.S. deve usar folha própria A4, idealmente uma página.
- Verifique dados opcionais vazios e datas inválidas.

## Como entregar o relatório
Classifique cada achado como: CRÍTICO, ALTO, MÉDIO, BAIXO ou MELHORIA.

Para cada achado informe:
1. arquivo e trecho/função;
2. como reproduzir;
3. impacto;
4. correção recomendada;
5. se a correção pode quebrar alguma regra de negócio acima.

Depois faça uma lista separada de:
- bugs confirmados;
- riscos de segurança;
- botões/fluxos sem função;
- problemas de persistência;
- problemas de importação;
- problemas específicos do módulo Obras;
- problemas de logo/ícone e correções efetuadas;
- testes que não puderam ser executados no seu ambiente.

Não invente resultados de testes que você não executou. Não altere silenciosamente regras do sistema.