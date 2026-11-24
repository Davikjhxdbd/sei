import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    let registration: ServiceWorkerRegistration | null = null;
    let disposed = false;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/').then((current) => {
        if (!current || disposed) return;
        registration = current;
        if (current.waiting && navigator.serviceWorker.controller) setUpdateWorker(current.waiting);
        current.addEventListener('updatefound', () => {
          const worker = current.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateWorker(worker);
          });
        });
      }).catch(() => {});
    }

    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      void registration;
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setIosHelp((value) => !value);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  function applyUpdate() {
    if (!updateWorker) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    updateWorker.postMessage({ type: 'SKIP_WAITING' });
    setUpdateWorker(null);
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (installed) return null;

  return (
    <div className="relative">
      {updateWorker ? (
        <button type="button" onClick={applyUpdate} className="connect-header-command" aria-label="Atualizar MMV CREATIVE">
          <RefreshCw size={15}/><span>ATUALIZAR</span>
        </button>
      ) : (installPrompt || isIOS) ? (
        <button type="button" onClick={install} className="connect-header-command" aria-label="Instalar MMV CREATIVE">
          <Download size={15}/><span>INSTALAR</span>
        </button>
      ) : null}
      {iosHelp && isIOS && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-xl border border-[#C4A66A]/30 bg-[#151719] p-3 text-[11px] leading-relaxed text-white/75 shadow-2xl">
          No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
        </div>
      )}
    </div>
  );
}
