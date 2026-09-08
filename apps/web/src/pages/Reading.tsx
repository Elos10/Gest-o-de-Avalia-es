import {Camera,CheckCircle2,LoaderCircle,RotateCcw,Trash2,Upload} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../lib/api';
import type {Processing} from '../lib/types';
import {Page} from '../components/Page';

const stages=['Validar arquivos','Detectar todos os gabaritos','Localizar e validar marcadores','Normalizar e medir as bolhas','Gravar dados estruturados'];
const statusLabels:Record<string,string>={RECEIVED:'Recebido',PROCESSING:'Processando',REVIEW_REQUIRED:'Revisão necessária',READY:'Pronto para corrigir',FINALIZED:'Finalizado',FAILED:'Falhou'};
type BatchSummary={totalProcessed:number;totalSuccess:number;totalWithAlert:number;totalWithError:number;totalRequiringReview:number};
type BatchResponse={items:Processing[];summary:BatchSummary};
type Me={role:'ADMIN'|'MANAGER'|'TEACHER'|'OPERATOR'};

export function Reading(){
 const picker=useRef<HTMLInputElement>(null),timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 const [files,setFiles]=useState<File[]>([]),[items,setItems]=useState<Processing[]>([]),[message,setMessage]=useState(''),[processing,setProcessing]=useState(false),[progress,setProgress]=useState(0),[summary,setSummary]=useState<BatchSummary>(),[role,setRole]=useState('');
 const load=()=>Promise.all([api<Processing[]>('/api/processings'),api<Me>('/api/me')]).then(([rows,me])=>{setItems(rows);setRole(me.role)}).catch(()=>{});
 useEffect(()=>{void load();return()=>{if(timer.current)clearInterval(timer.current)}},[]);
 const activeStage=Math.min(stages.length-1,Math.floor(progress/20));
 function chooseAgain(){setFiles([]);setSummary(undefined);setMessage('');setProgress(0);picker.current?.click()}
 async function remove(item:Processing){if(!confirm('Deseja excluir permanentemente os dados desta leitura? O arquivo original já foi descartado e não poderá ser recuperado.'))return;try{await api(`/api/processings/${item.id}`,{method:'DELETE'});setMessage('Leitura excluída.');await load()}catch(error){setMessage((error as Error).message)}}
 async function process(){
  if(!files.length||processing)return;
  setProcessing(true);setSummary(undefined);setMessage('');setProgress(6);
  timer.current=setInterval(()=>setProgress(value=>value<92?value+(value<45?4:value<75?2:1):value),650);
  const form=new FormData();files.forEach(file=>form.append('files',file));
  try{const body=await api<BatchResponse>('/api/processings',{method:'POST',body:form});if(timer.current)clearInterval(timer.current);setProgress(100);setSummary(body.summary);setMessage(`${body.summary.totalProcessed} gabarito(s) processado(s). Consulte abaixo os itens prontos e os que exigem revisão.`);await load()}
  catch(error){if(timer.current)clearInterval(timer.current);setProgress(0);setMessage((error as Error).message);await load()}
  finally{setProcessing(false)}
 }
 return <Page eyebrow="Processamento em lote" title="Leitura de gabaritos" description="Envie uma ou várias imagens, PDF multipágina, página A4 com duas vias ou gabarito de meia folha A4.">
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
   <label className={`card flex min-h-64 flex-col items-center justify-center border-dashed text-center ${processing?'cursor-not-allowed opacity-70':'cursor-pointer'}`}>
    <input ref={picker} className="hidden" type="file" multiple accept="application/pdf,image/png,image/jpeg" disabled={processing} onChange={event=>{setFiles(Array.from(event.target.files??[]));setMessage('');setSummary(undefined);setProgress(0)}}/>
    {files.length?<><CheckCircle2 className="text-forest" size={42}/><strong className="mt-3">{files.length} arquivo(s) selecionado(s)</strong><span className="text-sm text-black/45">{files.map(file=>file.name).join(' • ')}</span></>:<><Upload className="text-forest" size={42}/><strong className="mt-3">Escolha as digitalizações</strong><span className="mt-1 text-sm text-black/45">PDF, PNG ou JPEG • um ou vários arquivos</span></>}
   </label>
   <div className="card">
    <div className="flex items-center gap-3"><Camera className="text-forest"/><h2 className="text-xl font-bold">Processamento automático</h2></div>
    <ol className="mt-5 space-y-4 text-sm">{stages.map((stage,index)=>{const done=progress>=(index+1)*20;const active=processing&&index===activeStage;return <li className={`flex items-center gap-3 ${active||done?'font-semibold text-forest':'text-ink'}`} key={stage}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-bold ${done?'bg-forest text-white':active?'bg-mint text-forest ring-2 ring-forest/20':'bg-mint text-forest'}`}>{done?<CheckCircle2 size={15}/>:index+1}</span>{stage}{active&&<LoaderCircle className="ml-auto animate-spin" size={17}/>}</li>})}</ol>
    {(processing||progress>0)&&<div className="mt-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="mb-2 flex justify-between text-xs font-semibold"><span>{progress===100?'Processamento concluído':stages[activeStage]}</span><span>{Math.round(progress)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{width:`${progress}%`}}/></div></div>}
    <button className="btn mt-7 flex w-full items-center justify-center gap-2" disabled={!files.length||processing} onClick={process}>{processing&&<LoaderCircle className="animate-spin" size={18}/>} {processing?'Processando todos os gabaritos…':'Processar gabaritos'}</button>
    <button className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-semibold text-forest" disabled={processing} onClick={chooseAgain}><RotateCcw size={16}/> Reler com novos arquivos</button>
    {message&&<p className={`mt-4 rounded-xl px-3 py-2 text-sm ${progress===100?'bg-mint text-forest':'bg-red-50 text-red-700'}`}>{message}</p>}
   </div>
  </div>
  {summary&&<section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[[summary.totalProcessed,'Processados'],[summary.totalSuccess,'Sucesso'],[summary.totalWithAlert,'Com alerta'],[summary.totalWithError,'Com erro'],[summary.totalRequiringReview,'Revisar']].map(([value,label])=><div className="card !p-4" key={label}><strong className="text-2xl">{value}</strong><span className="block text-xs text-black/50">{label}</span></div>)}</section>}
  <div className="mt-5 rounded-2xl bg-mint/60 p-4 text-sm text-forest"><strong>Privacidade:</strong> arquivos e imagens existem apenas durante o processamento. Após a conclusão, somente respostas, confiança, situação e dados de auditoria permanecem no banco.</div>
  <h2 className="mt-9 text-xl font-bold">Processamentos recentes</h2><div className="card mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="pb-3">Aluno</th><th>Avaliação</th><th>Status</th><th>Data</th><th className="text-right">Ações</th></tr></thead><tbody>{items.map(item=><tr className="border-b last:border-0" key={item.id}><td className="py-3 font-semibold">{item.sheet&&item.status!=='FAILED'?<Link className="text-forest hover:underline" to={`/leitura/${item.id}/revisao`}>{item.sheet.student?.name??'Folha sem aluno'}</Link>:<span>Não identificado</span>}</td><td>{item.sheet?.assessment.number??'—'}</td><td><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status==='FAILED'?'bg-red-50 text-red-700':item.status==='FINALIZED'?'bg-mint text-forest':'bg-amber/15 text-ink'}`}>{statusLabels[item.status]??item.status}</span>{item.status==='FAILED'&&<small className="mt-1 block max-w-xs text-red-700">{item.errorCode??'Falha de leitura'}</small>}</td><td>{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td><div className="flex justify-end gap-2">{item.sheet&&item.status!=='FAILED'&&<Link className="rounded-lg p-2 text-forest hover:bg-mint" title="Editar respostas" to={`/leitura/${item.id}/revisao`}>Editar</Link>}<button className="rounded-lg p-2 text-forest hover:bg-mint" title="Reler com novo arquivo" onClick={chooseAgain}><RotateCcw size={17}/></button>{role==='ADMIN'&&<button className="rounded-lg p-2 text-red-700 hover:bg-red-50" title="Excluir leitura" onClick={()=>void remove(item)}><Trash2 size={17}/></button>}</div></td></tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhum arquivo processado.</p>}</div>
 </Page>
}
