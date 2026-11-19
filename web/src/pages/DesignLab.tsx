import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, MonitorSmartphone, Palette, Sparkles } from 'lucide-react';
import { Shell } from '../components/layout/Shell';

const palettes = [
  { name: 'Dourado clássico', accent: '#C4A66A', soft: '#E0C995', glow: 'rgba(196,166,106,.20)' },
  { name: 'Verde oliva', accent: '#9BA887', soft: '#C6D0B5', glow: 'rgba(155,168,135,.20)' },
  { name: 'Azul aço', accent: '#8CA9C4', soft: '#C1D4E5', glow: 'rgba(140,169,196,.20)' },
];

export default function DesignLab() {
  const [palette, setPalette] = useState(0);
  const [light, setLight] = useState(false);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const active = palettes[palette];
  const surface = light ? '#F4F2ED' : '#171717';
  const canvas = light ? '#EAE7DF' : '#101010';
  const ink = light ? '#22211E' : '#F4F2ED';
  const muted = light ? '#77736A' : 'rgba(244,242,237,.48)';
  const line = light ? 'rgba(34,33,30,.12)' : 'rgba(255,255,255,.09)';

  return (
    <Shell>
      <main className="mx-auto max-w-[1320px] space-y-7 px-4 pb-14 pt-6 sm:px-7 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-medium text-muted transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Voltar à central
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: active.accent }} />
            Laboratório visual · Preview
          </span>
        </div>

        <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#090909] px-6 py-9 shadow-[0_28px_90px_rgba(0,0,0,.32)] sm:px-10 sm:py-14">
          <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(ellipse at 82% 20%, ${active.glow}, transparent 42%), linear-gradient(115deg,#090909 20%,#151515 100%)` }} />
          <div className="absolute right-[-5%] top-[-55%] -z-10 h-[420px] w-[420px] rounded-full border" style={{ borderColor: active.accent + '30', boxShadow: `0 0 100px ${active.glow}` }} />
          <p className="text-[10px] font-semibold uppercase tracking-[.36em]" style={{ color: active.soft }}>MMV CONNECT / DESIGN SYSTEM</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[.94] tracking-[-.045em] text-white sm:text-7xl">
            A identidade<br /><span style={{ color: active.soft }}>ganha forma.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            Um espaço para experimentar a linguagem visual do MMV: cores, superfícies, tipografia e experiência em cada tela.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 bg-white/[.05] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-white/65">Premium · Minimalista</span>
            <span className="rounded-full border border-white/15 bg-white/[.05] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-white/65">Mobile first</span>
            <span className="rounded-full border border-white/15 bg-white/[.05] px-3 py-2 text-[10px] uppercase tracking-[.16em] text-white/65">Em evolução</span>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" style={{ color: active.accent }} />
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-ink">Direção de arte</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Experimente combinações. A prévia muda na hora, sem alterar as telas reais.</p>

            <div className="mt-6">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Paleta de destaque</p>
              <div className="space-y-2">
                {palettes.map((item, index) => (
                  <button key={item.name} onClick={() => setPalette(index)} className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition" style={{ borderColor: palette === index ? item.accent : line, background: palette === index ? item.accent + '12' : 'transparent' }}>
                    <span className="h-8 w-8 rounded-lg" style={{ background: item.accent }} />
                    <span className="flex-1 text-xs font-medium" style={{ color: ink }}>{item.name}</span>
                    {palette === index && <Check className="h-4 w-4" style={{ color: item.accent }} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: line }}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Aparência</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setLight(false)} className="rounded-xl border px-3 py-3 text-xs font-medium" style={{ borderColor: !light ? active.accent : line, color: ink, background: !light ? active.accent + '12' : 'transparent' }}>Escuro</button>
                <button onClick={() => setLight(true)} className="rounded-xl border px-3 py-3 text-xs font-medium" style={{ borderColor: light ? active.accent : line, color: ink, background: light ? active.accent + '12' : 'transparent' }}>Claro</button>
              </div>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: line }}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">Densidade dos componentes</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDensity('comfortable')} className="rounded-xl border px-3 py-3 text-xs font-medium" style={{ borderColor: density === 'comfortable' ? active.accent : line, color: ink }}>Confortável</button>
                <button onClick={() => setDensity('compact')} className="rounded-xl border px-3 py-3 text-xs font-medium" style={{ borderColor: density === 'compact' ? active.accent : line, color: ink }}>Compacta</button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.18em]" style={{ color: active.accent }}>Preview em tempo real</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Uma tela do MMV</h2>
              </div>
              <MonitorSmartphone className="h-5 w-5 text-muted" />
            </div>
            <div className="overflow-hidden rounded-[24px] border p-4 shadow-[0_20px_55px_rgba(0,0,0,.12)] sm:p-6" style={{ background: canvas, borderColor: line }}>
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: line }}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold text-[#111]" style={{ background: active.accent }}>M</span>
                  <div><p className="text-[11px] font-bold tracking-[.16em]" style={{ color: ink }}>MMV CONNECT</p><p className="mt-0.5 text-[9px]" style={{ color: muted }}>PLATAFORMA OPERACIONAL</p></div>
                </div>
                <span className="rounded-full border px-3 py-1.5 text-[9px]" style={{ borderColor: line, color: muted }}>Workspace</span>
              </div>
              <div className={density === 'comfortable' ? 'py-7' : 'py-4'}>
                <p className="text-[9px] font-semibold uppercase tracking-[.25em]" style={{ color: active.accent }}>SEU AMBIENTE DE TRABALHO</p>
                <h3 className="mt-2 font-display text-4xl font-semibold leading-none sm:text-5xl" style={{ color: ink }}>Boas ideias<br /><span style={{ color: active.accent }}>em movimento.</span></h3>
                <p className="mt-3 max-w-md text-xs leading-6" style={{ color: muted }}>Organize pessoas, projetos e entregas em um só lugar.</p>
              </div>
              <div className={density === 'comfortable' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-2 sm:grid-cols-2'}>
                {[
                  { title: 'Projetos', detail: 'Acompanhe iniciativas', value: '08' },
                  { title: 'Equipe', detail: 'Pessoas conectadas', value: '24' },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border p-4" style={{ background: surface, borderColor: line }}>
                    <p className="text-[10px] uppercase tracking-[.15em]" style={{ color: muted }}>{item.title}</p>
                    <p className="mt-3 text-3xl font-semibold" style={{ color: ink }}>{item.value}</p>
                    <p className="mt-1 text-[10px]" style={{ color: muted }}>{item.detail}</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-[#111]" style={{ background: active.accent }}>
                <Sparkles className="h-4 w-4" /> Explorar plataforma
              </button>
            </div>
            <p className="px-1 text-[10px] leading-5 text-muted">Prévia ilustrativa. Os números e textos acima são exemplos visuais, não dados reais do sistema.</p>
          </section>
        </div>
      </main>
    </Shell>
  );
}
