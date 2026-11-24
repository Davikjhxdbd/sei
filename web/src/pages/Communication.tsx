import { useMemo, useState } from 'react';
import { Bell, Megaphone, Plus, Search, Send, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, PageHeader, Textarea } from '../components/ui';
import { Modal } from '../components/ui';
import { useApi } from '../lib/useApi';
import { post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { formatDateTime } from '../lib/format';

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'important' | 'urgent';
  published_at: string;
  author_name: string;
  is_read: boolean;
}

const priorityLabel = { normal: 'Comunicado', important: 'Importante', urgent: 'Urgente' };
const priorityTone = { normal: 'neutral', important: 'warning', urgent: 'danger' } as const;

export default function Communication() {
  const { level } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useApi<{ items: Announcement[]; total: number; unread: number }>('/communication/announcements');

  const items = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return (data?.items ?? []).filter((item) =>
      !term || item.title.toLocaleLowerCase('pt-BR').includes(term)
      || item.body.toLocaleLowerCase('pt-BR').includes(term)
      || item.author_name.toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [data, query]);

  async function publish() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await post('/communication/announcements', { title, body, priority });
      setTitle('');
      setBody('');
      setPriority('normal');
      setModal(false);
      reload();
      toast.push('Comunicado publicado e equipe notificada.');
    } catch (err: any) {
      toast.push(err?.message ?? 'Não foi possível publicar o comunicado.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function markRead(item: Announcement) {
    if (item.is_read) return;
    try {
      await post(`/communication/announcements/${item.id}/read`);
      reload();
    } catch (err: any) {
      toast.push(err?.message ?? 'Não foi possível atualizar a leitura.', 'error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="MMV CREATIVE · COMUNICAÇÃO"
        title="Comunicação"
        description="Comunicados oficiais, orientações e avisos importantes para toda a equipe."
        actions={level >= 4 ? <Button icon={Plus} onClick={() => setModal(true)}>Novo comunicado</Button> : undefined}
      />
      <div className="mmv-directory-toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos comunicados…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{data?.total ?? 0} publicados</Badge>
          <Badge tone="warning">{data?.unread ?? 0} não lidos</Badge>
        </div>
      </div>

      {loading ? <LoadingBlock /> : error ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-ink">Não foi possível carregar os comunicados.</p>
          <Button className="mt-3" variant="secondary" onClick={reload}>Tentar novamente</Button>
        </Card>
      ) : items.length ? (
        <div className="mmv-announcement-list space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={`mmv-announcement-card p-5 transition-colors ${item.is_read ? '' : 'is-unread border-brass/35 bg-brass/[0.025]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brass/20 bg-brass/[0.08] text-brass-deep">
                    {item.priority === 'urgent' ? <ShieldAlert className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[14px] font-semibold text-ink">{item.title}</h2>
                      <Badge tone={priorityTone[item.priority]}>{priorityLabel[item.priority]}</Badge>
                      {!item.is_read && <Badge tone="accent">Novo</Badge>}
                    </div>
                    <p className="mt-1 text-[11.5px] text-muted">{item.author_name} · {formatDateTime(item.published_at)}</p>
                  </div>
                </div>
                {!item.is_read && <Button size="sm" variant="ghost" onClick={() => void markRead(item)}>Marcar como lido</Button>}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-[13px] leading-7 text-ink/80">{item.body}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={Bell} title={query ? 'Nenhum resultado' : 'Nenhum comunicado publicado'} description={query ? 'Tente buscar por outro termo.' : 'Os comunicados oficiais aparecerão aqui.'} /></Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Novo comunicado" description="A publicação será exibida para todos os integrantes ativos e gerará uma notificação.">
        <div className="space-y-4">
          <label className="block text-xs font-medium text-ink">Título
            <Input className="mt-1.5" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Assunto do comunicado" />
          </label>
          <label className="block text-xs font-medium text-ink">Mensagem
            <Textarea className="mt-1.5 min-h-40" value={body} onChange={(event) => setBody(event.target.value)} maxLength={12000} placeholder="Escreva a orientação ou o aviso institucional…" />
          </label>
          <label className="block text-xs font-medium text-ink">Prioridade
            <select className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
              <option value="normal">Comunicado</option>
              <option value="important">Importante</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button icon={Send} loading={saving} disabled={!title.trim() || !body.trim()} onClick={() => void publish()}>Publicar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
