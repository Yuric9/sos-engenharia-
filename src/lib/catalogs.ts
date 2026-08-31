export type CatalogKind='secretarias'|'unidades'|'equipes'|'tecnicos'|'materiais';
export interface CatalogItem{ id:number; name:string; active:boolean; parent?:string; detail?:string; address?:string }
export interface Catalogs{ secretarias:CatalogItem[]; unidades:CatalogItem[]; equipes:CatalogItem[]; tecnicos:CatalogItem[]; materiais:CatalogItem[] }

const KEY='sos-web-catalogs-v4';
const OLD_KEYS=['sos-web-catalogs-v3','sos-web-catalogs-v2','sos-web-catalogs-v1'];

const orgNames=[
 'Gabinete do Prefeito','Gabinete do Vice-Prefeito','Procuradoria Geral do Município','Controladoria Geral do Município',
 'Secretaria Municipal de Gestão','Secretaria Municipal de Agricultura e Abastecimento','Secretaria Municipal de Assistência Social',
 'Secretaria Municipal de Ciência, Inovação e Tecnologia','Secretaria Municipal de Comunicação','Secretaria Municipal de Educação',
 'Secretaria Municipal de Esporte e Juventude','Secretaria Municipal da Fazenda','Secretaria Municipal de Governo',
 'Secretaria Municipal de Indústria, Comércio e Serviços','Secretaria Municipal de Infraestrutura','Secretaria Municipal de Meio Ambiente',
 'Secretaria Municipal de Planejamento Urbano, Habitação e Regularização Fundiária','Secretaria Municipal de Saúde',
 'Secretaria Municipal de Segurança Pública','Secretaria Municipal de Relações Institucionais','Secretaria Municipal de Trabalho e Geração de Emprego',
 'Secretaria Municipal de Turismo e Cultura','Secretaria Municipal da Casa Civil','Secretaria Municipal de Planejamento',
 'PROCON – Instituto Municipal de Proteção e Defesa do Consumidor de Trindade','Instituto de Previdência dos Servidores Públicos de Trindade'
];

const unitPairs:[string,string][]=[
 ['Secretaria Executiva do Patrimônio e Almoxarifado','Secretaria Municipal de Gestão'],['Departamento de Compras','Secretaria Municipal de Gestão'],['Secretaria Executiva de Gestão','Secretaria Municipal de Gestão'],['Secretaria Executiva de Licitações','Secretaria Municipal de Gestão'],
 ['CREAS','Secretaria Municipal de Assistência Social'],['CRAS Laguna','Secretaria Municipal de Assistência Social'],['CRAS Vila Pai Eterno','Secretaria Municipal de Assistência Social'],['CRAS Marcelo Barbosa','Secretaria Municipal de Assistência Social'],['Coordenadoria Executiva de Gestão Financeira e Orçamentária','Secretaria Municipal de Assistência Social'],['Coordenadoria Executiva de Proteção Social Básica','Secretaria Municipal de Assistência Social'],['Coordenadoria Executiva de Proteção Social Especial','Secretaria Municipal de Assistência Social'],['Vigilância Sócio Assistencial','Secretaria Municipal de Assistência Social'],['Centro de Convivência Vila Vida','Secretaria Municipal de Assistência Social'],['Abrigo e Condomínio Beija Flor','Secretaria Municipal de Assistência Social'],
 ['CEI Tia Euridice','Secretaria Municipal de Educação'],['CMEI Thaíse Santana Freire','Secretaria Municipal de Educação'],['CMEI Valéria Perillo (Palmares)','Secretaria Municipal de Educação'],['CMEI Daneille Gonçalves da Silva Borges','Secretaria Municipal de Educação'],['CMEI Wilma Soares de Paula (Maísa I)','Secretaria Municipal de Educação'],['CMEI Maria Pedro de Jesus','Secretaria Municipal de Educação'],['Escola Maria da Conceição Pereira','Secretaria Municipal de Educação'],['Escola Municipal Almiro Pereira da Silva','Secretaria Municipal de Educação'],['Escola Municipal Antônio Lopes Fonte Boa','Secretaria Municipal de Educação'],['CMEI Alcina Maria de Carvalho','Secretaria Municipal de Educação'],['CMEI Enzo Luiz Sales de Araújo – Jardim Scala','Secretaria Municipal de Educação'],['CMEI Divina Rodrigues Passos','Secretaria Municipal de Educação'],['CMEI Augusta Maria Soares','Secretaria Municipal de Educação'],['CMEI Dagmar Reis Barros','Secretaria Municipal de Educação'],['CMEI Adelice Ilário da Conceição','Secretaria Municipal de Educação'],['CMEI Abadia José','Secretaria Municipal de Educação'],['Escola Municipal João de Deus Guimarães','Secretaria Municipal de Educação'],['Escola Municipal Mª Aparecida G. Marques – Extensão','Secretaria Municipal de Educação'],['Escola Municipal Mª Aparecida Gonçalves Marques','Secretaria Municipal de Educação'],['Escola Municipal Dona Catu','Secretaria Municipal de Educação'],['Escola Municipal de 1º Grau Maria Dolores','Secretaria Municipal de Educação'],['Escola Municipal Cirandinha','Secretaria Municipal de Educação'],['Escola Municipal Rita Maria Pereira','Secretaria Municipal de Educação'],['Escola Municipal Tabelião Augusto Costa','Secretaria Municipal de Educação'],['Escola Municipal Selma Ferreira dos Santos','Secretaria Municipal de Educação'],['Escola Municipal Prof. Regina de F. Caldeira','Secretaria Municipal de Educação'],['Escola Municipal Juvenil Ricardo de Freitas','Secretaria Municipal de Educação'],['Escola Municipal Messias Bites Leão','Secretaria Municipal de Educação'],['Escola Municipal Profª Gleide Mendes de Lima','Secretaria Municipal de Educação'],['Escola Municipal Profª Elcia C. Domingues','Secretaria Municipal de Educação'],['Escola Municipal Padre Renato','Secretaria Municipal de Educação'],['Escola Municipal Padre José de Anchieta','Secretaria Municipal de Educação'],['Escola Municipal Padre Antão Jorge','Secretaria Municipal de Educação'],['Escola Municipal Dr. Alcides Albernaz de Oliveira','Secretaria Municipal de Educação'],['Escola Municipal José Felício Sobrinho','Secretaria Municipal de Educação'],['CMEI Enzo Luiz Sales de Araújo – Extensão','Secretaria Municipal de Educação'],['CMEI Wilma Soares de Paula','Secretaria Municipal de Educação'],['CMEI Joaquina Vicente Braz','Secretaria Municipal de Educação'],['CMEI Chrystianne Silveira Bueno','Secretaria Municipal de Educação'],['Coordenadoria Executiva de Ensino','Secretaria Municipal de Educação'],['Superintendência Executiva de Ensino e Gestão Pedagógica','Secretaria Municipal de Educação'],['Museu da Memória de Trindade','Secretaria Municipal de Educação'],
 ['Chefia da Unidade Centro','Secretaria Municipal da Fazenda'],['Superintendência da Receita Municipal','Secretaria Municipal da Fazenda'],['Superintendência de Captação de Recursos e Convênios','Secretaria Municipal da Fazenda'],['Coordenadoria Executiva de Fiscalização e Arrecadação','Secretaria Municipal da Fazenda'],['Departamento de ITU/IPTU','Secretaria Municipal da Fazenda'],['Coordenadoria Executiva do Tesouro Municipal','Secretaria Municipal da Fazenda'],
 ['Diretoria Municipal de Trânsito','Secretaria Municipal de Infraestrutura'],['Diretoria de Transportes','Secretaria Municipal de Infraestrutura'],['Coordenadoria Executiva de Pavimentação Asfáltica','Secretaria Municipal de Infraestrutura'],['Diretoria de Infraestrutura','Secretaria Municipal de Infraestrutura'],['Coordenadoria Executiva de Planejamento','Secretaria Municipal de Infraestrutura'],['Superintendência Municipal de Trânsito e Transporte (SMT)','Secretaria Municipal de Infraestrutura'],['Superintendência de Operações','Secretaria Municipal de Infraestrutura'],['Departamento de Arquitetura e Engenharia','Secretaria Municipal de Infraestrutura'],
 ['Diretoria de Defesa Civil','Secretaria Municipal de Meio Ambiente'],
 ['Diretoria de Planejamento Urbano','Secretaria Municipal de Planejamento Urbano, Habitação e Regularização Fundiária'],['Diretoria de Regularização Fundiária','Secretaria Municipal de Planejamento Urbano, Habitação e Regularização Fundiária'],['Secretaria Executiva de Políticas de Habitação','Secretaria Municipal de Planejamento Urbano, Habitação e Regularização Fundiária'],
 ['Programa Melhor em Casa – SAD Trindade','Secretaria Municipal de Saúde'],['UPA – Unidade de Pronto Atendimento de Trindade Dilson Alberto de Sousa','Secretaria Municipal de Saúde'],['Centro Municipal de Atendimento ao Autista','Secretaria Municipal de Saúde'],['Centro Medicina Avançada – Região Leste','Secretaria Municipal de Saúde'],['UBS Residencial Marise','Secretaria Municipal de Saúde'],['UBS Jardim Tamareiras','Secretaria Municipal de Saúde'],['UBS Jardim Floresta','Secretaria Municipal de Saúde'],['UBS Vila Pai Eterno II','Secretaria Municipal de Saúde'],['UBS Maysa II','Secretaria Municipal de Saúde'],['UBS Palmares I','Secretaria Municipal de Saúde'],['UBS Samarah','Secretaria Municipal de Saúde'],['UBS Guarujá Park','Secretaria Municipal de Saúde'],['UBS Bela Vista','Secretaria Municipal de Saúde'],['UBS Pontakayana II','Secretaria Municipal de Saúde'],['UBS Dona Iris II','Secretaria Municipal de Saúde'],['UBS Bandeirante','Secretaria Municipal de Saúde'],['UBS Palmares II','Secretaria Municipal de Saúde'],['UBS Santa Maria (Zona Rural)','Secretaria Municipal de Saúde'],['UBS Maysa I','Secretaria Municipal de Saúde'],['UBS Jardim das Oliveiras','Secretaria Municipal de Saúde'],['UBS Jardim Marista','Secretaria Municipal de Saúde'],['UBS Jardim Primavera','Secretaria Municipal de Saúde'],['UBS Vila Redenção','Secretaria Municipal de Saúde'],['UBS Walter Correa','Secretaria Municipal de Saúde'],['Coordenadoria Executiva da Vigilância em Saúde','Secretaria Municipal de Saúde'],['Coordenadoria Executiva de Atenção Básica','Secretaria Municipal de Saúde'],['Secretaria Executiva do Centro de Saúde Sizenando','Secretaria Municipal de Saúde'],['Centro Municipal de Medicina Avançada – Região Central','Secretaria Municipal de Saúde'],['CAPS AD Renascer','Secretaria Municipal de Saúde'],['CAPS Coração de Mãe','Secretaria Municipal de Saúde'],['UBS Residencial Garavelo','Secretaria Municipal de Saúde'],['UBS Jardim Scala','Secretaria Municipal de Saúde'],['UBS Jardim Califórnia','Secretaria Municipal de Saúde'],['UBS Vida Nova','Secretaria Municipal de Saúde'],['UBS Sol Dourado','Secretaria Municipal de Saúde'],['UBS Santuário Novo','Secretaria Municipal de Saúde'],['UBS Centro','Secretaria Municipal de Saúde'],['UBS Laguna Park','Secretaria Municipal de Saúde'],['Conselho Municipal de Saúde','Secretaria Municipal de Saúde'],['Diretoria de Assistência Farmacêutica','Secretaria Municipal de Saúde'],['Diretoria de Infraestrutura da Saúde','Secretaria Municipal de Saúde'],['Coordenadoria Executiva de Obras, Manutenção e Infraestrutura','Secretaria Municipal de Saúde'],['Diretoria de Desenvolvimento de Pessoas','Secretaria Municipal de Saúde'],['UBS Pontakayana I','Secretaria Municipal de Saúde'],['Superintendência Executiva de Administração','Secretaria Municipal de Saúde'],['UBS Ana Rosa','Secretaria Municipal de Saúde'],['UBS Vila João Braz','Secretaria Municipal de Saúde'],['Centro de Especialização Odontológica','Secretaria Municipal de Saúde'],['Secretaria Executiva do Centro de Especialidades Médicas','Secretaria Municipal de Saúde'],['Diretoria de Rede de Urgência','Secretaria Municipal de Saúde'],['Diretoria Geral da UPA','Secretaria Municipal de Saúde'],['Coordenadoria Executiva de Saúde Especializada','Secretaria Municipal de Saúde'],['Superintendência Técnica de Atenção à Saúde','Secretaria Municipal de Saúde'],
 ['Superintendência Central de Gestão de Recursos Humanos','Secretaria Municipal da Casa Civil']
];

const verifiedAddresses:Record<string,string>={
 'CRAS Laguna':'Rua 1014, Quadra 17, Área Pública, Laguna Park, Trindade-GO',
 'CRAS Vila Pai Eterno':'Avenida A, Quadra 01, Lote 23, Residencial Pai Eterno, Trindade-GO',
 'CRAS Marcelo Barbosa':'Rua Professor Carlos Dayrell, Quadra 10, Lote 32, Setor Cristina, Trindade-GO',
 'UBS Laguna Park':'Rua 1.007 com Rua Gardênia, Quadra L, Laguna Park, Trindade-GO',
 'UBS Centro':'Av. Manoel Monteiro, Quadra 03, Lote 07, Vila Pai Eterno, Trindade-GO',
 'UBS Santuário Novo':'Rua Padre João Cardoso, s/n, Cristina II, Trindade-GO',
 'UBS Sol Dourado':'Rua 225 esquina com Rua 200, s/n, Sol Dourado, Trindade-GO',
 'UBS Vida Nova':'Rua Murilo Tibery, Vida Nova, Trindade-GO',
 'UBS Jardim Califórnia':'Rua Bacuri, Parque Serra Branca, Trindade-GO',
 'UBS Jardim Scala':'Rua Elisa Bitencourt esquina com Rua ES 38, s/n, Jardim Scala, Trindade-GO',
 'UBS Residencial Garavelo':'Rua José de Alcantara Costa, Quadra 11, Lote 17, Residencial Garavelo, Trindade-GO',
 'Superintendência da Receita Municipal':'Av. Raimundo de Aquino, Nº 420, Vila João Braz, CEP 75388-412, Trindade-GO'
};

const seed:Catalogs={
 secretarias:orgNames.map((name,i)=>({id:1000+i,name,active:true,detail:name.startsWith('Secretaria')?'Secretaria Municipal':'Órgão Municipal'})),
 unidades:unitPairs.map(([name,parent],i)=>({id:2000+i,name,parent,active:true,address:verifiedAddresses[name]||''})),
 equipes:[{id:1,name:'Equipe Própria',detail:'Mão de obra própria',active:true},{id:2,name:'Equipe da Secretaria',detail:'Equipe da Secretaria',active:true},{id:3,name:'Empresa Terceirizada',detail:'Empresa terceirizada',active:true}],
 tecnicos:[{id:1,name:'Técnico Geral',detail:'Manutenção',active:true}],
 materiais:[{id:1,name:'Cimento',detail:'saco',active:true},{id:2,name:'Tinta',detail:'lata',active:true},{id:3,name:'Cabo elétrico',detail:'metro',active:true}]
};

function mergeByName(base:CatalogItem[],previous:CatalogItem[]=[]){
 const map=new Map<string,CatalogItem>();
 base.forEach(x=>map.set(`${x.name}|${x.parent||''}`,x));
 previous.forEach(x=>{const k=`${x.name}|${x.parent||''}`;const existing=map.get(k);map.set(k,existing?{...existing,...x,address:x.address||existing.address||''}:x)});
 return [...map.values()];
}

export function loadCatalogs():Catalogs{
 try{
   const current=localStorage.getItem(KEY); if(current)return JSON.parse(current);
   for(const oldKey of OLD_KEYS){
     const old=localStorage.getItem(oldKey);
     if(old){const prev:Catalogs=JSON.parse(old);const migrated:Catalogs={secretarias:mergeByName(seed.secretarias,prev.secretarias),unidades:mergeByName(seed.unidades,prev.unidades),equipes:mergeByName(seed.equipes,prev.equipes),tecnicos:mergeByName(seed.tecnicos,prev.tecnicos),materiais:mergeByName(seed.materiais,prev.materiais)};localStorage.setItem(KEY,JSON.stringify(migrated));return migrated}
   }
 }catch{}
 localStorage.setItem(KEY,JSON.stringify(seed));return seed;
}
export function saveCatalogs(v:Catalogs){localStorage.setItem(KEY,JSON.stringify(v))}
