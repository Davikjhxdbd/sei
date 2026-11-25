import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  ArrowLeft, ArrowUpRight, BriefcaseBusiness, Camera, ChartNoAxesCombined,
  CheckSquare, Clapperboard, Clock3, FolderKanban, MessageSquareText,
  Palette, Presentation, RadioTower, Sparkles, Users, CalendarCheck,
  Bot, LockKeyhole,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

type AppCard = {
  title: string;
  description: string;
  icon: import('lucide-react').LucideIcon;
  route?: string;
  status: 'Disponível' | 'Em construção';
};

type Workspace = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  accent: string;
  glow: string;
  icon: import('lucide-react').LucideIcon;
  atmosphere: string;
  cards: AppCard[];
};

const workspaces: Record<string, Workspace> = {
  gestao: {
    eyebrow: 'ESPAÇO DE TRABALHO PESSOAL',
    title: 'Seu escritório.',
    subtitle: 'Organize ideias. Conduza projetos. Conclua o que importa.',
    intro: 'Um espaço para cuidar das suas responsabilidades, acompanhar seus projetos e transformar planos em entregas.',
    accent: '#D5B77D',
    glow: 'rgba(196,166,106,.20)',
    icon: BriefcaseBusiness,
    atmosphere: 'office',
    cards: [
      { title: 'Projetos', description: 'Seus projetos, objetivos, etapas e entregas em um só lugar.', icon: FolderKanban, status: 'Em construção' },
      { title: 'Tarefas', description: 'Prioridades, prazos e próximos passos do seu trabalho.', icon: CheckSquare, status: 'Em construção' },
      { title: 'Escalas', description: 'Consulte suas responsabilidades e compromissos de equipe.', icon: CalendarCheck, route: '/escalas', status: 'Disponível' },
    ],
  },
  producao: {
    eyebrow: 'AMBIENTE DE CRIAÇÃO',
    title: 'O estúdio criativo.',
    subtitle: 'Da primeira ideia à entrega final.',
    intro: 'Ambientes especializados para cada disciplina criativa, com processos e ferramentas pensados para o trabalho de produção.',
    accent: '#B8C7D9',
    glow: 'rgba(91,125,164,.22)',
    icon: Clapperboard,
    atmosphere: 'studio',
    cards: [
      { title: 'Audiovisual', description: 'Produções, gravações, edição, revisão e aprovação de vídeos.', icon: Clapperboard, status: 'Em construção' },
      { title: 'Design', description: 'Briefings, peças gráficas, referências e aprovações.', icon: Palette, status: 'Em construção' },
      { title: 'Fotografia', description: 'Coberturas, ensaios, seleção e tratamento de imagens.', icon: Camera, status: 'Em construção' },
      { title: 'Transmissão', description: 'Programação, preparação e operação das transmissões.', icon: RadioTower, status: 'Em construção' },
      { title: 'Slides', description: 'Apresentações, letras, versículos e conteúdo de projeção.', icon: Presentation, status: 'Em construção' },
    ],
  },
  inteligencia: {
    eyebrow: 'CENTRAL DE COMUNICAÇÃO',
    title: 'Conexão e inteligência.',
    subtitle: 'Informação clara. Decisões melhores. Equipes conectadas.',
    intro: 'Um ambiente para comunicar, acompanhar resultados e usar inteligência para simplificar a rotina.',
    accent: '#A8C9C0',
    glow: 'rgba(79,150,132,.20)',
    icon: MessageSquareText,
    atmosphere: 'command',
    cards: [
      { title: 'Comunicação', description: 'Comunicados, campanhas, calendário editorial e Social Media.', icon: MessageSquareText, route: '/m/communication', status: 'Disponível' },
      { title: 'Relatórios', description: 'Indicadores, andamento, entregas e visão geral dos resultados.', icon: ChartNoAxesCombined, status: 'Em construção' },
      { title: 'Assistente IA', description: 'Apoio para organizar demandas, briefings e informações.', icon: Bot, status: 'Em construção' },
    ],
  },
  administracao: {
    eyebrow: 'ACESSO RESTRITO',
    title: 'Administração.',
    subtitle: 'Estrutura, pessoas e governança da plataforma.',
    intro: 'Gerencie o acesso à MMV Creative, organize departamentos e mantenha as permissões sob controle.',
    accent: '#D5B77D',
    glow: 'rgba(196,166,106,.18)',
    icon: LockKeyhole,
    atmosphere: 'admin',
    cards: [
      { title: 'Visão administrativa', description: 'Acompanhe a estrutura e as configurações da plataforma.', icon: BriefcaseBusiness, route: '/admin', status: 'Disponível' },
      { title: 'Usuários', description: 'Cadastre pessoas e gerencie os acessos.', icon: Users, route: '/admin/users', status: 'Disponível' },
      { title: 'Departamentos', description: 'Organize departamentos, setores e responsabilidades.', icon: Users, route: '/admin/sectors', status: 'Disponível' },
    ],
  },
};

export default function WorkspaceHub() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { level } = useAuth();
  const workspace = workspaces[slug];
  if (!workspace || (slug === 'administracao' && level < 4)) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191d] p-7 text-center text-white">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-[#C4A66A]" />
          <h1 className="text-xl font-semibold">Ambiente indisponível</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">Este ambiente não existe ou seu perfil não tem permissão para acessá-lo.</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm text-[#D8BD86]"><ArrowLeft size={16}/> Voltar à central</Link>
        </section>
      </main>
    );
  }

  const HeroIcon = workspace.icon;
  return (
    <main className={`workspace-page workspace-${workspace.atmosphere} min-h-[calc(100vh-3.5rem)] overflow-hidden text-white`} style={{ '--workspace-accent': workspace.accent, '--workspace-glow': workspace.glow } as CSSProperties}>
      <div className="workspace-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        <button onClick={() => navigate('/')} className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3.5 py-2 text-xs font-medium text-white/65 transition hover:border-white/20 hover:text-white">
          <ArrowLeft size={15}/> Central de aplicativos
        </button>

        <section className="workspace-hero relative overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-9 lg:p-11">
          <div className="workspace-hero-orbit" aria-hidden="true"><span/><span/><span/></div>
          <div className="relative z-10 max-w-3xl">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[.24em]" style={{color:workspace.accent}}>
              <span className="h-1.5 w-1.5 rounded-full" style={{background:workspace.accent}}/>
              {workspace.eyebrow}
            </p>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/[.07] backdrop-blur-xl">
                <HeroIcon size={23} style={{color:workspace.accent}}/>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/35">MMV / CREATIVE</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl lg:text-6xl">{workspace.title}</h1>
            <p className="mt-3 text-base font-medium text-white/80 sm:text-lg">{workspace.subtitle}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">{workspace.intro}</p>
          </div>
          <div className="workspace-hero-caption"><span>WORKSPACE</span><span>MMV — {slug.toUpperCase()}</span></div>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold tracking-[.22em]" style={{color:workspace.accent}}>SEU AMBIENTE</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Aplicativos</h2>
            </div>
            <span className="text-[11px] text-white/35">{workspace.cards.length} espaços</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspace.cards.map((card, index) => {
              const Icon = card.icon;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="workspace-app-icon"><Icon size={21}/></span>
                    <span className={`workspace-status ${card.status === 'Disponível' ? 'is-ready' : ''}`}>{card.status}</span>
                  </div>
                  <div className="mt-7">
                    <h3 className="text-lg font-semibold tracking-tight text-white">{card.title}</h3>
                    <p className="mt-2 min-h-[44px] text-[12px] leading-6 text-white/48">{card.description}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-white/[.08] pt-3 text-[10px] font-semibold uppercase tracking-[.13em] text-white/35">
                    <span>{card.route ? 'Acessar aplicativo' : 'Estrutura planejada'}</span>
                    {card.route ? <ArrowUpRight size={15}/> : <Clock3 size={14}/>}
                  </div>
                </>
              );
              return card.route ? (
                <Link key={card.title} to={card.route} className="workspace-app-card group" style={{animationDelay:`${index*70}ms`}}>{content}</Link>
              ) : (
                <article key={card.title} className="workspace-app-card workspace-app-card--planned" style={{animationDelay:`${index*70}ms`}}>{content}</article>
              );
            })}
          </div>
        </section>
        <div className="mt-9 flex items-center gap-2 border-t border-white/[.08] pt-5 text-[10px] tracking-[.12em] text-white/25">
          <Sparkles size={13} style={{color:workspace.accent}}/> CADA AMBIENTE, UMA EXPERIÊNCIA. UMA SÓ MMV CREATIVE.
        </div>
      </div>
    </main>
  );
}
