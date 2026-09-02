import {ArrowLeft,BarChart3,Building2,Camera,ClipboardCheck,GraduationCap,LayoutDashboard,Menu,Settings,Users,X} from 'lucide-react';
import {useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';

const links=[['/','Visão geral',LayoutDashboard],['/avaliacoes','Avaliações',ClipboardCheck],['/leitura','Leitura de gabaritos',Camera],['/resultados','Resultados',BarChart3],['/relatorios','Relatórios',BarChart3],['/alunos','Alunos',Users],['/turmas','Turmas',GraduationCap],['/unidades','Unidades',Building2],['/configuracoes','Configurações',Settings]] as const;

export function Shell(){
 const navigate=useNavigate(),[open,setOpen]=useState(false),logo=`${import.meta.env.BASE_URL}logo_semed.png`;
 return <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
  <button className="fixed right-4 top-4 z-30 rounded-xl bg-ink p-2 text-white md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 z-20 w-[260px] overflow-y-auto bg-ink p-6 text-white transition md:sticky md:top-0 md:translate-x-0`}><div className="mb-7 rounded-2xl bg-white p-3"><img src={logo} alt="Secretaria de Educação de Uberaba" className="h-auto w-full"/></div><div className="mb-7"><div className="eyebrow !text-amber">Sistema Avalia</div><div className="text-xl font-bold">Leitura escolar</div><p className="mt-2 text-sm text-white/60">Da impressão ao resultado.</p></div><nav className="space-y-1">{links.map(([to,label,Icon])=><NavLink end={to==='/'} key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive?'bg-white text-ink':'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{label}</NavLink>)}</nav></aside>
  <main className="min-w-0 p-5 md:p-9"><div className="mb-3 flex justify-end pr-12 md:pr-0"><button className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 font-semibold hover:bg-black/5" onClick={()=>navigate(-1)}><ArrowLeft size={18}/> Voltar</button></div><Outlet/></main>
 </div>;
}
