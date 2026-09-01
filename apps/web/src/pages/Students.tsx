import {useEffect,useMemo,useState} from 'react';
import {Download,Upload,Users as UsersIcon} from 'lucide-react';
import {api} from '../lib/api';
import type {SchoolClass,Student,Unit} from '../lib/types';
import {downloadStudentTemplate,parseStudentCsv,type StudentImportRow} from '../lib/studentImport';
import {Page} from '../components/Page';

const timeLabel=(value:'PARTIAL'|'FULL')=>value==='FULL'?'Integral':'Parcial';

export function Students(){
 const [items,setItems]=useState<Student[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]),[units,setUnits]=useState<Unit[]>([]);
 const [unitId,setUnitId]=useState(''),[grade,setGrade]=useState(1),[classId,setClassId]=useState('');
 const [query,setQuery]=useState(''),[message,setMessage]=useState(''),[importRows,setImportRows]=useState<StudentImportRow[]>([]),[importing,setImporting]=useState(false);
 const load=()=>Promise.all([api<Student[]>('/api/students'),api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units')]).then(([a,b,c])=>{setItems(a);setClasses(b);setUnits(c)}).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 const availableClasses=useMemo(()=>classes.filter(x=>x.unitId===unitId&&x.grade===grade),[classes,unitId,grade]);
 const selectedClass=classes.find(x=>x.id===classId);

 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();try{await api('/api/students',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});e.currentTarget.reset();setClassId('');setMessage('Aluno cadastrado com sucesso.');await load()}catch(e){setMessage((e as Error).message)}}
 async function chooseFile(file?:File){if(!file)return;try{const rows=parseStudentCsv(await file.text());setImportRows(rows);setMessage(`${rows.length} aluno(s) pronto(s) para importação.`)}catch(e){setImportRows([]);setMessage((e as Error).message)}}
 async function importFile(){if(!importRows.length)return;try{setImporting(true);const result=await api<{imported:number}>('/api/students/import',{method:'POST',body:JSON.stringify({rows:importRows})});setImportRows([]);setMessage(`${result.imported} aluno(s) importado(s) com sucesso.`);await load()}catch(e){setMessage((e as Error).message)}finally{setImporting(false)}}
 const filtered=items.filter(x=>`${x.name} ${x.registration??''} ${x.schoolClass.unit.name} ${x.schoolClass.name}`.toLowerCase().includes(query.toLowerCase()));

 return <Page eyebrow="Cadastros" title="Alunos" description="Cadastre estudantes com unidade, série, turma e tempo ou importe uma lista padronizada.">
  <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
   <div className="space-y-5">
    <form className="card grid gap-4" onSubmit={submit}><h2 className="text-lg font-bold">Novo aluno</h2>
     <label><span className="label">Nome completo</span><input className="field" name="name" required/></label>
     <label><span className="label">Matrícula</span><input className="field" name="registration"/></label>
     <label><span className="label">Unidade</span><select className="field" value={unitId} onChange={e=>{setUnitId(e.target.value);setClassId('')}} required><option value="">Selecione</option>{units.filter(x=>x.code!=='REDE').map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <div className="grid grid-cols-2 gap-3"><label><span className="label">Série</span><select className="field" value={grade} onChange={e=>{setGrade(Number(e.target.value));setClassId('')}}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label><label><span className="label">Tempo</span><input className="field bg-black/5" value={selectedClass?timeLabel(selectedClass.timeMode):'Selecione a turma'} readOnly/></label></div>
     <label><span className="label">Turma</span><select className="field" name="classId" value={classId} onChange={e=>setClassId(e.target.value)} required disabled={!unitId}><option value="">Selecione</option>{availableClasses.map(x=><option value={x.id} key={x.id}>{x.name} — {timeLabel(x.timeMode)}</option>)}</select></label>
     <button className="btn">Cadastrar aluno</button>
    </form>
    <section className="card"><div className="flex items-center gap-2"><Upload className="text-forest"/><h2 className="text-lg font-bold">Importar alunos</h2></div><p className="mt-2 text-sm text-black/50">Arquivo CSV com nome, matrícula, unidade, série, turma e tempo. Limite de 2.000 alunos por arquivo.</p>
     <button type="button" className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest" onClick={downloadStudentTemplate}><Download size={17}/> Baixar modelo de exemplo</button>
     <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-black/20 p-4 text-center"><input className="hidden" type="file" accept=".csv,text/csv" onChange={e=>void chooseFile(e.target.files?.[0])}/><Upload className="mx-auto text-black/40"/><strong className="mt-2 block">Selecionar arquivo CSV</strong>{importRows.length>0&&<span className="text-sm text-forest">{importRows.length} linha(s) validada(s)</span>}</label>
     <button className="btn mt-3 w-full disabled:opacity-50" disabled={!importRows.length||importing} onClick={importFile}>{importing?'Importando…':'Importar alunos'}</button>
    </section>
    {message&&<div className="card text-sm">{message}</div>}
   </div>
   <div className="card"><div className="mb-4 flex items-center gap-3"><UsersIcon className="text-forest"/><div className="flex-1"><input className="field" placeholder="Buscar por aluno, matrícula, unidade ou turma…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Aluno</th><th>Unidade</th><th>Série</th><th>Turma</th><th>Tempo</th></tr></thead><tbody>{filtered.map(x=><tr className="border-b last:border-0" key={x.id}><td className="py-4"><strong>{x.name}</strong><small className="block text-black/45">{x.registration||'Sem matrícula'}</small></td><td>{x.schoolClass.unit.name}</td><td>{x.schoolClass.grade}º ano</td><td><span className="rounded-lg bg-paper px-3 py-1 font-semibold">{x.schoolClass.name}</span></td><td>{timeLabel(x.schoolClass.timeMode)}</td></tr>)}</tbody></table>{!filtered.length&&<p className="py-8 text-center text-black/45">Nenhum aluno encontrado.</p>}</div>
   </div>
  </div>
 </Page>;
}
