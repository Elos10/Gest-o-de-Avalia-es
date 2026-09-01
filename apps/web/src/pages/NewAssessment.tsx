import {useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {allowedSubjects,questionCountFor,type Subject} from '@omr/core/rules';
import {api} from '../lib/api';
import type {Assessment,SchoolClass,Unit} from '../lib/types';
import {Page} from '../components/Page';

const NETWORK='NETWORK';

export function NewAssessment(){
 const nav=useNavigate();
 const [classes,setClasses]=useState<SchoolClass[]>([]);
 const [units,setUnits]=useState<Unit[]>([]);
 const [unitId,setUnitId]=useState(NETWORK);
 const [grade,setGrade]=useState(7);
 const [subject,setSubject]=useState<Subject>('MATHEMATICS');
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const networkWide=unitId===NETWORK;

 useEffect(()=>{Promise.all([api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units')]).then(([c,u])=>{setClasses(c);setUnits(u)}).catch(e=>setMessage(e.message))},[]);
 const availableClasses=networkWide?[]:classes.filter(x=>x.unitId===unitId&&x.grade===grade);
 const subjects=allowedSubjects(grade);
 const safeSubject=subjects.includes(subject)?subject:subjects[0];
 const count=useMemo(()=>questionCountFor(grade,safeSubject),[grade,safeSubject]);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const raw=Object.fromEntries(new FormData(e.currentTarget));
  try{
   setSaving(true);
   setMessage('');
   const created=await api<Assessment>('/api/assessments',{method:'POST',body:JSON.stringify({...raw,scope:networkWide?'NETWORK':'CLASS',unitId:networkWide?undefined:unitId,classId:networkWide?null:raw.classId,grade,year:Number(raw.year),subject:safeSubject})});
   nav(`/avaliacoes/${created.id}`,{replace:true,state:{created:true}});
  }catch(error){setMessage((error as Error).message);setSaving(false)}
 }

 return <Page eyebrow="Avaliações" title="Nova avaliação" description="Crie uma avaliação para uma turma específica ou para toda a rede municipal.">
  <form className="card grid max-w-4xl gap-5 md:grid-cols-2" onSubmit={submit}>
   <label><span className="label">Unidade</span><select className="field" value={unitId} onChange={e=>setUnitId(e.target.value)} required><option value={NETWORK}>Secretaria Municipal de Educação — toda a rede</option>{units.filter(x=>x.code!=='REDE').map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
   <label><span className="label">Série</span><select className="field" value={grade} onChange={e=>{const g=Number(e.target.value);setGrade(g);setSubject(g===1?'SINGLE':'MATHEMATICS')}}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label>
   <label><span className="label">Turma</span><select className="field disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-black/40" name="classId" required={!networkWide} disabled={networkWide}><option value="">{networkWide?'Todas as turmas da série':'Selecione'}</option>{availableClasses.map(x=><option value={x.id} key={x.id}>{x.name} — {x.schoolYear}</option>)}</select>{networkWide&&<small className="mt-1 block text-black/45">A avaliação será aplicada a todas as turmas compatíveis da rede.</small>}</label>
   <label><span className="label">Disciplina</span><select className="field" value={safeSubject} onChange={e=>setSubject(e.target.value as Subject)}>{subjects.map(x=><option value={x} key={x}>{x==='SINGLE'?'Prova Única':x==='PORTUGUESE'?'Língua Portuguesa':'Matemática'}</option>)}</select></label>
   <label><span className="label">Número da avaliação</span><input className="field" name="number" defaultValue="001" required/></label>
   <label><span className="label">Ano da avaliação</span><input className="field" type="number" name="year" defaultValue={new Date().getFullYear()} required/></label>
   <label><span className="label">Data</span><input className="field" type="date" name="assessmentDate" required/></label>
   <label><span className="label">Tempo</span><select className="field" name="timeMode"><option value="ALL">Todos — parcial e integral</option><option value="PARTIAL">Parcial</option><option value="FULL">Integral</option></select></label>
   <div className="rounded-xl bg-mint p-4 md:col-span-2"><div className="text-sm text-forest">Quantidade definida pela regra central</div><div className="text-3xl font-bold">{count} questões</div><div className="mt-1 text-sm text-black/50">Abrangência: {networkWide?'toda a rede municipal':'turma selecionada'}</div></div>
   <button className="btn md:col-span-2 disabled:cursor-wait disabled:opacity-60" disabled={saving}>{saving?'Salvando avaliação…':'Salvar e configurar gabarito'}</button>
   {message&&<p className="md:col-span-2 text-sm text-red-700">{message}</p>}
  </form>
 </Page>;
}
