import {BarChart3,Building2,Printer} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {Page} from '../components/Page';
import {api} from '../lib/api';
import {subjectLabel,type Result} from '../lib/types';

type ViewMode='NETWORK'|'UNIT';
type SummaryRow={name:string;students:number;sheets:number;correct:number;total:number;percentage:number;average:number;highest:number;lowest:number};
const all='ALL';

function summarize(name:string,items:Result[]):SummaryRow{
 const scores=items.map(item=>Number(item.score)),correct=items.reduce((sum,item)=>sum+item.correct,0),total=items.reduce((sum,item)=>sum+item.total,0);
 return{name,students:new Set(items.map(item=>item.sheet.student?.id).filter(Boolean)).size,sheets:items.length,correct,total,percentage:total?correct/total*100:0,average:scores.length?scores.reduce((sum,value)=>sum+value,0)/scores.length:0,highest:scores.length?Math.max(...scores):0,lowest:scores.length?Math.min(...scores):0};
}

export function Reports(){
 const [items,setItems]=useState<Result[]>([]),[mode,setMode]=useState<ViewMode>('NETWORK'),[assessment,setAssessment]=useState(all),[grade,setGrade]=useState(all),[subject,setSubject]=useState(all),[message,setMessage]=useState('');
 useEffect(()=>{api<Result[]>('/api/results').then(setItems).catch(error=>setMessage(error.message))},[]);
 const assessmentOptions=useMemo(()=>[...new Set(items.map(item=>item.sheet.assessment.number))].sort(),[items]);
 const gradeOptions=useMemo(()=>[...new Set(items.map(item=>item.sheet.assessment.grade))].sort((a,b)=>a-b),[items]);
 const subjectOptions=useMemo(()=>[...new Set(items.map(item=>item.sheet.assessment.subject))].sort(),[items]);
 const filtered=useMemo(()=>items.filter(item=>(assessment===all||item.sheet.assessment.number===assessment)&&(grade===all||item.sheet.assessment.grade===Number(grade))&&(subject===all||item.sheet.assessment.subject===subject)),[items,assessment,grade,subject]);
 const rows=useMemo(()=>{
  if(mode==='NETWORK')return[summarize('Rede Municipal de Ensino',filtered)];
  const groups=new Map<string,Result[]>();
  for(const item of filtered){const name=item.sheet.student?.schoolClass?.unit?.name??item.sheet.assessment.unit.name;groups.set(name,[...(groups.get(name)??[]),item])}
  return[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'pt-BR')).map(([name,results])=>summarize(name,results));
 },[filtered,mode]);
 const totals=useMemo(()=>summarize('Total',filtered),[filtered]);
 const filterDescription=`Avaliação: ${assessment===all?'Todas':assessment} | Série: ${grade===all?'Todas':`${grade}º ano`} | Disciplina: ${subject===all?'Todas':subjectLabel(subject)}`;
 function printReport(){document.body.classList.add('report-printing');const cleanup=()=>document.body.classList.remove('report-printing');window.addEventListener('afterprint',cleanup,{once:true});window.print();setTimeout(cleanup,1500)}
 return <Page eyebrow="Análise" title="Relatórios" description="Selecione a visão e os filtros para consultar ou imprimir o desempenho.">
  <section className="report-controls card mb-5">
   <div className="grid gap-4 lg:grid-cols-2">
    <button className={`rounded-2xl border p-5 text-left transition ${mode==='NETWORK'?'border-forest bg-mint text-forest':'hover:border-forest/40'}`} onClick={()=>setMode('NETWORK')}><BarChart3 className="mb-3"/><strong className="block text-lg">Desempenho Geral da Rede</strong><span className="text-sm opacity-70">Consolida todas as unidades selecionadas.</span></button>
    <button className={`rounded-2xl border p-5 text-left transition ${mode==='UNIT'?'border-forest bg-mint text-forest':'hover:border-forest/40'}`} onClick={()=>setMode('UNIT')}><Building2 className="mb-3"/><strong className="block text-lg">Desempenho por Unidade</strong><span className="text-sm opacity-70">Compara cada unidade educacional.</span></button>
   </div>
   <div className="mt-5 grid gap-4 md:grid-cols-3">
    <label><span className="label">Avaliação</span><select className="field" value={assessment} onChange={event=>setAssessment(event.target.value)}><option value={all}>Todas</option>{assessmentOptions.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
    <label><span className="label">Série</span><select className="field" value={grade} onChange={event=>setGrade(event.target.value)}><option value={all}>Todas</option>{gradeOptions.map(value=><option value={value} key={value}>{value}º ano</option>)}</select></label>
    <label><span className="label">Disciplina</span><select className="field" value={subject} onChange={event=>setSubject(event.target.value)}><option value={all}>Todas</option>{subjectOptions.map(value=><option value={value} key={value}>{subjectLabel(value)}</option>)}</select></label>
   </div>
   <div className="mt-5 flex justify-end"><button className="btn inline-flex items-center gap-2" disabled={!filtered.length} onClick={printReport}><Printer size={18}/> Imprimir / Salvar PDF</button></div>
  </section>
  <section className="report-sheet card">
   <header className="report-title mb-5 border-b pb-4"><div className="text-xs font-bold uppercase tracking-widest text-forest">Secretaria Municipal de Educação de Uberaba</div><h2 className="mt-2 text-2xl font-bold">{mode==='NETWORK'?'Desempenho Geral da Rede':'Desempenho por Unidade'}</h2><p className="mt-1 text-sm">{filterDescription}</p><p className="mt-1 text-xs text-black/50">Emitido em {new Date().toLocaleString('pt-BR')}</p></header>
   <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Gabaritos lidos" value={totals.sheets}/><Metric label="Alunos avaliados" value={totals.students}/><Metric label="% de acertos" value={`${totals.percentage.toLocaleString('pt-BR',{maximumFractionDigits:2})}%`}/><Metric label="Nota média" value={totals.average.toLocaleString('pt-BR',{maximumFractionDigits:2})}/></div>
   <div className="overflow-x-auto"><table className="report-table w-full text-left"><thead><tr className="border-b-2 border-black"><th className="pb-2">{mode==='NETWORK'?'Abrangência':'Unidade'}</th><th>Alunos</th><th>Gabaritos</th><th>Acertos</th><th>Total de questões</th><th>% de acertos</th><th>Nota média</th><th>Maior nota</th><th>Menor nota</th></tr></thead><tbody>{rows.map(row=><tr className="border-b" key={row.name}><td className="py-3 font-semibold">{row.name}</td><td>{row.students}</td><td>{row.sheets}</td><td>{row.correct}</td><td>{row.total}</td><td>{row.percentage.toLocaleString('pt-BR',{maximumFractionDigits:2})}%</td><td>{row.average.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td><td>{row.highest.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td><td>{row.lowest.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td></tr>)}</tbody></table>{!filtered.length&&<p className="py-10 text-center text-black/45">{message||'Nenhum resultado encontrado para os filtros selecionados.'}</p>}</div>
   <footer className="report-footer mt-8 hidden border-t pt-3 text-center text-xs">Sistema Avalia - Relatório de desempenho escolar</footer>
  </section>
 </Page>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="rounded-xl bg-paper p-4"><strong className="text-2xl">{value}</strong><span className="block text-xs text-black/50">{label}</span></div>}
