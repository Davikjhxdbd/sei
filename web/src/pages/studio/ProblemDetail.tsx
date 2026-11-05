import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Layers,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { patch, post } from '../../lib/api';
import {
  AUTHORIZATION_STATUS,
  PROBLEM_STATUS,
  SEVERITY,
  formatDate,
  formatDateTime,
} from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  cx,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Payload {
  problem: {
    id: string;
    code: string;
    title: string;
    description: string;
    identified_at: string;
    identified_by: string | null;
    identified_by_name: string | null;
    sector_name: string | null;
    event_id: string | null;
    event_name: string | null;
    category: string | null;
    impact: string | null;
    urgency: string;
    priority: string;
    status: string;
    owner_id: string | null;
    owner_name: string | null;
    root_cause: string | null;
    cause_confirmed_by_name: string | null;
    cause_confirmed_at: string | null;
    resolution_due: string | null;
    final_result: string | null;
    created_at: string;
  };
  updates: {
    id: string;
    kind: string;
    body: string;
    from_status: string | null;
    to_status: string | null;
    created_at: string;
    user_name: string | null;
  }[];
  solutions: {
    id: string;
    description: string;
    rationale: string | null;
    resources: string | null;
    risks: string | null;
    expected_effects: string | null;
    executors: string | null;
    test_method: string | null;
    success_criteria: string | null;
    rollback_plan: string | null;
    requires_authorization: boolean;
    created_at: string;
    created_by_name: string | null;
  }[];
  authorizations: {
    id: string;
    scope: string;
    status: string;
    due_at: string | null;
    created_at: string;
    requested_by: string | null;
    requested_by_name: string | null;
    decided_by_name: string | null;
    decision_note: string | null;
    decided_at: string | null;
    solution_description: string | null;
    deciders: string[];
  }[];
  relatedErrors: {
    id: string;
    description: string;
    severity: string;
    status: string;
    occurred_at: string;
  }[];
}

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can, user, level } = useAuth();
  const { data, loading, reload } = useApi<Payload>(`/studio/problems/${id}`);
  const people = useApi<{ items: { id: string; full_name: string }[] }>('/catalog/people');

  const [comment, setComment] = useState('');
  const [causeDraft, setCauseDraft] = useState('');
  const [resultDraft, setResultDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solution, setSolution] = useState({
    description: '',
    rationale: '',
    resources: '',
    risks: '',
    expected_effects: '',
    executors: '',
    test_method: '',
    success_criteria: '',
    rollback_plan: '',
    requires_authorization: true,
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [authScope, setAuthScope] = useState('');
  const [authSolution, setAuthSolution] = useState('');
  const [authDue, setAuthDue] = useState('');
  const [deciders, setDeciders] = useState<string[]>([]);

  const [decision, setDecision] = useState<{ id: string; type: 'approved' | 'rejected' } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  if (loading || !data) return <LoadingBlock label="Carregando problema…" />;
  const { problem } = data;

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      await reload();
      toast.push(message);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível concluir.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/m/studio/problems')}
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Problemas
      </button>

      <PageHeader
        eyebrow={`${problem.code} · identificado em ${formatDate(problem.identified_at)}`}
        title={problem.title}
        description={problem.impact ?? undefined}
        actions={
          <>
            <StatusBadge map={SEVERITY} value={problem.priority} />
            <StatusBadge map={PROBLEM_STATUS} value={problem.status} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mmv-label mb-2">Descrição</p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink/85">
              {problem.description}
            </p>
          </Card>

          <Card>
            <CardHeader
              icon={CheckCircle2}
              title="Causa confirmada"
              description="Enquanto a causa não é confirmada, o problema permanece em análise."
              action={
                problem.cause_confirmed_at && (
                  <Badge tone="success">
                    {problem.cause_confirmed_by_name} ·{' '}
                    {formatDateTime(problem.cause_confirmed_at)}
                  </Badge>
                )
              }
            />
            <div className="p-5">
              {can('problems.edit') ? (
                <>
                  <Textarea
                    value={causeDraft || problem.root_cause || ''}
                    onChange={(event) => setCauseDraft(event.target.value)}
                    rows={3}
                    placeholder="Descreva a causa confirmada após a investigação"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!causeDraft.trim() || causeDraft === problem.root_cause}
                      loading={busy}
                      onClick={() =>
                        run(
                          () => patch(`/studio/problems/${problem.id}`, { root_cause: causeDraft }),
                          'Causa registrada.',
                        )
                      }
                    >
                      Confirmar causa
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[12.5px] text-muted">
                  {problem.root_cause ?? 'Causa ainda não confirmada.'}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={Layers}
              title="Soluções propostas"
              description="Cada solução registra justificativa, riscos, teste e plano de reversão."
              action={
                can('problems.edit') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => setSolutionOpen(true)}
                  >
                    Nova solução
                  </Button>
                )
              }
            />
            {data.solutions.length === 0 ? (
              <p className="px-5 py-5 text-[12.5px] text-muted">
                Nenhuma solução proposta para este problema.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.solutions.map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink">
                        {item.description}
                      </p>
                      {item.requires_authorization && (
                        <Badge tone="accent">exige autorização</Badge>
                      )}
                    </div>
                    <dl className="mt-2 grid gap-2 text-[11.5px] sm:grid-cols-2">
                      {[
                        ['Justificativa', item.rationale],
                        ['Recursos', item.resources],
                        ['Riscos', item.risks],
                        ['Efeitos esperados', item.expected_effects],
                        ['Executores', item.executors],
                        ['Método de teste', item.test_method],
                        ['Critérios de sucesso', item.success_criteria],
                        ['Plano de reversão', item.rollback_plan],
                      ]
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label as string}>
                            <dt className="mmv-label">{label}</dt>
                            <dd className="mt-0.5 text-ink/75">{value}</dd>
                          </div>
                        ))}
                    </dl>
                    <p className="mt-2 text-[11px] text-muted">
                      {item.created_by_name ?? '—'} · {formatDateTime(item.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={ShieldCheck}
              title="Autorizações"
              description="Pedidos formais de autorização, com escopo, prazo e decisão registrada."
              action={
                can('problems.edit') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => {
                      setAuthSolution(data.solutions[0]?.id ?? '');
                      setAuthScope('');
                      setDeciders([]);
                      setAuthOpen(true);
                    }}
                  >
                    Solicitar autorização
                  </Button>
                )
              }
            />
            {data.authorizations.length === 0 ? (
              <p className="px-5 py-5 text-[12.5px] text-muted">
                Nenhuma solicitação registrada.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.authorizations.map((request) => {
                  const canDecide =
                    can('problems.decide') &&
                    request.status === 'pending' &&
                    (request.deciders.includes(user?.id ?? '') || level >= 5);
                  const isOwn = request.requested_by === user?.id;
                  return (
                    <li key={request.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge map={AUTHORIZATION_STATUS} value={request.status} />
                        <span className="text-[11px] text-muted">
                          solicitada em {formatDateTime(request.created_at)}
                          {request.due_at ? ` · prazo ${formatDate(request.due_at)}` : ''}
                        </span>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-ink/80">
                        {request.scope}
                      </p>
                      {request.solution_description && (
                        <p className="mt-1 text-[11.5px] text-muted">
                          Solução: {request.solution_description}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted">
                        Solicitada por {request.requested_by_name ?? '—'}
                        {request.decided_by_name
                          ? ` · decidida por ${request.decided_by_name} em ${formatDateTime(request.decided_at)}`
                          : ''}
                      </p>
                      {request.decision_note && (
                        <p className="mt-1 rounded bg-canvas px-2 py-1 text-[11.5px] italic text-ink/75">
                          {request.decision_note}
                        </p>
                      )}
                      {canDecide && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            icon={BadgeCheck}
                            onClick={() => {
                              setDecision({ id: request.id, type: 'approved' });
                              setDecisionNote('');
                            }}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={XCircle}
                            onClick={() => {
                              setDecision({ id: request.id, type: 'rejected' });
                              setDecisionNote('');
                            }}
                          >
                            Reprovar
                          </Button>
                          {isOwn && level < 5 && (
                            <span className="self-center text-[11px] text-amber-700">
                              você não decide a própria solicitação
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={MessageSquarePlus}
              title="Histórico de atualizações"
              description="Comentários e mudanças de situação em ordem cronológica inversa."
            />
            <div className="border-b border-line p-5">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                placeholder="Registrar andamento, decisão ou observação…"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={!comment.trim() || !can('problems.edit')}
                  loading={busy}
                  onClick={() =>
                    run(async () => {
                      await post(`/studio/problems/${problem.id}/updates`, { body: comment });
                      setComment('');
                    }, 'Atualização registrada.')
                  }
                >
                  Publicar
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {data.updates.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        entry.kind === 'status'
                          ? 'info'
                          : entry.kind === 'authorization'
                            ? 'accent'
                            : 'neutral'
                      }
                    >
                      {entry.kind === 'status'
                        ? `${PROBLEM_STATUS[entry.from_status ?? '']?.label ?? entry.from_status} → ${PROBLEM_STATUS[entry.to_status ?? '']?.label ?? entry.to_status}`
                        : entry.kind === 'solution'
                          ? 'solução'
                          : entry.kind === 'authorization'
                            ? 'autorização'
                            : 'comentário'}
                    </Badge>
                    <span className="text-[11px] text-muted">
                      {entry.user_name ?? 'sistema'} ·{' '}
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink/80">
                    {entry.body}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="mmv-label mb-3">Dados do problema</p>
            <dl className="space-y-2.5 text-[12.5px]">
              {[
                ['Situação', PROBLEM_STATUS[problem.status]?.label ?? problem.status],
                ['Setor', problem.sector_name ?? '—'],
                ['Evento', problem.event_name ?? '—'],
                ['Categoria', problem.category ?? '—'],
                ['Urgência', SEVERITY[problem.urgency]?.label ?? problem.urgency],
                ['Prioridade', SEVERITY[problem.priority]?.label ?? problem.priority],
                ['Responsável', problem.owner_name ?? '—'],
                ['Identificado por', problem.identified_by_name ?? '—'],
                ['Prazo da solução', problem.resolution_due ? formatDate(problem.resolution_due) : '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-ink/85">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {can('problems.edit') && (
            <Card className="p-5">
              <p className="mmv-label mb-2">Atualizar situação</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PROBLEM_STATUS).map(([value, meta]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      run(
                        () => post(`/studio/problems/${problem.id}/updates`, {
                          body: `Situação alterada para ${meta.label}.`,
                          to_status: value,
                        }),
                        'Situação atualizada.',
                      )
                    }
                    className={cx(
                      'rounded-lg border px-2 py-1.5 text-[11.5px] transition-colors',
                      problem.status === value
                        ? 'border-ink bg-ink text-white'
                        : 'border-line text-muted hover:border-ink/30 hover:text-ink',
                    )}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="mmv-label mb-2">Resultado final</p>
            {problem.final_result ? (
              <p className="text-[12.5px] leading-relaxed text-ink/80">
                {problem.final_result}
              </p>
            ) : can('problems.edit') ? (
              <>
                <Textarea
                  value={resultDraft}
                  onChange={(event) => setResultDraft(event.target.value)}
                  rows={3}
                  placeholder="Descreva o resultado após a execução da solução"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!resultDraft.trim()}
                    loading={busy}
                    onClick={() =>
                      run(
                        () => patch(`/studio/problems/${problem.id}`, {
                          final_result: resultDraft,
                          status: 'resolved',
                        }),
                        'Resultado registrado.',
                      )
                    }
                  >
                    Registrar resultado
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-muted">Ainda não registrado.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Erros vinculados" description="Registros que originaram a análise." />
            {data.relatedErrors.length === 0 ? (
              <p className="px-5 py-4 text-[12.5px] text-muted">
                Nenhum erro vinculado.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.relatedErrors.map((error) => (
                  <li key={error.id} className="px-5 py-3">
                    <p className="text-[12.5px] text-ink/85">{error.description}</p>
                    <p className="text-[11px] text-muted">
                      {SEVERITY[error.severity]?.label} ·{' '}
                      {formatDateTime(error.occurred_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {problem.event_id && (
              <div className="border-t border-line px-5 py-3">
                <Link
                  to={`/m/studio/events/${problem.event_id}`}
                  className="text-[12px] font-medium text-studio hover:underline"
                >
                  Abrir evento relacionado
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Nova solução */}
      <Modal
        open={solutionOpen}
        onClose={() => setSolutionOpen(false)}
        size="lg"
        title="Propor solução"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSolutionOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={busy}
              disabled={!solution.description.trim()}
              onClick={() =>
                run(async () => {
                  await post(`/studio/problems/${problem.id}/solutions`, solution);
                  setSolutionOpen(false);
                  setSolution({ ...solution, description: '' });
                }, 'Solução registrada.')
              }
            >
              Salvar solução
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Descrição da solução" required>
            <Textarea
              value={solution.description}
              onChange={(event) =>
                setSolution((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
            />
          </Field>
          {[
            ['Justificativa', 'rationale'],
            ['Recursos necessários', 'resources'],
            ['Riscos', 'risks'],
            ['Efeitos esperados', 'expected_effects'],
            ['Executores', 'executors'],
            ['Método de teste', 'test_method'],
            ['Critérios de sucesso', 'success_criteria'],
            ['Plano de reversão', 'rollback_plan'],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <Textarea
                value={(solution as any)[key]}
                onChange={(event) =>
                  setSolution((current) => ({ ...current, [key]: event.target.value }))
                }
                rows={2}
              />
            </Field>
          ))}
          <label className="flex items-center gap-2 text-[12.5px] text-ink/80">
            <input
              type="checkbox"
              checked={solution.requires_authorization}
              onChange={(event) =>
                setSolution((current) => ({
                  ...current,
                  requires_authorization: event.target.checked,
                }))
              }
              className="h-3.5 w-3.5 accent-[#0E1A2B]"
            />
            Esta solução exige autorização formal
          </label>
        </div>
      </Modal>

      {/* Solicitar autorização */}
      <Modal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        size="lg"
        title="Solicitar autorização"
        description="A solicitação é enviada aos responsáveis pela decisão."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAuthOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={busy}
              disabled={!authScope.trim() || deciders.length === 0}
              onClick={() =>
                run(async () => {
                  await post(`/studio/problems/${problem.id}/authorizations`, {
                    scope: authScope,
                    solution_id: authSolution || null,
                    deciders,
                    due_at: authDue || null,
                  });
                  setAuthOpen(false);
                }, 'Solicitação enviada.')
              }
            >
              Enviar solicitação
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Escopo da autorização" required>
            <Textarea
              value={authScope}
              onChange={(event) => setAuthScope(event.target.value)}
              rows={3}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Solução relacionada">
              <Select
                value={authSolution}
                onChange={(event) => setAuthSolution(event.target.value)}
              >
                <option value="">Sem solução específica</option>
                {data.solutions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description.slice(0, 60)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prazo">
              <Input
                type="date"
                value={authDue}
                onChange={(event) => setAuthDue(event.target.value)}
              />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-ink/80">
              Quem pode decidir
            </p>
            <div className="mmv-scroll max-h-52 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {(people.data?.items ?? []).map((person) => {
                const active = deciders.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={cx(
                      'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px]',
                      active ? 'bg-ink/[0.05] font-medium text-ink' : 'text-muted',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        setDeciders((current) =>
                          current.includes(person.id)
                            ? current.filter((value) => value !== person.id)
                            : [...current, person.id],
                        )
                      }
                      className="h-3.5 w-3.5 accent-[#0E1A2B]"
                    />
                    {person.full_name}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted">
              A decisão exige liderança sênior e não pode ser tomada por quem
              solicitou.
            </p>
          </div>
        </div>
      </Modal>

      {/* Decisão */}
      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.type === 'approved' ? 'Aprovar autorização' : 'Reprovar autorização'}
        description="A justificativa é obrigatória e fica registrada na auditoria."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDecision(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={busy}
              disabled={!decisionNote.trim()}
              onClick={() =>
                run(async () => {
                  await post(`/studio/authorizations/${decision?.id}/decision`, {
                    decision: decision?.type,
                    note: decisionNote,
                  });
                  setDecision(null);
                }, 'Decisão registrada.')
              }
            >
              Confirmar decisão
            </Button>
          </>
        }
      >
        <Field label="Justificativa" required>
          <Textarea
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            rows={3}
          />
        </Field>
      </Modal>
    </div>
  );
}
