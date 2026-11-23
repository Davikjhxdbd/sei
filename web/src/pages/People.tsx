import { useMemo, useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import { Avatar, Badge, Card, LoadingBlock, PageHeader, SearchInput } from '../components/ui';
import { useApi } from '../lib/useApi';

interface Person {
  id: string;
  full_name: string;
  username: string | null;
  sectors: { id: string; name: string }[];
}

export default function People() {
  const { data, loading, error, reload } = useApi<{ items: Person[] }>('/catalog/people');
  const [query, setQuery] = useState('');
  const people = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return (data?.items ?? []).filter((person) =>
      !term || person.full_name.toLocaleLowerCase('pt-BR').includes(term)
      || person.sectors.some((sector) => sector.name.toLocaleLowerCase('pt-BR').includes(term)),
    );
  }, [data, query]);

  return (
    <>
      <PageHeader
        eyebrow="MMV CREATIVE · PESSOAS"
        title="Pessoas"
        description="Diretório institucional dos integrantes ativos e suas equipes."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar pessoa ou departamento…" className="w-full sm:max-w-sm" />
        <Badge tone="accent">{people.length} {people.length === 1 ? 'integrante' : 'integrantes'}</Badge>
      </div>
      {loading ? <LoadingBlock /> : error ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-ink">Não foi possível carregar o diretório.</p>
          <button type="button" onClick={() => void reload()} className="mt-3 text-sm font-semibold text-brass-deep">Tentar novamente</button>
        </Card>
      ) : people.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <Card key={person.id} className="flex min-w-0 items-center gap-3 p-4">
              <Avatar name={person.full_name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{person.full_name}</p>
                {person.username && <p className="mt-0.5 truncate text-[11px] text-muted">@{person.username}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {person.sectors.length ? person.sectors.map((sector) => (
                    <Badge key={sector.id}><Building2 className="h-3 w-3" />{sector.name}</Badge>
                  )) : <span className="text-[11px] text-muted">Sem departamento vinculado</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm font-semibold text-ink">{query ? 'Nenhuma pessoa encontrada' : 'Nenhum integrante cadastrado'}</p>
          <p className="mt-1 text-xs text-muted">{query ? 'Tente outro nome ou departamento.' : 'Os integrantes ativos aparecerão aqui.'}</p>
        </Card>
      )}
    </>
  );
}
