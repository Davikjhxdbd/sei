import { useState } from 'react';
import { Pencil, Plus, Users2 } from 'lucide-react';
import { Shell } from '../../components/layout/Shell';
import { useApi } from '../../lib/useApi';
import { patch, post } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Textarea,
} from '../../components/ui';
import { RecordList, type Column } from '../../components/RecordList';
import { useToast } from '../../components/Toast';

interface SectorRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  active: boolean;
  member_count: number;
}

export default function SectorsPage() {
  const { data, loading, reload } = useApi<{ items: SectorRow[] }>('/admin/sectors');
  const toast = useToast();
  const [editing, setEditing] = useState<SectorRow | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [initialized, setInitialized] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const key = editing === 'new' ? 'new' : (editing?.id ?? null);
  if (key !== initialized) {
    setInitialized(key);
    if (editing && editing !== 'new') {
      setName(editing.name);
      setDescription(editing.description ?? '');
      setActive(editing.active);
    } else {
      setName('');
      setDescription('');
      setActive(true);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (editing === 'new') {
        await post('/admin/sectors', { name, description, active });
      } else if (editing) {
        await patch(`/admin/sectors/${editing.id}`, { name, description, active });
      }
      await reload();
      setEditing(null);
      toast.push('Setor salvo.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar o setor.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<SectorRow>[] = [
    {
      key: 'name',
      header: 'Setor',
      primary: true,
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.name}</p>
          <p className="font-mono text-[11px] text-muted">{row.key}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      mobileHidden: true,
      render: (row) => (
        <span className="text-[12.5px] text-muted">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'members',
      header: 'Pessoas',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/70">
          <Users2 className="h-3.5 w-3.5 text-muted" /> {row.member_count}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Situação',
      render: (row) => (
        <Badge tone={row.active ? 'success' : 'neutral'}>
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={Pencil}
          onClick={(event) => {
            event.stopPropagation();
            setEditing(row);
          }}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Setores"
        description="Estrutura compartilhada por todos os aplicativos. A associação de pessoas aos setores define escopo de atuação e liderança."
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Novo setor
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <RecordList
          items={data?.items ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => setEditing(row)}
          emptyTitle="Nenhum setor cadastrado"
          emptyDescription="Setores organizam pessoas e escopos de permissão."
        />
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo setor' : 'Editar setor'}
        description="A chave técnica é gerada automaticamente a partir do nome."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} disabled={!name.trim()} onClick={save}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12.5px] text-ink/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#0E1A2B]"
            />
            Setor ativo (aparece nas listas de associação)
          </label>
        </div>
      </Modal>
    </Shell>
  );
}
