import { Catalogs, CatalogItem } from './catalogs';

export const OWN_WORKFORCE='Mão de obra própria — Departamento de Engenharia';
export const RP_WORKFORCE='RP CONSTRUÇÕES LOCAÇÕES E CONSULTORIA EIRELI';
export const HEALTH_WORKFORCE='INOVART COMÉRCIO DE EQUIPAMENTOS EIRELI EPP';

export const workforceTeams:CatalogItem[]=[
  {id:9101,name:OWN_WORKFORCE,detail:'Mão de obra própria do Departamento de Engenharia',active:true},
  {id:9102,name:RP_WORKFORCE,detail:'Empresa terceirizada — manutenções dos órgãos do Executivo',active:true},
  {id:9103,name:HEALTH_WORKFORCE,detail:'Empresa terceirizada — manutenções da Saúde',active:true}
];

export function normalizeWorkforceCatalogs(catalogs:Catalogs):Catalogs{
  return {...catalogs,equipes:workforceTeams};
}

export function suggestedWorkforce(secretaria:string){
  return secretaria==='Secretaria Municipal de Saúde'?HEALTH_WORKFORCE:RP_WORKFORCE;
}
