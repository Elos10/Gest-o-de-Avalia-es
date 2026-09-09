import {Fragment,useEffect,useMemo,useState} from 'react';
import {ChevronDown,Download,Upload,Users as UsersIcon} from 'lucide-react';
import {api} from '../lib/api';
import type {SchoolClass,Student,Unit} from '../lib/types';
import {downloadStudentTemplate,parseStudentCsv,type StudentImportRow} from '../lib/studentImport';
import {Page} from '../components/Page';
import {MAX_STUDENT_IMPORT_ROWS,STUDENT_IMPORT_BATCH_SIZE} from '@omr/core/imports';

const timeLabel=(value:'PARTIAL'|'FULL')=>value==='FULL'?'Integral':'Parcial';

export function Students(){
 const [items,setItems]=useState<Student[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]),[units,setUnits]=useState<Unit[]>([]);
 const [unitId,setUnitId]=useState(''),[grade,setGrade]=useState(1),[classId,setClassId]=useState('');
 const [query,setQuery]=useState(''),[message,setMessage]=useState(''),[importRows,setImportRows]=useState<StudentImportRow[]>([]),[importing,setImporting]=useState(false);
 const [expandedClasses,setExpandedClasses]=useState<Set<string>>(new Set());
 const load=()=>Promise.all([api<Student[]>('/api/students'),api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units')]).then(([a,b,c])=>{setItems(a);setClasses(b);setUnits(c)}).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 const availableClasses=useMemo(()=>classes.filter(x=>x.unitId===unitId&&x.grade===grade).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true})||timeLabel(a.timeMode).localeCompare(timeLabel(b.timeMode),'pt-BR')),[classes,unitId,grade]);

 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;try{await api('/api/students',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});form.reset();setClassId('');setMessage('Aluno cadastrado com sucesso.');await load()}catch(e){setMessage((e as Error).message)}}
 async function chooseFile(file?:File){if(!file)return;try{const rows=parseStudentCsv(await file.text());setImportRows(rows);setMessage(`${rows.length} aluno(s) pronto(s) para importação.`)}catch(e){setImportRows([]);setMessage((e as Error).message)}}
 async function importFile(){if(!importRows.length)return;try{setImporting(true);let imported=0;for(let offset=0;offset<importRows.length;offset+=STUDENT_IMPORT_BATCH_SIZE){const batch=importRows.slice(offset,offset+STUDENT_IMPORT_BATCH_SIZE);setMessage(`Importando ${Math.min(offset+batch.length,importRows.length).toLocaleString('pt-BR')} de ${importRows.length.toLocaleString('pt-BR')} alunos…`);const result=await api<{imported:number}>('/api/students/import',{method:'POST',body:JSON.stringify({rows:batch})});imported+=result.imported}setImportRows([]);setMessage(`${imported.toLocaleString('pt-BR')} aluno(s) importado(s) com sucesso.`);await load()}catch(e){setMessage((e as Error).message)}finally{setImporting(false)}}
 const grouped=useMemo(()=>{
  const term=query.trim().toLocaleLowerCase('pt-BR'),groups=new Map<string,{schoolClass:SchoolClass;students:Student[];visibleStudents:Student[]}>();
  for(const student of items){const current=groups.get(student.classId)??{schoolClass:student.schoolClass,students:[],visibleStudents:[]};current.students.push(student);groups.set(student.classId,current)}
  return [...groups.values()].map(group=>{const classText=`${group.schoolClass.unit.name} ${group.schoolClass.grade} ${group.schoolClass.name} ${timeLabel(group.schoolClass.timeMode)}`.toLocaleLowerCase('pt-BR');group.visibleStudents=!term||classText.includes(term)?group.students:group.students.filter(student=>`${student.name} ${student.registration??''}`.toLocaleLowerCase('pt-BR').includes(term));return group}).filter(group=>group.visibleStudents.length).sort((a,b)=>a.schoolClass.unit.name.localeCompare(b.schoolClass.unit.name,'pt-BR')||a.schoolClass.grade-b.schoolClass.grade||a.schoolClass.name.localeCompare(b.schoolClass.name,'pt-BR',{numeric:true})||timeLabel(a.schoolClass.timeMode).localeCompare(timeLabel(b.schoolClass.timeMode),'pt-BR'));
 },[items,query]);
 const toggleClass=(id:string)=>setExpandedClasses(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next});

 return <Page eyebrow="Cadastros" title="Alunos" description="Cadastre estudantes com unidade, série, turma e tempo ou importe uma lista padronizada.">
  <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
   <div className="space-y-5">
    <form className="card grid gap-4" onSubmit={submit}><h2 className="text-lg font-bold">Novo aluno</h2>
     <label><span className="label">Nome completo</span><input className="field" name="name" required/></label>
     <label><span className="label">Matrícula</span><input className="field" name="registration"/></label>
     <label><span className="label">Unidade</span><select className="field" value={unitId} onChange={e=>{setUnitId(e.target.value);setClassId('')}} required><option value="">Selecione</option>{units.filter(x=>x.code!=='REDE').map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label><span className="label">Série</span><select className="field" value={grade} onChange={e=>{setGrade(Number(e.target.value));setClassId('')}}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label>
     <label><span className="label">Turma/Tempo</span><select className="field" name="classId" value={classId} onChange={e=>setClassId(e.target.value)} required disabled={!unitId}><option value="">{unitId?'Selecione':'Selecione a unidade'}</option>{availableClasses.map(x=><option value={x.id} key={x.id}>{x.name} - {timeLabel(x.timeMode)}</option>)}</select></label>
     <button className="btn" disabled={!classId}>Cadastrar aluno</button>
    </form>
    <section className="card"><div className="flex items-center gap-2"><Upload className="text-forest"/><h2 className="text-lg font-bold">Importar alunos</h2></div><p className="mt-2 text-sm text-black/50">Arquivo CSV com nome, matrícula, unidade, série, turma e tempo. Limite de {MAX_STUDENT_IMPORT_ROWS.toLocaleString('pt-BR')} alunos por arquivo.</p>
     <button type="button" className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest" onClick={downloadStudentTemplate}><Download size={17}/> Baixar modelo de exemplo</button>
     <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-black/20 p-4 text-center"><input className="hidden" type="file" accept=".csv,text/csv" onChange={e=>void chooseFile(e.target.files?.[0])}/><Upload className="mx-auto text-black/40"/><strong className="mt-2 block">Selecionar arquivo CSV</strong>{importRows.length>0&&<span className="text-sm text-forest">{importRows.length} linha(s) validada(s)</span>}</label>
     <button className="btn mt-3 w-full disabled:opacity-50" disabled={!importRows.length||importing} onClick={importFile}>{importing?'Importando…':'Importar alunos'}</button>
    </section>
    {message&&<div className="card text-sm">{message}</div>}
   </div>
   <div className="card"><div className="mb-4 flex items-center gap-3"><UsersIcon className="shrink-0 text-forest"/><div className="flex-1"><input className="field" placeholder="Buscar por aluno, matrícula, unidade ou turma…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Unidade</th><th>Série</th><th>Turma</th><th>Tempo</th><th className="text-right">Quantidade de alunos</th><th className="w-10"><span className="sr-only">Expandir</span></th></tr></thead><tbody>{grouped.map(({schoolClass,students,visibleStudents})=>{const expanded=expandedClasses.has(schoolClass.id);return <Fragment key={schoolClass.id}>
     <tr className="cursor-pointer border-b transition hover:bg-paper/70" onClick={()=>toggleClass(schoolClass.id)} aria-expanded={expanded}><td className="py-4 font-semibold">{schoolClass.unit.name}</td><td>{schoolClass.grade}º ano</td><td><span className="rounded-lg bg-paper px-3 py-1 font-semibold">{schoolClass.name}</span></td><td>{timeLabel(schoolClass.timeMode)}</td><td className="text-right font-bold">{students.length.toLocaleString('pt-BR')}</td><td><ChevronDown className={`transition ${expanded?'rotate-180':''}`} size={18}/></td></tr>
     {expanded&&<tr className="border-b bg-paper/45" key={`${schoolClass.id}-students`}><td colSpan={6} className="p-0"><div className="grid gap-2 p-4 sm:grid-cols-2 2xl:grid-cols-3">{visibleStudents.map(student=><div className="rounded-xl border border-black/10 bg-white px-4 py-3" key={student.id}><strong className="block">{student.name}</strong><small className="text-black/50">Matrícula: {student.registration||'não informada'}</small></div>)}</div></td></tr>}
    </Fragment>})}</tbody></table>{!grouped.length&&<p className="py-8 text-center text-black/45">Nenhuma turma ou aluno encontrado.</p>}</div>
   </div>
  </div>
 </Page>;
}
