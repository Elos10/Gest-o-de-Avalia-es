import {useEffect,useState} from 'react';
import {Edit3,Trash2,X} from 'lucide-react';
import {api} from '../lib/api';
import type {SchoolClass,Unit} from '../lib/types';
import {Page} from '../components/Page';

type Me={role:'ADMIN'|'MANAGER'|'TEACHER'|'OPERATOR'};

export function Classes(){
 const [items,setItems]=useState<SchoolClass[]>([]),[units,setUnits]=useState<Unit[]>([]),[role,setRole]=useState(''),[message,setMessage]=useState('');
 const [editingId,setEditingId]=useState<string>(),[unitId,setUnitId]=useState(''),[grade,setGrade]=useState(1),[name,setName]=useState(''),[schoolYear,setSchoolYear]=useState(new Date().getFullYear()),[timeMode,setTimeMode]=useState<'PARTIAL'|'FULL'>('PARTIAL');
 const load=()=>Promise.all([api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units'),api<Me>('/api/me')]).then(([a,b,me])=>{setItems(a);setUnits(b);setRole(me.role)}).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 function reset(){setEditingId(undefined);setUnitId('');setGrade(1);setName('');setSchoolYear(new Date().getFullYear());setTimeMode('PARTIAL')}
 function edit(item:SchoolClass){setEditingId(item.id);setUnitId(item.unitId);setGrade(item.grade);setName(item.name);setSchoolYear(item.schoolYear);setTimeMode(item.timeMode);setMessage('');scrollTo({top:0,behavior:'smooth'})}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const body={unitId,grade,name,schoolYear,timeMode};try{if(editingId){await api(`/api/classes/${editingId}`,{method:'PATCH',body:JSON.stringify(body)});reset();setMessage('Turma atualizada com sucesso.')}else{await api('/api/classes',{method:'POST',body:JSON.stringify(body)});reset();setMessage('Turma cadastrada com sucesso.')}await load()}catch(e){setMessage((e as Error).message)}}
 async function remove(item:SchoolClass){if(!confirm(`Deseja excluir a turma ${item.name}?`))return;try{await api(`/api/classes/${item.id}`,{method:'DELETE'});if(editingId===item.id)reset();setMessage('Turma excluída com sucesso.');await load()}catch(e){setMessage((e as Error).message)}}

 return <Page eyebrow="Cadastros" title={editingId?'Editar turma':'Turmas'} description="Organize unidade, série, turma, ano letivo e tempo.">
  <form className="card grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] xl:items-end" onSubmit={submit}>
   <label><span className="label">Unidade</span><select className="field" value={unitId} onChange={e=>setUnitId(e.target.value)} required><option value="">Selecione</option>{units.filter(x=>x.code!=='REDE').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   <label><span className="label">Série</span><select className="field" value={grade} onChange={e=>setGrade(Number(e.target.value))}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label>
   <label><span className="label">Turma</span><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="7º A" required/></label>
   <label><span className="label">Ano letivo</span><input className="field" type="number" value={schoolYear} onChange={e=>setSchoolYear(Number(e.target.value))} min="2020" max="2100" required/></label>
   <label><span className="label">Tempo</span><select className="field" value={timeMode} onChange={e=>setTimeMode(e.target.value as typeof timeMode)}><option value="PARTIAL">Parcial</option><option value="FULL">Integral</option></select></label>
   <div className="flex gap-2"><button className="btn whitespace-nowrap">{editingId?'Salvar alterações':'Cadastrar turma'}</button>{editingId&&<button type="button" title="Cancelar edição" className="rounded-xl border px-3" onClick={reset}><X size={18}/></button>}</div>
   {message&&<p className="text-sm text-red-700 md:col-span-2 xl:col-span-6">{message}</p>}
  </form>
  <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Unidade</th><th>Série</th><th>Turma</th><th>Ano letivo</th><th>Tempo</th><th className="text-right">Alunos</th>{role==='ADMIN'&&<th className="text-right">Ações</th>}</tr></thead><tbody>{items.map(x=><tr className="border-b last:border-0" key={x.id}><td className="py-4 font-semibold">{x.unit.name}</td><td>{x.grade}º ano</td><td><span className="rounded-lg bg-paper px-3 py-1 font-semibold">{x.name}</span></td><td>{x.schoolYear}</td><td>{x.timeMode==='FULL'?'Integral':'Parcial'}</td><td className="text-right font-bold">{x._count?.students??0}</td>{role==='ADMIN'&&<td><div className="flex justify-end gap-2"><button title="Editar turma" className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" onClick={()=>edit(x)}><Edit3 size={18}/></button><button title="Excluir turma" className="rounded-lg p-2 text-red-700 hover:bg-red-50" onClick={()=>void remove(x)}><Trash2 size={18}/></button></div></td>}</tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhuma turma cadastrada.</p>}</section>
 </Page>;
}
