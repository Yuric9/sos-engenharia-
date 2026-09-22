import { WorkOrder } from '../types';
import { UserScope } from './auth';

export function compactScopeValue(value?: string){
  return (value || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

export function plainScopeValue(value?: string){
  return compactScopeValue(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function orderScope(order: WorkOrder): UserScope{
  const source = plainScopeValue(order.importOrigin || order.secretaria);
  if(source.includes('saude')) return 'SAUDE';
  if(source.includes('educa')) return 'EDUCACAO';
  if(source.includes('gabinete')) return 'GABINETE';
  return 'EXECUTIVO';
}
