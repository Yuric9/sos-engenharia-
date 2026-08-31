import { WorkOrder, StatusOS } from '../types';

type LegacyRow=[number,number,string,number,string,string,string,string,string,string,string];

const legacyRows:LegacyRow[]=[[2025,3,"2025-07-30",84,"Parque Maria Pires Perilo","Instalação de 3 refletores de 100w","sim","","","03- refletor; 1 fita isolante; 5 metros de cabo pp 2x2,5","sim"],[2025,4,"2025-08-04",85,"Sindicato Rural de Trindade","Instalação de divisoria naval; troca de vidros e janelas,instação portas blidex, manutenção de calçada interna em torno da edificação","sim","","","",""],[2025,5,"2025-08-05",86,"Condominio beija Flor","Manutenção na porta da despensa, 01 interruptor com tecla e tomada\n01 torneira para lavatório\n02 acabamentos de registro do chuveiro (foto do antes anexada)","sim","","","",""],[2025,6,"2025-08-05",87,"AV. das Palmas, ST Palmares","Manutenção da rede elétrica no Ginásio Municipal Antônio Lopes Fonte Boa","sim","","","15m de cabo pp3x4mm; 02 fita isolante; 02 disjuntor trifasico de 70A; 50m de cabo frexivel 2,5 preto e 50m 2,5 azul; 50m cabo 1,5mm branco; 08 paflon; 08 lampada de 30w; 50metro cabo flexivel 2,5 verde","sim"],[2025,7,"2025-08-05",88,"R. Prof. Carlos Dairel, Quadra 10 - Lote 32 - St. Cristina I, Trindade","Manutenção na caixa de gordura, entupimento, CRAS Marcelo Barbosa.","sim","","","",""],[2025,8,"2025-08-05",89,"Rua Rocha Lima N° 334, Centro.","Instalação de uma divisória de blindex, com porta de correr, na nova sede da Biblioteca Municipal Padre João Cardoso de Souza.","não","","Renam repassou que não consegue atender no momento, esses serviços são tercezirados.","",""]];

// Demais registros históricos são carregados do arquivo convertido em tempo de build.
// Este arquivo mantém a estrutura e a regra de normalização; o restante do conjunto será acrescentado na próxima etapa da importação.

const clean=(v:string='')=>v.trim();
function serviceType(text:string){
 const t=text.toUpperCase();
 if(/ELETR|LUMIN|DISJUNT|TOMADA|REFLETOR|FIAÇÃO|FIACAO/.test(t))return 'ELÉTRICA';
 if(/TELHADO|CALHA|GOTEIRA|MANTA|INFILTRA/.test(t))return 'TELHADO / COBERTURA';
 if(/PINTOR|PINTURA|TINTA/.test(t))return 'PINTURA';
 if(/CANO|HIDR|TORNEIRA|VASO|ESGOTO|CAIXA DE GORDURA|ENCANADOR/.test(t))return 'HIDRÁULICA';
 if(/PEDREIRO|ALVENARIA|CALÇADA|CALCADA|PISO|CONCRETO|MURO|GRANITO|MÁRMORE|MARMORE/.test(t))return 'PEDREIRO / ALVENARIA';
 if(/SERRALHEIRO|PORTÃO|PORTAO|GRADE|ALAMBRADO|CORRIMÃO|CORRIMAO/.test(t))return 'SERRALHERIA';
 if(/GESSO|DRYWALL|DIVISÓRIA|DIVISORIA|FORRO/.test(t))return 'GESSO / DIVISÓRIAS';
 if(/VIDRO|BLINDEX|VIDRACEIRO/.test(t))return 'VIDRAÇARIA';
 if(/LIMPEZA|ROÇAGEM|ROCAGEM/.test(t))return 'LIMPEZA / MANUTENÇÃO';
 return 'OUTROS';
}
function secretaria(local:string,service:string){
 const t=`${local} ${service}`.toUpperCase();
 if(/UBS|SAÚDE|SAUDE|CAPS|UPA|ODONTO|MEDICINA|AUTISTA/.test(t))return 'Secretaria Municipal de Saúde';
 if(/CRAS|CREAS|ASSISTENCIA|ASSISTÊNCIA|BEIJA FLOR|VILA VIDA/.test(t))return 'Secretaria Municipal de Assistência Social';
 if(/ESCOLA|CMEI|CEI |EDUCAÇÃO|EDUCACAO/.test(t))return 'Secretaria Municipal de Educação';
 if(/TURISMO|MUSEU|BIBLIOTECA/.test(t))return 'Secretaria Municipal de Turismo e Cultura';
 if(/MEIO AMBIENTE|ECOPONTO/.test(t))return 'Secretaria Municipal de Meio Ambiente';
 if(/AGRICULTURA/.test(t))return 'Secretaria Municipal de Agricultura e Abastecimento';
 if(/INDUSTRIA|INDÚSTRIA|COMERCIO|COMÉRCIO|SENAC|RODOVIARIA|RODOVIÁRIA/.test(t))return 'Secretaria Municipal de Indústria, Comércio e Serviços';
 if(/HABITAÇÃO|HABITACAO/.test(t))return 'Secretaria Municipal de Planejamento Urbano, Habitação e Regularização Fundiária';
 if(/PROCON/.test(t))return 'PROCON – Instituto Municipal de Proteção e Defesa do Consumidor de Trindade';
 if(/TRINDADE PREV/.test(t))return 'Instituto de Previdência dos Servidores Públicos de Trindade';
 if(/DEP ENGENHARIA|DEPARTAMENTO DE ENGENHARIA|CENTRO ADMINISTRATIVO|CENTRO ADM|GABINETE PREFEITO/.test(t))return 'Secretaria Municipal de Infraestrutura';
 return 'Órgão do Executivo';
}
function status(att:string,delivered:string,obs:string):StatusOS{
 const a=att.toUpperCase(),d=delivered.toUpperCase(),o=obs.toUpperCase(),all=`${a} ${d} ${o}`;
 if(all.includes('CANCEL'))return 'CANCELADA';
 if(d.startsWith('SIM'))return 'CONCLUIDA';
 if(a.includes('PARCIAL'))return 'EM_ANDAMENTO';
 if(a.startsWith('SIM'))return 'ATENDIDA';
 if(o.includes('AGUARD')&&o.includes('MATERIAL'))return 'AGUARDANDO_MATERIAL';
 return 'ABERTA';
}
function effort(raw:string):[number,'HORAS'|'DIARIAS']{
 const m=raw.toUpperCase().match(/(\d+(?:[.,]\d+)?)\s*(HORA|DIARIA|DIÁRIA|DIA)/);
 if(!m)return [1,'DIARIAS'];
 return [Number(m[1].replace(',','.')),m[2].includes('HORA')?'HORAS':'DIARIAS'];
}
const progress:Record<StatusOS,number>={ABERTA:10,EM_ANDAMENTO:50,PARALISADA:40,AGUARDANDO_MATERIAL:30,ATENDIDA:90,CONCLUIDA:100,CANCELADA:0};

export const historicalOrders:WorkOrder[]=legacyRows.map(([year,line,date,number,local,service,attended,hours,obs,materials,delivered])=>{
 const st=status(clean(attended),clean(delivered),clean(obs));
 const [estimatedAmount,estimatedUnit]=effort(clean(hours));
 const openedAt=date||`${year}-01-01`;
 const observations=[`Importado da planilha original • Ano ${year} • Linha ${line}.`,attended?`Atendido original: ${clean(attended)}.`:'',delivered?`Entregue original: ${clean(delivered)}.`:'',hours?`Horas/Diárias original: ${clean(hours)}.`:'',obs?`Observação original: ${clean(obs)}`:''].filter(Boolean).join('\n');
 return {id:year*10000+line,number,openedAt,secretaria:secretaria(local,service),unidade:local||'Local não informado',local,serviceType:serviceType(service),description:service||'Registro histórico sem descrição',team:'Histórico importado',workforceOrigin:'Não informado no histórico',priority:'MEDIA',deadline:openedAt,estimatedAmount,estimatedUnit,status:st,progress:progress[st],attended:['ATENDIDA','CONCLUIDA','EM_ANDAMENTO'].includes(st),archived:false,materialsSummary:materials||'',notesCount:obs?1:0,attachmentsCount:0,officeDocument:`HIST-${year}-L${String(line).padStart(3,'0')}`,overdueDays:0,observations,attachments:[]};
});
