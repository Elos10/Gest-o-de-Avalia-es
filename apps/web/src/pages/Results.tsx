import {ChevronDown,ChevronRight} from 'lucide-react';
import {Fragment,useEffect,useMemo,useState} from 'react';
import {Page} from '../components/Page';
import {api} from '../lib/api';
import {subjectLabel,type Result} from '../lib/types';

type ResultGroup={id:string;unit:string;subject:string;assessment:string;grade:number;className:string;items:Result[]};

export function Results(){
 const [items,setItems]=useState<Result[]>([]),[query,setQuery]=useState(''),[expanded,setExpanded]=useState<Set<string>>(new Set());
 useEffect(()=>{api<Result[]>('/api/results').then(setItems)},[]);
 const groups=useMemo(()=>{
  const grouped=new Map<string,ResultGroup>();
  for(const item of items){
   const assessment=item.sheet.assessment,studentClass=item.sheet.student?.schoolClass;
   const unit=studentClass?.unit?.name??assessment.unit.name;
   const className=studentClass?.name??assessment.schoolClass?.name??'Toda a rede';
   const id=[assessment.id,studentClass?.unitId??assessment.unit.id,studentClass?.id??assessment.schoolClass?.id??'rede'].join(':');
   const current=grouped.get(id);
   if(current)current.items.push(item);
   else grouped.set(id,{id,unit,subject:subjectLabel(assessment.subject),assessment:assessment.number,grade:assessment.grade,className,items:[item]});
  }
  const search=query.trim().toLocaleLowerCase('pt-BR');
  return [...grouped.values()].filter(group=>!search||[group.unit,group.subject,group.assessment,group.className,...group.items.map(item=>item.sheet.student?.name??'')].some(value=>value.toLocaleLowerCase('pt-BR').includes(search)));
 },[items,query]);
 function toggle(id:string){setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}
 return <Page eyebrow="Correção" title="Resultados" description="Resultados consolidados por unidade, avaliação e turma. Clique em uma linha para consultar os alunos.">
  <div className="card">
   <input className="field mb-5" placeholder="Buscar unidade, avaliação, turma ou aluno…" value={query} onChange={event=>setQuery(event.target.value)}/>
   <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
    <thead><tr className="border-b"><th className="w-9 pb-3"></th><th>Unidade</th><th>Disciplina</th><th>Avaliação</th><th>Série</th><th>Turma</th><th className="text-center">Quantidade de gabaritos lidos</th></tr></thead>
    <tbody>{groups.map(group=>{const open=expanded.has(group.id);return <Fragment key={group.id}>
     <tr className="cursor-pointer border-b hover:bg-mint/30" onClick={()=>toggle(group.id)}>
      <td className="py-4">{open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</td>
      <td className="font-semibold">{group.unit}</td><td>{group.subject}</td><td>{group.assessment}</td><td>{group.grade}º ano</td><td>{group.className}</td><td className="text-center text-lg font-bold text-forest">{group.items.length}</td>
     </tr>
     {open&&<tr className="border-b bg-paper/60"><td colSpan={7} className="p-4"><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[720px] text-left text-sm">
      <thead><tr className="border-b bg-mint/40"><th className="p-3">Aluno</th><th>Acertos</th><th>Brancos</th><th>Inválidas</th><th>Nota</th><th>% de Acertos</th></tr></thead>
      <tbody>{group.items.map(item=><tr className="border-b last:border-0" key={item.id}><td className="p-3 font-semibold">{item.sheet.student?.name??'—'}</td><td>{item.correct}</td><td>{item.blank}</td><td>{item.invalid}</td><td><strong className="text-lg text-forest">{Number(item.score).toLocaleString('pt-BR')}</strong></td><td>{Number(item.percentage).toLocaleString('pt-BR',{maximumFractionDigits:2})}%</td></tr>)}</tbody>
     </table></div></td></tr>}
    </Fragment>})}</tbody>
   </table>{!groups.length&&<p className="py-8 text-center text-black/45">Nenhum resultado encontrado.</p>}</div>
  </div>
 </Page>;
}
