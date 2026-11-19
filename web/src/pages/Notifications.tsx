import { useNavigate } from 'react-router-dom';
import { BellRing, CheckCheck } from 'lucide-react';
import { Shell } from '../components/layout/Shell';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { Button, EmptyState, LoadingBlock, PageHeader, cx } from '../components/ui';
import { useToast } from '../components/Toast';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  module_key: string | null;
  read_at: string | null;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();
  const { data, loading, reload: reloadList } = useApi<{
    items: NotificationItem[];
    unread: number;
  }>('/notifications');

  async function markAll() {
    await post('/notifications/read-all');
    await reloadList();
    await refresh();
    toast.push('Todas as notificações foram marcadas como lidas.');
  }

  async function open(item: NotificationItem) {
    if (!item.read_at) {
      await post(`/notifications/${item.id}/read`);
      await refresh();
    }
    if (item.link) navigate(item.link);
    else await reloadList();
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Plataforma"
        title="Notificações"
        description="Avisos de escalas, autorizações, relatórios e demais aplicativos da plataforma."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={CheckCheck}
            onClick={markAll}
            disabled={!data?.unread}
          >
            Marcar todas como lidas
          </Button>
        }
      />

      <div className="mmv-surface overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : !data?.items.length ? (
          <EmptyState
            icon={BellRing}
            title="Nenhuma notificação"
            description="Quando algo exigir sua atenção — uma nova escala, uma autorização ou um relatório — o aviso aparecerá aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={cx(
                    'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.025]',
                    !item.read_at && 'bg-studio-soft/40',
                  )}
                >
                  <span
                    className={cx(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      item.read_at ? 'bg-transparent' : 'bg-studio',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span
                        className={cx(
                          'text-[13.5px]',
                          item.read_at ? 'text-ink/70' : 'font-medium text-ink',
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="text-[11px] text-muted">
                        {formatDateTime(item.created_at)}
                      </span>
                    </span>
                    {item.body && (
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                        {item.body}
                      </span>
                    )}
                    {item.module_key && (
                      <span className="mt-1 inline-block rounded bg-ink/[0.05] px-1.5 py-0.5 text-[10px] uppercase tracking-wider2 text-muted">
                        {item.module_key}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
