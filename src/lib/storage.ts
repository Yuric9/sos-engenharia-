import { workOrders as seed } from './mock';
import { WorkOrder } from '../types';
const KEY='sos-web-orders-v1';
export function loadOrders():WorkOrder[]{
  try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw);}catch{}
  localStorage.setItem(KEY,JSON.stringify(seed));return seed;
}
export function saveOrders(orders:WorkOrder[]){localStorage.setItem(KEY,JSON.stringify(orders));}
export function nextOrderNumber(orders:WorkOrder[]){return Math.max(0,...orders.map(o=>o.number))+1;}
export function recalcOverdue(os:WorkOrder):WorkOrder{
  if(['CONCLUIDA','CANCELADA'].includes(os.status)) return {...os,overdueDays:0};
  const end=new Date(os.deadline+'T23:59:59').getTime(); const diff=Date.now()-end;
  return {...os,overdueDays:diff>0?Math.ceil(diff/86400000):0};
}
export function normalizeOrders(orders:WorkOrder[]){return orders.map(recalcOverdue);}
