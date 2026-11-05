import { useEffect, useState } from 'react';
import { Check, RotateCcw, Settings2 } from 'lucide-react';
import { Shell } from '../../components/layout/Shell';
import { useApi } from '../../lib/useApi';
import { put } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  LoadingBlock,
  PageHeader,
  Textarea,
} from '../../components/ui';
import { useToast } from '../../components/Toast';

interface SettingRow {
  key: string;
  value: unknown;
  label: string;
  description: string | null;
  category: string;
  updated_at: string;
  updated_by_name: string | null;
}

export default function SettingsPage() {
  const { data, loading, reload } = useApi<{ items: SettingRow[] }>('/admin/settings');
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.items) return;
    const next: Record<string, string> = {};
    for (const item of data.items) {
      next[item.key] = Array.isArray(item.value)
        ? item.value.join('\n')
        : JSON.stringify(item.value, null, 2);
    }
    setDrafts(next);
  }, [data]);

  async function save(item: SettingRow) {
    const raw = drafts[item.key] ?? '';
    let value: unknown;
    if (Array.isArray(item.value)) {
      value = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!Array.isArray(value) || value.length === 0) {
        toast.push('Informe ao menos uma opção.', 'error');
        return;
      }
    } else {
      try {
        value = JSON.parse(raw);
      } catch {
        toast.push('O conteúdo precisa ser um JSON válido.', 'error');
        return;
      }
    }

    setSavingKey(item.key);
    try {
      await put(`/admin/settings/${item.key}`, { value });
      await reload();
      toast.push(`"${item.label}" atualizado.`);
    } catch (error: any) {
      toast.push(error?.message ?? 'Não foi possível salvar.', 'error');
    } finally {
      setSavingKey(null);
    }
  }

  const groups = (data?.items ?? []).reduce<Record<string, SettingRow[]>>(
    (accumulator, item) => {
      const category = item.category || 'general';
      accumulator[category] = accumulator[category] ?? [];
      accumulator[category].push(item);
      return accumulator;
    },
    {},
  );

  const categoryLabels: Record<string, string> = {
    options: 'Listas de opções da operação',
    general: 'Parâmetros gerais',
  };

  return (
    <Shell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Configurações"
        description="Opções predefinidas usadas pelos módulos. Alterações passam a valer imediatamente e ficam registradas na auditoria."
      />

      {loading ? (
        <LoadingBlock label="Carregando configurações…" />
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([category, items]) => (
            <Card key={category}>
              <CardHeader
                icon={Settings2}
                title={categoryLabels[category] ?? category}
                description="Cada linha corresponde a uma opção disponível nos formulários do módulo."
              />
              <div className="divide-y divide-line">
                {items.map((item) => {
                  const isList = Array.isArray(item.value);
                  const dirty = drafts[item.key] !== undefined && drafts[item.key] !== (isList ? (item.value as string[]).join('\n') : JSON.stringify(item.value, null, 2));
                  return (
                    <div key={item.key} className="p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13.5px] font-medium text-ink">{item.label}</p>
                            <Badge>{item.key}</Badge>
                          </div>
                          {item.description && (
                            <p className="mt-0.5 text-[12px] text-muted">{item.description}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted">
                          {item.updated_by_name
                            ? `${item.updated_by_name} · ${formatDateTime(item.updated_at)}`
                            : 'nunca alterado'}
                        </span>
                      </div>

                      <Field
                        label={isList ? 'Uma opção por linha' : 'JSON'}
                        hint={isList ? `${(item.value as string[]).length} opções` : undefined}
                      >
                        <Textarea
                          value={drafts[item.key] ?? ''}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.key]: event.target.value,
                            }))
                          }
                          rows={isList ? Math.min(8, (item.value as string[]).length + 1) : 6}
                          className="font-mono text-[12.5px]"
                        />
                      </Field>

                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={RotateCcw}
                          disabled={!dirty}
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [item.key]: isList
                                ? (item.value as string[]).join('\n')
                                : JSON.stringify(item.value, null, 2),
                            }))
                          }
                        >
                          Desfazer
                        </Button>
                        <Button
                          size="sm"
                          icon={Check}
                          disabled={!dirty}
                          loading={savingKey === item.key}
                          onClick={() => save(item)}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          <p className="text-[11.5px] leading-relaxed text-muted">
            As opções alimentam formulários de eventos, erros, ocorrências, mídia e
            relatórios. Nenhuma alteração de código é necessária para ajustar a
            operação.
          </p>
        </div>
      )}
    </Shell>
  );
}
