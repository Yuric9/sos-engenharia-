import { WorkOrder } from '../types';
import { historicalOrders } from './historicalOrders';

const KEY='sos-web-orders-v2-history-import';
const OLD_KEY='sos-web-orders-v1';

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
    if(raw)return JSON.parse(raw);
    const old=localStorage.getItem(OLD_KEY);
    const previous:WorkOrder[]=old?JSON.parse(old):[];
    const imported=mergeImported(previous);
    localStorage.setItem(KEY,JSON.stringify(imported));
    return imported;
  }catch{
    localStorage.setItem(KEY,JSON.stringify(historicalOrders));
    return historicalOrders;
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
