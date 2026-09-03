import {Camera,CheckCircle2,LoaderCircle,Upload} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {api} from '../lib/api';
import type {Processing} from '../lib/types';
import {Page} from '../components/Page';

const stages=['Validar assinatura real do arquivo','Identificar QR e folha do aluno','Corrigir rotação e perspectiva','Medir preenchimento das bolhas','Separar leituras confiáveis e revisão'];

export function Reading(){
 const nav=useNavigate();
 const timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 const [file,setFile]=useState<File|null>(null),[items,setItems]=useState<Processing[]>([]),[message,setMessage]=useState(''),[processing,setProcessing]=useState(false),[progress,setProgress]=useState(0);
 useEffect(()=>{api<Processing[]>('/api/processings').then(setItems).catch(()=>{});return()=>{if(timer.current)clearInterval(timer.current)}},[]);
 const activeStage=Math.min(stages.length-1,Math.floor(progress/20));
 async function process(){
  if(!file||processing)return;
  setProcessing(true);setMessage('');setProgress(6);
  timer.current=setInterval(()=>setProgress(value=>value<92?value+(value<45?4:value<75?2:1):value),650);
  const form=new FormData();form.append('file',file);
  try{
   const body=await api<Processing>('/api/processings',{method:'POST',body:form});
   if(timer.current)clearInterval(timer.current);setProgress(100);setMessage('Leitura concluída. Abrindo a conferência…');
   setTimeout(()=>nav(`/leitura/${body.id}/revisao`),450);
  }catch(error){
   if(timer.current)clearInterval(timer.current);setProgress(0);setMessage((error as Error).message);setProcessing(false);
  }
 }
 return <Page eyebrow="Processamento" title="Leitura de gabaritos" description="Envie PDF, JPG ou PNG digitalizado. Página A4 inteira ou metade cortada.">
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
   <label className={`card flex min-h-64 flex-col items-center justify-center border-dashed text-center ${processing?'cursor-not-allowed opacity-70':'cursor-pointer'}`}>
    <input className="hidden" type="file" accept="application/pdf,image/png,image/jpeg" disabled={processing} onChange={event=>{setFile(event.target.files?.[0]??null);setMessage('');setProgress(0)}}/>
    {file?<><CheckCircle2 className="text-forest" size={42}/><strong className="mt-3">{file.name}</strong><span className="text-sm text-black/45">{(file.size/1024/1024).toFixed(2)} MB</span></>:<><Upload className="text-forest" size={42}/><strong className="mt-3">Escolha uma digitalização</strong><span className="mt-1 text-sm text-black/45">PDF, PNG ou JPEG • até 15 MB</span></>}
   </label>
   <div className="card">
    <div className="flex items-center gap-3"><Camera className="text-forest"/><h2 className="text-xl font-bold">Processamento automático</h2></div>
    <ol className="mt-5 space-y-4 text-sm">{stages.map((stage,index)=>{const done=processing&&progress>=(index+1)*20;const active=processing&&index===activeStage;return <li className={`flex items-center gap-3 ${active?'font-semibold text-forest':done?'text-forest':'text-ink'}`} key={stage}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-bold ${done?'bg-forest text-white':active?'bg-mint text-forest ring-2 ring-forest/20':'bg-mint text-forest'}`}>{done?<CheckCircle2 size={15}/>:index+1}</span>{stage}{active&&<LoaderCircle className="ml-auto animate-spin" size={17}/>}</li>})}</ol>
    {(processing||progress>0)&&<div className="mt-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="mb-2 flex justify-between text-xs font-semibold"><span>{progress===100?'Processamento concluído':stages[activeStage]}</span><span>{Math.round(progress)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{width:`${progress}%`}}/></div></div>}
    <button className="btn mt-7 flex w-full items-center justify-center gap-2" disabled={!file||processing} onClick={process}>{processing&&<LoaderCircle className="animate-spin" size={18}/>} {processing?'Processando dados…':'Processar gabarito'}</button>
    {message&&<p className={`mt-4 rounded-xl px-3 py-2 text-sm ${progress===100?'bg-mint text-forest':'bg-red-50 text-red-700'}`}>{message}</p>}
   </div>
  </div>
  <h2 className="mt-9 text-xl font-bold">Processamentos recentes</h2><div className="card mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="pb-3">Aluno</th><th>Avaliação</th><th>Status</th><th>Data</th></tr></thead><tbody>{items.map(item=><tr className="border-b last:border-0" key={item.id}><td className="py-3 font-semibold"><Link to={`/leitura/${item.id}/revisao`}>{item.sheet?.student?.name??'Não identificado'}</Link></td><td>{item.sheet?.assessment.number??'—'}</td><td>{item.status}</td><td>{new Date(item.createdAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>
 </Page>
}
