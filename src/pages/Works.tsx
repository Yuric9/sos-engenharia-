import { Building2, CircleDollarSign, CirclePause, Clock3, HardHat, Plus, Ruler, WalletCards } from 'lucide-react';

export default function Works({isAdmin}:{isAdmin:boolean}){
  const metrics=[
    ['Obras cadastradas',0,Building2],
    ['Em andamento',0,HardHat],
    ['Paralisadas',0,CirclePause],
    ['Atrasadas',0,Clock3],
    ['Concluídas',0,Ruler],
    ['Medições realizadas',0,WalletCards],
  ] as const;

  return <>
    <header className="topbar">
      <div>
        <h1>Obras</h1>
        <p>Acompanhamento de obras de engenharia, contratos, projetos, medições e execução.</p>
      </div>
      {isAdmin&&<button className="primary" type="button" onClick={()=>alert('O cadastro completo de obras será habilitado na próxima etapa do módulo.')}><Plus size={18}/>Nova obra</button>}
    </header>

    <section className="cards">
      {metrics.map(([label,value,Icon])=><article className="metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon size={22}/></article>)}
    </section>

    <section className="chart-card">
      <div>
        <h2>Resumo financeiro das obras</h2>
        <p>Os valores das obras ficarão separados das O.S. de manutenção.</p>
      </div>
      <div className="cards" style={{marginTop:16}}>
        <article className="metric"><div><span>Valor contratado</span><strong>R$ 0,00</strong></div><CircleDollarSign size={22}/></article>
        <article className="metric"><div><span>Total pago</span><strong>R$ 0,00</strong></div><WalletCards size={22}/></article>
        <article className="metric"><div><span>Percentual pago</span><strong>0%</strong></div><CircleDollarSign size={22}/></article>
        <article className="metric"><div><span>Avanço físico médio</span><strong>0%</strong></div><Ruler size={22}/></article>
      </div>
    </section>

    <section className="table-card">
      <div className="table-toolbar">
        <div><h2>Obras cadastradas</h2><p>Todos os usuários podem consultar as obras. Somente ADMIN pode cadastrar ou alterar dados.</p></div>
      </div>
      <div style={{padding:32,textAlign:'center'}}>
        <HardHat size={34} style={{marginBottom:10,opacity:.55}}/>
        <h3 style={{margin:'0 0 6px'}}>Nenhuma obra cadastrada</h3>
        <p style={{margin:0}}>O módulo está separado das Ordens de Serviço e terá sua própria base de dados, documentos, medições e indicadores.</p>
      </div>
    </section>
  </>;
}
