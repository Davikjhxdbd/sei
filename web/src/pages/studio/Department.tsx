import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2,
  CircleDashed, Clock3, FolderKanban, Users
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import type { CSSProperties } from 'react';

type DepartmentData = {
  department: { name: string; description: string | null };
  areas: { id: string; name: string; slug: string; tasks_count: number; open_tasks: number }[];
  members: { id: string; full_name: string; function: string | null }[];
  tasks: {
    id: string; title: string; status: string; due_date: string | null;
    area_name: string; area_slug: string; assignee_name: string | null;
  }[];
  totals: { tasks: number; open: number; published: number };
};

const departmentThemes: Record<string, { accent: string; glow: string; descriptor: string }> = {
  transmissao: { accent: '#B8CBE0', glow: 'rgba(96,132,174,.20)', descriptor: 'OPERAÇÃO TÉCNICA · AO VIVO' },
  slide: { accent: '#B8CBE0', glow: 'rgba(96,132,174,.20)', descriptor: 'CONTEÚDO VISUAL · PROJEÇÃO' },
  audiovisual: { accent: '#B8CBE0', glow: 'rgba(96,132,174,.20)', descriptor: 'CAPTAÇÃO · EDIÇÃO · FINALIZAÇÃO' },
  fotos: { accent: '#B8CBE0', glow: 'rgba(96,132,174,.20)', descriptor: 'FOTOGRAFIA · TRATAMENTO · ENTREGA' },
  design: { accent: '#B8CBE0', glow: 'rgba(96,132,174,.20)', descriptor: 'DIREÇÃO DE ARTE · CRIAÇÃO VISUAL' },
};

const statusLabels: Record<string, string> = {
  planning: 'Planejamento',
  recording: 'Captação',
  editing: 'Em execução',
  review: 'Em revisão',
  published: 'Concluída'
};

export default function Department() {
  const { slug = '' } = useParams();
  const { data, loading, error } = useApi<DepartmentData>(
    slug ? `/studio/departments/${slug}` : null,
    [slug]
  );

  if (loading) return <div className="p-8 text-sm text-white/50">Carregando departamento...</div>;
  if (error || !data) return (
    <div className="space-y-4 p-8">
      <p className="text-sm text-red-300">{error || 'Departamento não encontrado.'}</p>
      <Link to="/ambiente/producao" className="text-sm text-[#C4A66A]">Voltar à Produção Criativa</Link>
    </div>
  );

  const { department, areas, members, tasks, totals } = data;
  const theme = departmentThemes[slug] ?? departmentThemes.audiovisual;
  const themeStyle = { '--department-accent': theme.accent, '--department-glow': theme.glow } as CSSProperties;

  return (
    <div className="mx-auto max-w-[1450px] space-y-7 p-5 pb-12 sm:p-8" style={themeStyle}>
      <Link to="/ambiente/producao" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
        <ArrowLeft size={15} /> Produção Criativa
      </Link>

      <header className="rounded-2xl border p-6 sm:p-9" style={{ borderColor: `${theme.accent}35`, background: `radial-gradient(ellipse at 88% 0%, ${theme.glow}, transparent 44%), linear-gradient(135deg,#1c1b18,#101010)` }}>
        <p className="text-[10px] font-semibold uppercase tracking-[.28em]" style={{ color: theme.accent }}>MMV CREATIVE / {theme.descriptor}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{department.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/45">{department.description || 'Ambiente de trabalho do departamento.'}</p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tarefas totais', value: totals?.tasks ?? 0, icon: FolderKanban },
            { label: 'Em andamento', value: totals?.open ?? 0, icon: Clock3 },
            { label: 'Concluídas', value: totals?.published ?? 0, icon: CheckCircle2 },
            { label: 'Pessoas', value: members.length, icon: Users }
          ].map(item => {
            const Icon = item.icon;
            return <div key={item.label} className="rounded-xl border border-white/[.07] bg-black/20 p-4">
              <Icon size={17} style={{ color: theme.accent }} />
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-[10px] text-white/40">{item.label}</p>
            </div>;
          })}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Fluxo de trabalho</h2>
                <p className="mt-1 text-xs text-white/40">Demandas vinculadas a este departamento</p>
              </div>
              <Link to="/m/studio/production" className="text-xs hover:text-white" style={{ color: theme.accent }}>Central de produção <ArrowUpRight className="inline" size={13} /></Link>
            </div>
            {tasks.length === 0 ? <p className="py-8 text-center text-sm text-white/35">Nenhuma tarefa cadastrada neste departamento.</p> :
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="mt-1 text-[11px] text-white/40">{task.area_name}{task.assignee_name ? ` · ${task.assignee_name}` : ''}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px]" style={{ color: theme.accent }}>{statusLabels[task.status] || task.status}</span>
                    </div>
                    {task.due_date && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/35"><CalendarDays size={12} /> Prazo: {new Date(`${task.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</p>}
                  </div>
                ))}
              </div>
            }
          </div>

          <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5">
            <h2 className="font-semibold text-white">Áreas e projetos</h2>
            <p className="mb-4 mt-1 text-xs text-white/40">Frentes de trabalho deste departamento</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {areas.map(area => <Link key={area.id} to={`/m/studio/production/${area.slug}`} className="rounded-xl border bg-black/20 p-4 transition" style={{ borderColor: `${theme.accent}25` }}>
                <p className="text-sm font-medium text-white">{area.name}</p>
                <p className="mt-2 text-[11px] text-white/40">{area.tasks_count} tarefas · {area.open_tasks} em aberto</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px]" style={{ color: theme.accent }}>Abrir área <ArrowUpRight size={12} /></span>
              </Link>)}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Equipe</h2>
              <p className="mt-1 text-xs text-white/40">Pessoas vinculadas ao departamento</p>
            </div>
            <Users size={18} style={{ color: theme.accent }} />
          </div>
          {members.length === 0 ? <p className="py-8 text-center text-sm text-white/35">Equipe ainda não cadastrada.</p> :
            <div className="space-y-3">
              {members.map(member => <div key={member.id} className="flex items-center gap-3 border-b border-white/[.06] pb-3 last:border-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: `${theme.accent}18`, color: theme.accent }}>
                  {member.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{member.full_name}</p>
                  <p className="text-[11px] text-white/40">{member.function || 'Integrante'}</p>
                </div>
              </div>)}
            </div>
          }
          <div className="mt-6 border-t border-white/[.07] pt-5">
            <Link to="/m/studio/schedules" className="flex items-center justify-between text-xs text-white/55 hover:text-[#D8BD86]">Consultar escalas <ArrowUpRight size={14} /></Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
