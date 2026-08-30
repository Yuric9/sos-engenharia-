export type StatusOS='ABERTA'|'EM_ANDAMENTO'|'PARALISADA'|'AGUARDANDO_MATERIAL'|'ATENDIDA'|'CONCLUIDA'|'CANCELADA';
export type Priority='BAIXA'|'MEDIA'|'ALTA'|'URGENTE';
export interface WorkOrder {
 id:number; number:number; openedAt:string; secretaria:string; unidade:string; local?:string;
 serviceType:string; description:string; team:string; workforceOrigin:string; priority:Priority;
 deadline:string; estimatedAmount:number; estimatedUnit:'HORAS'|'DIARIAS'; status:StatusOS;
 progress:number; attended:boolean; archived:boolean; materialsSummary:string; notesCount:number; attachmentsCount:number;
 officeDocument?:string; overdueDays:number;
}
