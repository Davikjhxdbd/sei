import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clapperboard, Instagram, Plus, Search, Send, Youtube } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { patch, post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageHeader, SearchInput, Select, Textarea } from '../components/ui';
import { formatDateTime } from '../lib/format';

type Item = { id:string; title:string; platform:string; format:string; campaign:string|null; caption:string|null; scheduled_at:string|null; status:string; assigned_to:string|null; created_by:string; assignee_name:string|null; author_name:string };
type Payload = { items:Item[]; totals:{total:number;in_progress:number;scheduled:number;published:number} };
const statuses = [
 {value:'idea',label:'Ideia',tone:'neutral'},{value:'draft',label:'Rascunho',tone:'neutral'},
 {value:'production',label:'Em produção',tone:'info'},{value:'review',label:'Em revisão',tone:'warning'},
 {value:'approved',label:'Aprovado',tone:'success'},{value:'scheduled',label:'Agendado',tone:'info'},
 {value:'published',label:'Publicado',tone:'success'},{value:'archived',label:'Arquivado',tone:'neutral'}
] as const;
const platforms=['Instagram','YouTube','Facebook','TikTok','Site'];
const formats=['Reel','Post','Story','Carrossel','Live','Short','Vídeo','Outro'];
export default function SocialMedia() {
 const {level,user}=useAuth(); const toast=useToast();
 const {data,loading,error,reload}=useApi<Payload>('/communication/content?limit=200');
 const people=useApi<{items:{id:string;full_name:string}[]}> (level >= 2 ? '/catalog/people' : null);
 const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all');
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Item|null>(null); const [saving,setSaving]=useState(false);
 const [title,setTitle]=useState(''); const [platform,setPlatform]=useState('Instagram'); const [format,setFormat]=useState('Reel');
 const [campaign,setCampaign]=useState(''); const [caption,setCaption]=useState(''); const [scheduled,setScheduled]=useState(''); const [assigned,setAssigned]=useState('');
 const items=useMemo(()=> (data?.items??[]).filter(item=>{
   const q=query.trim().toLocaleLowerCase('pt-BR');
   return (!q||[item.title,item.campaign??'',item.caption??'',item.assignee_name??''].some(v=>v.toLocaleLowerCase('pt-BR').includes(q)))
     && (filter==='all'||item.status===filter);
 }),[data,query,filter]);
 function start(item?:Item){setEditing(item??null);setTitle(item?.title??'');setPlatform(item?.platform??'Instagram');setFormat(item?.format??'Reel');setCampaign(item?.campaign??'');setCaption(item?.caption??'');setScheduled(item?.scheduled_at?new Date(item.scheduled_at).toISOString().slice(0,16):'');setAssigned(item?.assigned_to??'');setOpen(true);}
 async function save(){if(!title.trim())return;setSaving(true);try{
   const body={title,platform,format,campaign,caption,scheduled_at:scheduled?new Date(scheduled).toISOString():null,assigned_to:assigned||null};
   if(editing)await patch(`/communication/content/${editing.id}`,body);else await post('/communication/content',body);
   setOpen(false);await reload();toast.push(editing?'Pauta atualizada.':'Pauta adicionada ao calendário editorial.');
 }catch(e:any){toast.push(e?.message??'Não foi possível salvar a pauta.','error');}finally{setSaving(false);}}
 async function move(item:Item,status:string){try{await patch(`/communication/content/${item.id}`,{status});await reload();}catch(e:any){toast.push(e?.message??'Não foi possível atualizar a etapa.','error');}}
 return <div>
  <PageHeader eyebrow="MMV CREATIVE · COMUNICAÇÃO" title="Social Media" description="Planeje campanhas, organize a produção e acompanhe o conteúdo até a publicação." actions={<div className="flex flex-wrap gap-2"><Link to="/m/communication" className="inline-flex h-10 items-center rounded-lg border border-line px-3 text-xs font-medium text-ink">Comunicados</Link>{level>=2&&<Button icon={Plus} onClick={()=>start()}>Nova pauta</Button>}</div>}/>
  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
   {[{label:'Pautas',value:data?.totals.total??0},{label:'Em andamento',value:data?.totals.in_progress??0},{label:'Agendadas',value:data?.totals.scheduled??0},{label:'Publicadas',value:data?.totals.published??0}].map(x=><Card key={x.label} className="p-4"><p className="text-[11px] text-muted">{x.label}</p><p className="mt-2 text-2xl font-semibold text-ink">{loading?'—':x.value}</p></Card>)}
  </div>
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
   <SearchInput value={query} onChange={setQuery} placeholder="Buscar pauta, campanha ou responsável…" className="w-full sm:max-w-sm"/>
   <div className="flex flex-wrap gap-1.5">{[{value:'all',label:'Todas'},...statuses.filter(s=>s.value!=='archived')].map(s=><button key={s.value} onClick={()=>setFilter(s.value)} className={`rounded-full border px-3 py-1.5 text-[11px] ${filter===s.value?'border-strong bg-strong text-white':'border-line bg-surface text-muted'}`}>{s.label}</button>)}</div>
  </div>
  {loading?<LoadingBlock/>:error?<Card className="p-6 text-center"><p className="text-sm text-ink">{error}</p><Button className="mt-3" variant="secondary" onClick={reload}>Tentar novamente</Button></Card>:items.length?<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
   {items.map(item=>{const canEdit=level>=3||item.created_by===user?.id;const canChangeStatus=canEdit||item.assigned_to===user?.id;return <Card key={item.id} className="p-4">
    <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2 text-muted">{item.platform==='YouTube'?<Youtube size={16}/>:item.platform==='Instagram'?<Instagram size={16}/>:<Clapperboard size={16}/>}<span className="text-[10px] font-semibold uppercase tracking-wider">{item.platform} · {item.format}</span></div><Badge tone={statuses.find(s=>s.value===item.status)?.tone??'neutral'}>{statuses.find(s=>s.value===item.status)?.label??item.status}</Badge></div>
    <div className="mt-4">{canEdit?<button onClick={()=>start(item)} className="block w-full text-left"><h2 className="text-sm font-semibold text-ink">{item.title}</h2>{item.campaign&&<p className="mt-1 text-[11px] text-brass-deep">{item.campaign}</p>}{item.caption&&<p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted">{item.caption}</p>}</button>:<><h2 className="text-sm font-semibold text-ink">{item.title}</h2>{item.campaign&&<p className="mt-1 text-[11px] text-brass-deep">{item.campaign}</p>}{item.caption&&<p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted">{item.caption}</p>}</>}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-muted"><span>{item.assignee_name??'Sem responsável'}</span><span><CalendarDays size={11} className="mr-1 inline"/>{item.scheduled_at?formatDateTime(item.scheduled_at):'Sem data'}</span></div>
    {canChangeStatus&&<div className="mt-3 flex items-center gap-2"><Select aria-label={`Etapa da pauta ${item.title}`} value={item.status} onChange={e=>void move(item,e.target.value)} className="h-9 flex-1 text-xs">{statuses.filter(s=>s.value!=='archived').map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</Select>{canEdit&&<button title="Arquivar pauta" onClick={()=>void move(item,'archived')} className="h-9 rounded-lg border border-line px-3 text-[10px] text-muted hover:text-ink">Arquivar</button>}</div>}
   </Card>})}
  </div>:<Card><EmptyState icon={Send} title={query?'Nenhuma pauta encontrada':'Seu calendário editorial começa aqui'} description={query?'Tente outro termo ou etapa.':'Cadastre campanhas e conteúdos para acompanhar cada publicação.'}/></Card>}
  <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Editar pauta':'Nova pauta de conteúdo'} description="Organize o conteúdo desde a ideia até a publicação.">
   <div className="space-y-4">
    <Field label="Título da pauta" required><Input value={title} onChange={e=>setTitle(e.target.value)} maxLength={180} placeholder="Ex.: Reel — palavra de domingo"/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Plataforma"><Select value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(x=><option key={x}>{x}</option>)}</Select></Field><Field label="Formato"><Select value={format} onChange={e=>setFormat(e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</Select></Field></div>
    <Field label="Campanha / série"><Input value={campaign} onChange={e=>setCampaign(e.target.value)} maxLength={180} placeholder="Ex.: Primícias"/></Field>
    <Field label="Legenda / briefing"><Textarea value={caption} onChange={e=>setCaption(e.target.value)} maxLength={6000} rows={5} placeholder="Ideia central, legenda, referências e orientação de criação…"/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Data de publicação"><Input type="datetime-local" value={scheduled} onChange={e=>setScheduled(e.target.value)}/></Field><Field label="Responsável"><Select value={assigned} onChange={e=>setAssigned(e.target.value)}><option value="">Sem responsável</option>{(people.data?.items??[]).map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></Field></div>
    <div className="flex justify-end gap-2 border-t border-line pt-3"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancelar</Button><Button loading={saving} disabled={!title.trim()} onClick={()=>void save()}>{editing?'Salvar alterações':'Criar pauta'}</Button></div>
   </div>
  </Modal>
 </div>;
}
