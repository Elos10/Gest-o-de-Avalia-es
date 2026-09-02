import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import type {SchoolClass,Unit} from '../lib/types';
import {Page} from '../components/Page';

export function Classes(){
 const [items,setItems]=useState<SchoolClass[]>([]),[units,setUnits]=useState<Unit[]>([]),[message,setMessage]=useState('');
 const load=()=>Promise.all([api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units')]).then(([a,b])=>{setItems(a);setUnits(b)}).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,raw=Object.fromEntries(new FormData(form));try{await api('/api/classes',{method:'POST',body:JSON.stringify({...raw,grade:Number(raw.grade),schoolYear:Number(raw.schoolYear)})});form.reset();setMessage('Turma cadastrada com sucesso.');await load()}catch(e){setMessage((e as Error).message)}}
 return <Page eyebrow="Cadastros" title="Turmas" description="Organize unidade, série, turma, ano letivo e tempo.">
  <form className="card grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] xl:items-end" onSubmit={submit}>
   <label><span className="label">Unidade</span><select className="field" name="unitId" required><option value="">Selecione</option>{units.filter(x=>x.code!=='REDE').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   <label><span className="label">Série</span><select className="field" name="grade">{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label>
   <label><span className="label">Turma</span><input className="field" name="name" placeholder="7º A" required/></label>
   <label><span className="label">Ano letivo</span><input className="field" type="number" name="schoolYear" defaultValue={new Date().getFullYear()} min="2020" max="2100" required/></label>
   <label><span className="label">Tempo</span><select className="field" name="timeMode"><option value="PARTIAL">Parcial</option><option value="FULL">Integral</option></select></label>
   <button className="btn whitespace-nowrap">Cadastrar turma</button>
   {message&&<p className="text-sm text-red-700 md:col-span-2 xl:col-span-6">{message}</p>}
  </form>
  <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Unidade</th><th>Série</th><th>Turma</th><th>Ano letivo</th><th>Tempo</th><th className="text-right">Alunos</th></tr></thead><tbody>{items.map(x=><tr className="border-b last:border-0" key={x.id}><td className="py-4 font-semibold">{x.unit.name}</td><td>{x.grade}º ano</td><td><span className="rounded-lg bg-paper px-3 py-1 font-semibold">{x.name}</span></td><td>{x.schoolYear}</td><td>{x.timeMode==='FULL'?'Integral':'Parcial'}</td><td className="text-right font-bold">{x._count?.students??0}</td></tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhuma turma cadastrada.</p>}</section>
 </Page>;
}
