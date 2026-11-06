import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { patch, post } from '../../lib/api';
import { REPORT_STATUS, formatDateTime, formatDayLabel } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  StatusBadge,
  Textarea,
  cx,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Section {
  id: string;
  title: string;
  content: string | null;
  not_applicable: boolean;
  author_name: string | null;
  updated_at: string;
}

interface Payload {
  report: {
    id: string;
    title: string;
    status: string;
    event_id: string;
    event_name: string;
    starts_at: string;
    created_by_name: string | null;
    finalized_by_name: string | null;
    finalized_at: string | null;
    updated_at: string;
  };
  sections: Section[];
  history: {
    id: string;
    action: string;
    from_status: string | null;
    to_status: string | null;
    notes: string | null;
    created_at: string;
    user_name: string | null;
  }[];
}

const HISTORY_LABELS: Record<string, string> = {
  'report.created': 'Relatório criado',
  'report.submitted': 'Enviado para revisão',
  'report.finalized': 'Finalizado',
  'report.reopened': 'Reaberto',
};

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { data, loading, reload } = useApi<Payload>(`/studio/reports/${id}`);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !data) return <LoadingBlock label="Carregando relatório…" />;

  const { report, sections, history } = data;
  const locked = report.status === 'finalized' && !can('reports.reopen');

  async function saveSection(section: Section) {
    setSavingSection(section.id);
    try {
      await patch(`/studio/reports/${report.id}/sections/${section.id}`, {
        content: drafts[section.id] ?? section.content ?? '',
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[section.id];
        return next;
      });
      await reload();
      toast.push('Seção salva.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar a seção.', 'error');
    } finally {
      setSavingSection(null);
    }
  }

  async function toggleNotApplicable(section: Section) {
    try {
      await patch(`/studio/reports/${report.id}/sections/${section.id}`, {
        not_applicable: !section.not_applicable,
      });
      await reload();
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível alterar.', 'error');
    }
  }

  async function changeStatus(target: string, notes?: string) {
    setBusy(true);
    try {
      await post(`/studio/reports/${report.id}/status`, { status: target, notes });
      setReopenOpen(false);
      setReason('');
      await reload();
      toast.push('Situação do relatório atualizada.');
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível alterar a situação.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/m/studio/reports')}
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Relatórios
      </button>

      <PageHeader
        eyebrow={`${report.event_name} · ${formatDayLabel(report.starts_at)}`}
        title={report.title}
        description={`Autor: ${report.created_by_name ?? '—'} · atualizado em ${formatDateTime(report.updated_at)}`}
        actions={
          <>
            <StatusBadge map={REPORT_STATUS} value={report.status} />
            <Link
              to={`/m/studio/events/${report.event_id}`}
              className="inline-flex h-8 items-center rounded-lg border border-line bg-surface px-3 text-[12px] font-medium text-ink hover:border-ink/30"
            >
              Ver evento
            </Link>
            {report.status === 'draft' && can('reports.create') && (
              <Button
                size="sm"
                icon={Send}
                loading={busy}
                onClick={() => changeStatus('in_review')}
              >
                Enviar para revisão
              </Button>
            )}
            {report.status === 'in_review' && can('reports.finalize') && (
              <Button
                size="sm"
                icon={CheckCheck}
                loading={busy}
                onClick={() => changeStatus('finalized')}
              >
                Finalizar
              </Button>
            )}
            {report.status === 'finalized' && can('reports.reopen') && (
              <Button
                size="sm"
                variant="secondary"
                icon={RotateCcw}
                onClick={() => setReopenOpen(true)}
              >
                Reabrir
              </Button>
            )}
          </>
        }
      />

      {report.status === 'finalized' && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-900">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Relatório finalizado por {report.finalized_by_name ?? '—'} em{' '}
            {formatDateTime(report.finalized_at)}. Alterações exigem reabertura com
            justificativa e ficam registradas na auditoria.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {sections.map((section, index) => {
            const value = drafts[section.id] ?? section.content ?? '';
            const dirty = drafts[section.id] !== undefined && drafts[section.id] !== (section.content ?? '');
            return (
              <Card key={section.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-3">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider2 text-muted">
                      Seção {index + 1}
                    </p>
                    <h2 className="text-[14px] font-semibold text-ink">{section.title}</h2>
                    <p className="text-[11px] text-muted">
                      {section.author_name
                        ? `${section.author_name} · ${formatDateTime(section.updated_at)}`
                        : 'ainda não preenchida'}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={section.not_applicable}
                      disabled={locked}
                      onChange={() => toggleNotApplicable(section)}
                      className="h-3.5 w-3.5 accent-ink"
                    />
                    não aplicável
                  </label>
                </div>
                <div className="p-5">
                  {section.not_applicable ? (
                    <p className="rounded-lg bg-canvas px-3 py-6 text-center text-[12.5px] text-muted">
                      Seção marcada como não aplicável a este evento.
                    </p>
                  ) : (
                    <>
                      <Textarea
                        value={value}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [section.id]: event.target.value,
                          }))
                        }
                        rows={5}
                        disabled={locked}
                        placeholder="Registre o conteúdo desta seção…"
                        className={cx(locked && 'bg-canvas')}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={dirty ? 'primary' : 'secondary'}
                          disabled={!dirty}
                          loading={savingSection === section.id}
                          onClick={() => saveSection(section)}
                        >
                          Salvar seção
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={FileText}
              title="Histórico do relatório"
              description="Autoria e revisões preservadas."
            />
            {history.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-muted">
                Nenhum evento registrado.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-ink">
                      {HISTORY_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {entry.user_name ?? 'sistema'} ·{' '}
                      {formatDateTime(entry.created_at)}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 rounded bg-canvas px-2 py-1 text-[11.5px] italic text-ink/70">
                        {entry.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="mmv-label mb-2">Fluxo</p>
            <ol className="space-y-2 text-[12.5px]">
              {[
                { key: 'draft', label: 'Rascunho', hint: 'Preenchimento das seções' },
                { key: 'in_review', label: 'Em revisão', hint: 'Revisão pela liderança' },
                { key: 'finalized', label: 'Finalizado', hint: 'Somente leitura' },
              ].map((step) => {
                const active = report.status === step.key;
                return (
                  <li key={step.key} className="flex items-center gap-2">
                    <span
                      className={cx(
                        'grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold',
                        active ? 'bg-strong text-white' : 'bg-ink/[0.06] text-muted',
                      )}
                    >
                      {active ? '•' : ''}
                    </span>
                    <span className={active ? 'font-medium text-ink' : 'text-muted'}>
                      {step.label}
                      <span className="block text-[11px] text-muted">{step.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>

      <Modal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title="Reabrir relatório"
        description="A justificativa é obrigatória e fica registrada na auditoria."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setReopenOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={busy}
              disabled={!reason.trim()}
              onClick={() => changeStatus('draft', reason)}
            >
              Reabrir relatório
            </Button>
          </>
        }
      >
        <Field label="Justificativa" required>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
        </Field>
      </Modal>
    </div>
  );
}
