import { useMemo, useState } from 'react';
import { Building2, Users2, Camera, Clapperboard, Palette, RadioTower, Presentation, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Badge, Card, LoadingBlock, PageHeader, SearchInput } from '../components/ui';
import { useApi } from '../lib/useApi';

interface Department {
  id: string;
  key: string;
  name: string;
  description: string | null;
  member_count: number;
}

type DepartmentVisual = {
  icon: LucideIcon;
  code: string;
  focus: string;
  accent: string;
  glow: string;
};

const VISUALS: Record<string, DepartmentVisual> = {
  'transmissão': { icon: RadioTower, code: 'LIVE / 01', focus: 'OPERAÇÃO AO VIVO', accent: '#83B7B0', glow: 'rgba(91,170,158,.16)' },
  'transmissao': { icon: RadioTower, code: 'LIVE / 01', focus: 'OPERAÇÃO AO VIVO', accent: '#83B7B0', glow: 'rgba(91,170,158,.16)' },
  'slide': { icon: Presentation, code: 'STAGE / 02', focus: 'CONTEÚDO DE PROJEÇÃO', accent: '#A6A8E8', glow: 'rgba(130,133,220,.16)' },
  'audiovisual': { icon: Clapperboard, code: 'MOTION / 03', focus: 'CAPTAÇÃO E EDIÇÃO', accent: '#D5AD70', glow: 'rgba(196,145,76,.18)' },
  'fotos': { icon: Camera, code: 'FRAME / 04', focus: 'FOTOGRAFIA E TRATAMENTO', accent: '#C49CCB', glow: 'rgba(173,118,190,.16)' },
  'fotografia': { icon: Camera, code: 'FRAME / 04', focus: 'FOTOGRAFIA E TRATAMENTO', accent: '#C49CCB', glow: 'rgba(173,118,190,.16)' },
  'design': { icon: Palette, code: 'FORM / 05', focus: 'IDENTIDADE E CRIAÇÃO', accent: '#D58E82', glow: 'rgba(199,117,103,.16)' },
};

const DEFAULT_VISUAL: DepartmentVisual = {
  icon: Building2, code: 'TEAM / 00', focus: 'EQUIPE INSTITUCIONAL', accent: '#C4A66A', glow: 'rgba(196,166,106,.12)',
};

function visualFor(name: string) {
  return VISUALS[name.trim().toLocaleLowerCase('pt-BR')] ?? DEFAULT_VISUAL;
}

export default function Departments() {
  const { data, loading, error, reload } = useApi<{ items: Department[] }>('/catalog/sectors');
  const [query, setQuery] = useState('');
  const departments = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return (data?.items ?? []).filter((item) =>
      !term || item.name.toLocaleLowerCase('pt-BR').includes(term)
      || (item.description ?? '').toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [data, query]);

  return (
    <>
      <PageHeader
        eyebrow="MMV CREATIVE · ESTRUTURA"
        title="Departamentos"
        description="Cada equipe tem sua própria linguagem, especialidade e rotina de trabalho."
      />
      <div className="mmv-directory-toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar departamento…" className="w-full sm:max-w-sm" />
        <Badge tone="accent">{departments.length} {departments.length === 1 ? 'departamento' : 'departamentos'}</Badge>
      </div>
      {loading ? <LoadingBlock /> : error ? (
        <Card className="mmv-directory-state-card p-6 text-center">
          <p className="text-sm font-medium text-ink">Não foi possível carregar os departamentos.</p>
          <button type="button" onClick={() => void reload()} className="mt-3 text-sm font-semibold text-brass-deep">Tentar novamente</button>
        </Card>
      ) : departments.length ? (
        <div className="mmv-department-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const visual = visualFor(department.name);
            const Icon = visual.icon;
            return (
              <Card
                key={department.id}
                className="mmv-sector-card group relative min-w-0 overflow-hidden p-0"
                style={{ '--sector-accent': visual.accent, '--sector-glow': visual.glow } as React.CSSProperties}
              >
                <div className="mmv-sector-card-art relative flex h-28 items-start justify-between overflow-hidden px-5 pt-4">
                  <span className="relative z-10 text-[9px] font-semibold tracking-[.22em] text-white/55">{visual.code}</span>
                  <span className="mmv-sector-orbit" aria-hidden="true" />
                  <span className="mmv-sector-symbol relative z-10 grid h-11 w-11 place-items-center rounded-2xl">
                    <Icon className="h-5 w-5" strokeWidth={1.55} />
                  </span>
                  <span className="mmv-sector-watermark" aria-hidden="true"><Icon /></span>
                </div>
                <div className="relative px-5 pb-5 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-semibold tracking-[.17em]" style={{ color: visual.accent }}>{visual.focus}</span>
                    <Badge tone="success">Ativo</Badge>
                  </div>
                  <h2 className="mt-2 text-[19px] font-semibold tracking-[-.035em] text-ink">{department.name}</h2>
                  <p className="mt-1 min-h-10 text-[12px] leading-relaxed text-muted">{department.description || 'Equipe e operações do departamento.'}</p>
                  <div className="mmv-sector-card-footer mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="flex items-center gap-2 text-[11px] text-muted"><Users2 className="h-3.5 w-3.5" />{department.member_count} {department.member_count === 1 ? 'integrante' : 'integrantes'}</span>
                    <span className="mmv-sector-detail flex items-center gap-1 text-[10px] font-semibold tracking-[.08em]">EQUIPE <ArrowUpRight className="h-3 w-3" /></span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mmv-directory-state-card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm font-semibold text-ink">{query ? 'Nenhum departamento encontrado' : 'Nenhum integrante cadastrado'}</p>
          <p className="mt-1 text-xs text-muted">{query ? 'Tente outro nome ou departamento.' : 'Os departamentos ativos aparecerão aqui.'}</p>
        </Card>
      )}
    </>
  );
}
