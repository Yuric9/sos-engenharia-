import { WorkOrder } from '../types';
import { historicalOrders } from './historicalOrders';

const KEY='sos-web-orders-v3-archive-2025';
const OLD_KEYS=['sos-web-orders-v2-history-import','sos-web-orders-v1'];
const ARCHIVE_2025_MIGRATION='sos-web-migration-archive-2025-v1';

function archive2025(orders:WorkOrder[]):WorkOrder[]{
  return orders.map(os=>os.openedAt?.startsWith('2025-')?{...os,archived:true}:os);
}

function markArchiveMigration(){
  try{localStorage.setItem(ARCHIVE_2025_MIGRATION,'1');}catch{}
}

function applyArchiveMigrationOnce(orders:WorkOrder[]):WorkOrder[]{
  try{
    if(localStorage.getItem(ARCHIVE_2025_MIGRATION)==='1')return orders;
    const migrated=archive2025(orders);
    localStorage.setItem(KEY,JSON.stringify(migrated));
    markArchiveMigration();
    return migrated;
  }catch{
    return orders;
  }
}

function mergeImported(previous:WorkOrder[]=[]):WorkOrder[]{
  const byId=new Map<number,WorkOrder>();
  historicalOrders.forEach(os=>byId.set(os.id,os));
  previous.forEach(os=>byId.set(os.id,os));
  return [...byId.values()].sort((a,b)=>{
    const date=(b.openedAt||'').localeCompare(a.openedAt||'');
    return date!==0?date:b.number-a.number;
  });
}

export function loadOrders():WorkOrder[]{
  try{
    const raw=localStorage.getItem(KEY);
    if(raw)return applyArchiveMigrationOnce(JSON.parse(raw));
    let previous:WorkOrder[]=[];
    for(const oldKey of OLD_KEYS){
      const old=localStorage.getItem(oldKey);
      if(old){previous=JSON.parse(old);break;}
    }
    const imported=archive2025(mergeImported(previous));
    localStorage.setItem(KEY,JSON.stringify(imported));
    markArchiveMigration();
    return imported;
  }catch{
    const imported=archive2025(historicalOrders);
    try{
      localStorage.setItem(KEY,JSON.stringify(imported));
      markArchiveMigration();
    }catch{}
    return imported;
  }
}

export function saveOrders(orders:WorkOrder[]):boolean{
  try{
    localStorage.setItem(KEY,JSON.stringify(orders));
    return true;
  }catch(error){
    console.error('Não foi possível salvar as Ordens de Serviço no armazenamento local.',error);
    return false;
  }
}

export function nextOrderNumber(orders:WorkOrder[]){return Math.max(0,...orders.map(o=>o.number))+1;}

export function recalcOverdue(os:WorkOrder):WorkOrder{
  if(['CONCLUIDA','CANCELADA'].includes(os.status)) return {...os,overdueDays:0};
  const end=new Date(os.deadline+'T23:59:59').getTime();
  const diff=Date.now()-end;
  return {...os,overdueDays:Number.isFinite(diff)&&diff>0?Math.ceil(diff/86400000):0};
}

export function normalizeOrders(orders:WorkOrder[]){return orders.map(recalcOverdue);}
