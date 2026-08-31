import { WorkOrder } from '../types';
import { historicalOrders } from './historicalOrders';

const KEY='sos-web-orders-v3-archive-2025';
const OLD_KEYS=['sos-web-orders-v2-history-import','sos-web-orders-v1'];

function archive2025(orders:WorkOrder[]):WorkOrder[]{
  return orders.map(os=>os.openedAt?.startsWith('2025-')?{...os,archived:true}:os);
}

function mergeImported(previous:WorkOrder[]=[]):WorkOrder[]{
  const byId=new Map<number,WorkOrder>();
  historicalOrders.forEach(os=>byId.set(os.id,os));
  previous.forEach(os=>byId.set(os.id,os));
  return archive2025([...byId.values()]).sort((a,b)=>{
    const date=(b.openedAt||'').localeCompare(a.openedAt||'');
    return date!==0?date:b.number-a.number;
  });
}

export function loadOrders():WorkOrder[]{
  try{
    const raw=localStorage.getItem(KEY);
    if(raw)return archive2025(JSON.parse(raw));
    let previous:WorkOrder[]=[];
    for(const oldKey of OLD_KEYS){
      const old=localStorage.getItem(oldKey);
      if(old){previous=JSON.parse(old);break;}
    }
    const imported=mergeImported(previous);
    localStorage.setItem(KEY,JSON.stringify(imported));
    return imported;
  }catch{
    const imported=archive2025(historicalOrders);
    localStorage.setItem(KEY,JSON.stringify(imported));
    return imported;
  }
}

export function saveOrders(orders:WorkOrder[]){localStorage.setItem(KEY,JSON.stringify(orders));}
export function nextOrderNumber(orders:WorkOrder[]){return Math.max(0,...orders.map(o=>o.number))+1;}
export function recalcOverdue(os:WorkOrder):WorkOrder{
  if(['CONCLUIDA','CANCELADA'].includes(os.status)) return {...os,overdueDays:0};
  const end=new Date(os.deadline+'T23:59:59').getTime(); const diff=Date.now()-end;
  return {...os,overdueDays:Number.isFinite(diff)&&diff>0?Math.ceil(diff/86400000):0};
}
export function normalizeOrders(orders:WorkOrder[]){return orders.map(recalcOverdue);}
