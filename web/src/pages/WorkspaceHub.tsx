import { Link, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  ArrowLeft, ArrowUpRight, BriefcaseBusiness, Camera, ChartNoAxesCombined, Activity,
  CheckSquare, Clapperboard, Clock3, FolderKanban, MessageSquareText,
  Palette, Presentation, RadioTower, Sparkles, Users, CalendarCheck,
  LockKeyhole, CalendarDays, FileText, ShieldCheck, Settings2,
  Film, Aperture, Layers3, Megaphone, ClipboardList, Video, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Shell } from '../components/layout/Shell';

type AppCard = {
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  route?: string;
  access?: number;
  state: 'active' | 'planned' | 'restricted';
};

type Workspace = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  accent: string;
  tint: string;
  icon: LucideIcon;
  mode: 'office' | 'studio' | 'command' | 'admin';
  cards: AppCard[];
};

const workspaces: Record<string, Workspace> = {
  gestao: {
    eyebrow: 'GESTÃO · ESPAÇO PESSOAL DE TRABALHO',
    title: 'Seu escritório.',
    subtitle: 'Um lugar para pensar, organizar e fazer acontecer.',
    intro: 'Seus projetos, suas prioridades e suas responsabilidades reunidos em um espaço feito para dar clareza ao seu trabalho.',
    accent: '#D7BD8D',
    tint: 'rgba(196,166,106,.19)',
    icon: BriefcaseBusiness,
    mode: 'office',
    cards: [
      { title: 'Projetos', description: 'Tire ideias do papel, organize etapas e acompanhe cada entrega.', detail: 'PLANEJAMENTO · PROGRESSO · ENTREGAS', icon: FolderKanban, route: '/gestao?tab=projetos', state: 'active' },
      { title: 'Tarefas', description: 'Uma mesa de trabalho pessoal para prioridades, prazos e próximos passos.', detail: 'HOJE · PRÓXIMAS · CONCLUÍDAS', icon: CheckSquare, route: '/gestao?tab=tarefas', state: 'active' },
      { title: 'Escalas', description: 'Consulte suas responsabilidades e os compromissos das equipes.', detail: 'RESPONSABILIDADES · CONFIRMAÇÕES', icon: CalendarCheck, route: '/m/studio/schedules', state: 'active' },
      { title: 'Meu espaço', description: 'Veja sua rotina, prioridades, entregas recentes e participação nos projetos.', detail: 'MINHA ROTINA · MINHA EVOLUÇÃO', icon: Target, route: '/gestao?tab=espaco', state: 'active' },
    ],
  },
  producao: {
    eyebrow: 'PRODUÇÃO CRIATIVA · AMBIENTE DE ESTÚDIO',
    title: 'O estúdio criativo.',
    subtitle: 'Cada ideia tem um processo. Cada entrega tem um padrão.',
    intro: 'Um ambiente técnico e visual para organizar a produção, acompanhar equipes e conduzir cada trabalho da criação à entrega.',
    accent: '#B8CBE0',
    tint: 'rgba(76,119,166,.22)',
    icon: Clapperboard,
    mode: 'studio',
    cards: [
      { title: 'Audiovisual', description: 'Briefings, gravações, edição, revisão e aprovação de vídeos.', detail: 'CÂMERA · EDIÇÃO · FINALIZAÇÃO', icon: Video, route: '/m/studio/departments/audiovisual', state: 'active' },
      { title: 'Design', description: 'Demandas visuais, referências, peças gráficas e aprovações.', detail: 'BRIEFING · CRIAÇÃO · APROVAÇÃO', icon: Palette, route: '/m/studio/departments/design', state: 'active' },
      { title: 'Fotografia', description: 'Coberturas, ensaios, seleção, tratamento e entrega de imagens.', detail: 'CAPTAÇÃO · SELEÇÃO · TRATAMENTO', icon: Aperture, route: '/m/studio/departments/fotos', state: 'active' },
      { title: 'Transmissão', description: 'Preparação técnica, programação e operação das transmissões.', detail: 'PRÉ-PRODUÇÃO · AO VIVO · OPERAÇÃO', icon: RadioTower, route: '/m/studio/departments/transmissao', state: 'active' },
      { title: 'Slides', description: 'Apresentações, letras, versículos e conteúdos de projeção.', detail: 'ROTEIRO · MONTAGEM · PROJEÇÃO', icon: Presentation, route: '/m/studio/departments/slide', state: 'active' },
    ],
  },
  inteligencia: {
    eyebrow: 'COMUNICAÇÃO E INTELIGÊNCIA · CENTRAL DE COMANDO',
    title: 'Informação em movimento.',
    subtitle: 'Conectar pessoas. Dar clareza. Enxergar resultados.',
    intro: 'Um ambiente para manter a equipe informada, coordenar a comunicação externa e transformar atividades em informação útil para a liderança.',
    accent: '#A9D0C4',
    tint: 'rgba(72,151,132,.19)',
    icon: MessageSquareText,
    mode: 'command',
    cards: [
      { title: 'Comunicação', description: 'Comunicados internos, campanhas, calendário editorial e Social Media.', detail: 'AVISOS · CONTEÚDO · REDES SOCIAIS', icon: Megaphone, route: '/m/communication', state: 'active' },
      { title: 'Relatórios', description: 'Acompanhe eventos, entregas, pendências e indicadores operacionais.', detail: 'INDICADORES · ACOMPANHAMENTO', icon: ChartNoAxesCombined, route: '/m/studio/reports', state: 'active' },
      { title: 'Inteligência', description: 'Tenha uma leitura consolidada da comunicação, da produção e das próximas entregas.', detail: 'VISÃO GERAL · INDICADORES · ALERTAS', icon: Activity, route: '/m/communication/intelligence', state: 'active' },
    ],
  },
  administracao: {
    eyebrow: 'ADMINISTRAÇÃO · ACESSO RESTRITO',
    title: 'Sala de administração.',
    subtitle: 'Estrutura, acessos e governança da plataforma.',
    intro: 'Ferramentas administrativas para manter a estrutura institucional organizada e os acessos sob controle.',
    accent: '#D7BD8D',
    tint: 'rgba(196,166,106,.18)',
    icon: ShieldCheck,
    mode: 'admin',
    cards: [
      { title: 'Visão administrativa', description: 'Acompanhe a estrutura geral e as configurações da plataforma.', detail: 'VISÃO GERAL · CONTROLE', icon: BriefcaseBusiness, route: '/admin', state: 'active', access: 4 },
      { title: 'Usuários', description: 'Cadastre pessoas e gerencie o acesso de cada conta.', detail: 'CONTAS · STATUS · ACESSOS', icon: Users, route: '/admin/users', state: 'active', access: 5 },
      { title: 'Departamentos', description: 'Organize setores, departamentos e responsabilidades.', detail: 'ESTRUTURA · DEPARTAMENTOS', icon: Layers3, route: '/admin/sectors', state: 'active', access: 4 },
      { title: 'Configurações', description: 'Ajuste parâmetros e preferências institucionais.', detail: 'PREFERÊNCIAS · CONFIGURAÇÕES', icon: Settings2, route: '/admin/settings', state: 'active', access: 4 },
      { title: 'Auditoria', description: 'Consulte o histórico de ações e alterações administrativas.', detail: 'HISTÓRICO · RASTREABILIDADE', icon: FileText, route: '/admin/audit', state: 'active', access: 4 },
      { title: 'Aplicativos e permissões', description: 'Controle os módulos habilitados e seus níveis de acesso.', detail: 'MÓDULOS · PERMISSÕES', icon: ClipboardList, route: '/admin/modules', state: 'active', access: 5 },
    ],
  },
};

function dateLabel() {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Status({ state }: { state: AppCard['state'] }) {
  const label = state === 'active' ? 'Acesso disponível' : state === 'restricted' ? 'Acesso restrito' : 'Estrutura em construção';
  return <span className={`workspace-status workspace-status--${state}`}>{label}</span>;
}

function OfficeArtwork() {
  return <div className="workspace-office-art" aria-hidden="true">
    <div className="office-window"><span/><span/><span/></div>
    <div className="office-lamp"/>
    <div className="office-desk"/>
    <div className="office-notebook"><i/><i/><i/></div>
    <div className="office-pen"/>
    <div className="office-cup"/>
  </div>;
}

function StudioArtwork() {
  return <div className="workspace-studio-art" aria-hidden="true">
    <div className="studio-monitor"><span/><span/><span/><i/></div>
    <div className="studio-lens"><span/><i/></div>
    <div className="studio-recording"><b/><span>REC</span></div>
    <div className="studio-timeline"><i/><i/><i/><i/><i/></div>
  </div>;
}

function CommandArtwork() {
  return <div className="workspace-command-art" aria-hidden="true">
    <div className="command-ring"><span/><i/></div>
    <div className="command-bars"><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="command-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
  </div>;
}

function AdminArtwork() {
  return <div className="workspace-admin-art" aria-hidden="true">
    <div className="admin-shield"><ShieldCheck size={58}/></div>
    <div className="admin-lines"><i/><i/><i/><i/></div>
  </div>;
}

function CardContent({ card, mode }: { card: AppCard; mode: Workspace['mode'] }) {
  const Icon = card.icon;
  return <>
    <div className="flex items-start justify-between gap-3">
      <span className={`workspace-app-icon workspace-app-icon--${mode}`}><Icon size={21}/></span>
      <Status state={card.state}/>
    </div>
    <div className="mt-6">
      <h2 className="text-[17px] font-semibold tracking-tight text-white">{card.title}</h2>
      <p className="mt-2 min-h-[48px] text-[12px] leading-[1.75] text-white/55">{card.description}</p>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[.08] pt-3">
      <span className="text-[8px] font-semibold tracking-[.16em] text-white/32">{card.detail}</span>
      {card.route ? <ArrowUpRight size={15} className="shrink-0 text-[var(--workspace-accent)]"/> : <Clock3 size={14} className="shrink-0 text-white/25"/>}
    </div>
  </>;
}

export default function WorkspaceHub() {
  const { slug = '' } = useParams();
  const { level, user } = useAuth();
  const workspace = workspaces[slug];
  const firstName = user?.full_name?.trim().split(/\s+/)[0] ?? 'equipe';
  if (!workspace || (slug === 'administracao' && level < 4)) {
    return <main className="flex min-h-[70vh] items-center justify-center px-5"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191d] p-7 text-center text-white"><LockKeyhole className="mx-auto mb-4 h-8 w-8 text-[#C4A66A]"/><h1 className="text-xl font-semibold">Ambiente indisponível</h1><p className="mt-2 text-sm leading-6 text-white/55">Este ambiente não existe ou seu perfil não tem permissão para acessá-lo.</p><Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm text-[#D8BD86]"><ArrowLeft size={16}/>Voltar à central</Link></section></main>;
  }
  const HeroIcon = workspace.icon;
  const Artwork = workspace.mode === 'office' ? OfficeArtwork : workspace.mode === 'studio' ? StudioArtwork : workspace.mode === 'command' ? CommandArtwork : AdminArtwork;
  const visibleCards = workspace.cards.filter((card) => level >= (card.access ?? 1));
  return <Shell sectionLabel={workspace.title.replace(/\\.$/, '')}><main className={`workspace-page workspace-${workspace.mode} min-h-[calc(100vh-3.5rem)] overflow-hidden text-white`} style={{ '--workspace-accent': workspace.accent, '--workspace-glow': workspace.tint } as CSSProperties}>
    <div className="workspace-atmosphere" aria-hidden="true"/>
    <div className="relative mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10">
      <section className="workspace-hero relative overflow-hidden rounded-[28px] border border-white/10">
        <div className="workspace-hero-copy relative z-10 p-6 sm:p-9 lg:p-11">
          <p className="mb-4 flex items-center gap-2 text-[9px] font-bold tracking-[.25em]" style={{color:workspace.accent}}><span className="h-1.5 w-1.5 rounded-full" style={{background:workspace.accent}}/>{workspace.eyebrow}</p>
          <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/[.06]"><HeroIcon size={21} style={{color:workspace.accent}}/></span><span className="text-[9px] font-semibold tracking-[.2em] text-white/35">MMV / CREATIVE</span></div>
          <h1 className="max-w-2xl text-[2.55rem] font-semibold leading-[1.02] tracking-[-.06em] sm:text-5xl lg:text-[3.7rem]">{workspace.title}</h1>
          <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/78 sm:text-base">{workspace.subtitle}</p>
          <p className="mt-3 max-w-xl text-[12px] leading-6 text-white/48">{workspace.intro}</p>
          {workspace.mode === 'office' && <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] text-white/45"><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">{greeting()}, {firstName}</span><span className="flex items-center gap-1.5"><CalendarDays size={12}/>{dateLabel()}</span></div>}
        </div>
        <Artwork/>
        <div className="workspace-hero-foot"><span>MMV CREATIVE</span><span>{workspace.mode.toUpperCase()} / 0{Object.keys(workspaces).indexOf(slug)+1}</span></div>
      </section>

      <section className="mt-8 sm:mt-10">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold tracking-[.22em]" style={{color:workspace.accent}}>SEU AMBIENTE DE TRABALHO</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Aplicativos</h2></div><span className="text-[10px] text-white/32">{visibleCards.length.toString().padStart(2,'0')} espaços</span></div>
        <div className={`grid gap-3 ${workspace.mode === 'studio' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
          {visibleCards.map((card) => {
            const content = <CardContent card={card} mode={workspace.mode}/>;
            return card.route
              ? <Link key={card.title} to={card.route} className="workspace-app-card group">{content}</Link>
              : <article key={card.title} className="workspace-app-card workspace-app-card--planned">{content}</article>;
          })}
        </div>
      </section>
      <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.08] pt-5 text-[9px] tracking-[.15em] text-white/25"><span className="flex items-center gap-2"><Sparkles size={12} style={{color:workspace.accent}}/>UM AMBIENTE FEITO PARA O SEU TRABALHO</span><span>MMV CREATIVE · {workspace.mode.toUpperCase()}</span></footer>
    </div>
  </main></Shell>;
}
