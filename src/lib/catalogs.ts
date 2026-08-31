export type CatalogKind='secretarias'|'unidades'|'equipes'|'tecnicos'|'materiais';
export interface CatalogItem{ id:number; name:string; active:boolean; parent?:string; detail?:string }
export interface Catalogs{ secretarias:CatalogItem[]; unidades:CatalogItem[]; equipes:CatalogItem[]; tecnicos:CatalogItem[]; materiais:CatalogItem[] }
const KEY='sos-web-catalogs-v1';
const seed:Catalogs={
 secretarias:[{id:1,name:'Educação',active:true},{id:2,name:'Saúde',active:true},{id:3,name:'Administrativo',active:true}],
 unidades:[{id:1,name:'CMEI Jardim das Flores',parent:'Educação',active:true},{id:2,name:'UBS Central',parent:'Saúde',active:true},{id:3,name:'Centro Administrativo',parent:'Administrativo',active:true}],
 equipes:[{id:1,name:'Equipe Própria',detail:'Mão de obra própria',active:true},{id:2,name:'Equipe Educação',detail:'Equipe da Secretaria',active:true},{id:3,name:'Equipe Saúde',detail:'Equipe da Secretaria',active:true},{id:4,name:'Equipe Administrativa',detail:'Equipe da Secretaria',active:true}],
 tecnicos:[{id:1,name:'Técnico Geral',detail:'Manutenção',active:true}],
 materiais:[{id:1,name:'Cimento',detail:'saco',active:true},{id:2,name:'Tinta',detail:'lata',active:true},{id:3,name:'Cabo elétrico',detail:'metro',active:true}]
};
export function loadCatalogs():Catalogs{try{const r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch{}localStorage.setItem(KEY,JSON.stringify(seed));return seed}
export function saveCatalogs(v:Catalogs){localStorage.setItem(KEY,JSON.stringify(v))}
