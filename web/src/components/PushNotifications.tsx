import { useEffect, useState } from 'react';
import { BellRing, BellOff, Smartphone } from 'lucide-react';
import { Card, CardHeader, Button, Badge } from './ui';
import { get, post } from '../lib/api';

interface PushKeyResponse {
  enabled: boolean;
  publicKey: string | null;
}

function decodePublicKey(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotifications() {
  const [configured, setConfigured] = useState(false);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!active) return;
      setSupported(available);
      if (!available) return;
      setPermission(Notification.permission);
      try {
        const config = await get<PushKeyResponse>('/notifications/push-key');
        if (!active) return;
        setConfigured(Boolean(config.enabled && config.publicKey));
        if (!config.enabled || !config.publicKey) return;
        const registration = await navigator.serviceWorker.ready;
        const current = await registration.pushManager.getSubscription();
        if (active) setSubscribed(Boolean(current));
      } catch {
        if (active) setConfigured(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  async function enable() {
    setBusy(true);
    setMessage('');
    try {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (isIOS && !standalone) {
        setMessage('No iPhone, adicione a MMV CREATIVE à Tela de Início e abra pelo ícone antes de ativar.');
        return;
      }
      const config = await get<PushKeyResponse>('/notifications/push-key');
      if (!config.enabled || !config.publicKey) {
        setMessage('As notificações ainda estão sendo configuradas no servidor.');
        return;
      }
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setMessage(result === 'denied'
          ? 'A permissão está bloqueada nas configurações do navegador.'
          : 'Permita as notificações para receber comunicados.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodePublicKey(config.publicKey),
      });
      await post('/notifications/push-subscriptions', { subscription: subscription.toJSON() });
      setConfigured(true);
      setSubscribed(true);
      setMessage('Este dispositivo está pronto para receber comunicados.');
    } catch (error: any) {
      setMessage(error?.message ?? 'Não foi possível ativar as notificações neste dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await post('/notifications/push-unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Notificações desativadas neste dispositivo.');
    } catch (error: any) {
      setMessage(error?.message ?? 'Não foi possível desativar as notificações.');
    } finally {
      setBusy(false);
    }
  }

  const status = !supported ? 'Indisponível neste navegador'
    : !configured ? 'Configuração pendente'
    : subscribed ? 'Ativas neste dispositivo'
    : permission === 'denied' ? 'Permissão bloqueada'
    : 'Ainda não ativadas';

  return (
    <Card>
      <CardHeader
        icon={Smartphone}
        title="Notificações no celular"
        description="Receba comunicados mesmo quando a MMV CREATIVE não estiver aberta."
        action={<Badge tone={subscribed ? 'success' : 'neutral'}>{status}</Badge>}
      />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[12px] leading-relaxed text-muted">
          A autorização vale para este dispositivo e navegador. Você pode ativar ou desativar quando quiser.
        </p>
        {subscribed ? (
          <Button size="sm" variant="secondary" icon={BellOff} loading={busy} onClick={() => void disable()}>
            Desativar
          </Button>
        ) : (
          <Button size="sm" icon={BellRing} loading={busy} disabled={!supported} onClick={() => void enable()}>
            Ativar notificações
          </Button>
        )}
      </div>
      {message && <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-muted">{message}</p>}
    </Card>
  );
}
