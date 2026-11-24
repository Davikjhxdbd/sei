import { useMemo, useState } from 'react';
import { Building2, Users2 } from 'lucide-react';
import { Badge, Card, LoadingBlock, PageHeader, SearchInput } from '../components/ui';
import { useApi } from '../lib/useApi';

interface Department {
  id: string;
  key: string;
  name: string;
  description: string | null;
  member_count: number;
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
        description="Conheça as equipes, suas áreas de atuação e a composição institucional."
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
        <div className="mmv-department-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <Card key={department.id} className="mmv-department-card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="mmv-department-icon grid h-10 w-10 place-items-center rounded-xl border border-brass/20 bg-brass/[0.08] text-brass-deep"><Building2 className="h-5 w-5" /></span>
                <Badge tone="success">Ativo</Badge>
              </div>
              <h2 className="mt-4 text-base font-semibold text-ink">{department.name}</h2>
              <p className="mt-1 min-h-10 text-[12.5px] leading-relaxed text-muted">{department.description || 'Departamento institucional.'}</p>
              <div className="mmv-department-members mt-4 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
                <Users2 className="h-4 w-4" /> {department.member_count} {department.member_count === 1 ? 'integrante ativo' : 'integrantes ativos'}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mmv-directory-state-card p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm font-semibold text-ink">{query ? 'Nenhum departamento encontrado' : 'Nenhum departamento cadastrado'}</p>
          <p className="mt-1 text-xs text-muted">Os departamentos ativos aparecerão aqui.</p>
        </Card>
      )}
    </>
  );
}
