export type StatusOS='ABERTA'|'EM_ANDAMENTO'|'PARALISADA'|'AGUARDANDO_MATERIAL'|'ATENDIDA'|'CONCLUIDA'|'CANCELADA';
export type Priority='BAIXA'|'MEDIA'|'ALTA'|'URGENTE';
export type AttachmentCategory='ANTES'|'DURANTE'|'FINAL'|'OFICIO'|'MATERIAL'|'OS_ORIGINAL'|'COMPROVANTE'|'PRINT'|'OUTRO';
export type AuditKind='CRIACAO'|'EDICAO'|'STATUS'|'ARQUIVO'|'ANEXO'|'MENSAGEM'|'IMPORTACAO'|'RESTAURACAO';
export interface Attachment { id:string; name:string; type:string; category:AttachmentCategory; dataUrl?:string; storedPath?:string; sizeBytes?:number; createdAt:string; }
export interface AuditEvent { id:string; at:string; kind:AuditKind; label:string; detail?:string; actor?:string; messageKind?:string; }
export interface WorkOrder {
 id:number; number:number; openedAt:string; secretaria:string; unidade:string; local?:string;
 serviceType:string; description:string; team:string; workforceOrigin:string; priority:Priority;
 deadline:string; estimatedAmount:number; estimatedUnit:'HORAS'|'DIARIAS'; status:StatusOS;
 progress:number; attended:boolean; archived:boolean; materialsSummary:string; notesCount:number; attachmentsCount:number;
 officeDocument?:string; overdueDays:number; observations?:string; attachments?:Attachment[];
 history?:AuditEvent[];
 importOrigin?:string; importBatch?:string; importedAt?:string;
}
