import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

export type StatusTone='danger'|'warning'|'success'|'info'|'neutral';

export function Button({variant='secondary',className='',children,...props}:{variant?:'primary'|'secondary'|'danger'|'ghost';className?:string;children:ReactNode}&ButtonHTMLAttributes<HTMLButtonElement>){
  return <button className={`ui-btn ui-btn--${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function SegmentedTabs<T extends string>({value,options,onChange,labels}:{value:T;options:readonly T[];onChange:(value:T)=>void;labels:Record<T,string>}){
  return <div className="ui-tabs" role="tablist" aria-label="Contexto">
    {options.map(option=><button key={option} type="button" role="tab" aria-selected={value===option} className={`ui-tab ${value===option?'is-active':''}`} onClick={()=>onChange(option)}>{labels[option]}</button>)}
  </div>;
}

export function FilterPill({active=false,children,...props}:{active?:boolean;children:ReactNode}&ButtonHTMLAttributes<HTMLButtonElement>){
  return <button type="button" className={`ui-filter-pill ${active?'is-active':''}`} {...props}>{children}</button>;
}

export function StatusBadge({tone='neutral',children}:{tone?:StatusTone;children:ReactNode}){
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function SearchInput({className='',...props}:InputHTMLAttributes<HTMLInputElement>){
  return <label className={`ui-search ${className}`.trim()}><Search size={17} aria-hidden="true"/><input {...props}/></label>;
}
