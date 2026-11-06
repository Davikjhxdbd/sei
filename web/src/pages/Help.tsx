import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckSquare,
  CircleHelp,
  ClipboardList,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Shell } from '../components/layout/Shell';

const topics = [
  {
    title: 'Central de aplicativos',
    description: 'Encontre e abra os módulos disponíveis para o seu perfil.',
    icon: BookOpen,
    href: '/',
  },
  {
    title: 'Perfil e acesso',
    description: 'Consulte seus dados, cargos, setores e permissões.',
    icon: UserRound,
    href: '/profile',
  },
  {
    title: 'Notificações',
    description: 'Acompanhe avisos e atualizações da plataforma.',
    icon: Bell,
    href: '/notifications',
  },
  {
    title: 'Gestão do Estúdio',
    description: 'Acesse eventos, escalas, checklists e relatórios.',
    icon: CheckSquare,
    href: '/m/studio',
  },
];

const questions = [
  {
    question: 'Como acesso os aplicativos da plataforma?',
    answer:
      'Volte à Central de aplicativos pelo seletor no topo da tela ou pelo botão abaixo. Ela mostra os módulos habilitados para o seu perfil. Se um aplicativo esperado não aparecer, peça à administração para verificar suas permissões.',
  },
  {
    question: 'Por que não consigo acessar uma área?',
    answer:
      'O acesso depende das permissões associadas ao seu perfil e, em algumas áreas, do nível de autoridade necessário. Se acredita que deveria ter acesso, fale com a administração da plataforma.',
  },
  {
    question: 'Como vejo minhas notificações?',
    answer:
      'Selecione o ícone de sino na barra superior ou abra a página de Notificações. O contador indica quantas notificações ainda não foram lidas.',
  },
  {
    question: 'Onde consulto meu perfil e meus setores?',
    answer:
      'Abra o menu do seu avatar e selecione “Meu perfil”. Lá você pode consultar os dados da conta, cargos e setores associados.',
  },
  {
    question: 'O que fazer se eu esquecer meus dados de acesso ou notar um problema?',
    answer:
      'Entre em contato com a pessoa responsável pela administração da sua organização para receber suporte e validar sua conta.',
  },
];

export default function Help() {
  const [query, setQuery] = useState('');
  const filteredQuestions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return questions;
    return questions.filter(({ question, answer }) =>
      `${question} ${answer}`.toLocaleLowerCase('pt-BR').includes(normalized),
    );
  }, [query]);

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar à central
          </Link>
          <section className="relative overflow-hidden rounded-xl2 bg-strong px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="mmv-grid-pattern absolute inset-0 opacity-50" aria-hidden />
            <div className="relative flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brass-soft">
                <CircleHelp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider2 text-brass-soft">
                  MMV Connect · Central de ajuda
                </p>
                <h1 className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]">
                  Como podemos ajudar?
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/65">
                  Encontre orientações rápidas para navegar pela plataforma, consultar seu acesso e usar os aplicativos disponíveis.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-ink">Guias rápidos</h2>
            <p className="mt-1 text-[12.5px] text-muted">Acesse diretamente as áreas mais usadas.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topics.map(({ title, description, icon: Icon, href }) => (
              <Link
                key={title}
                to={href}
                className="mmv-surface flex items-start gap-3 p-4 transition-shadow hover:shadow-lift"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-muted">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-ink">Perguntas frequentes</h2>
            <p className="mt-1 text-[12.5px] text-muted">Pesquise uma dúvida ou abra uma pergunta para ver a resposta.</p>
          </div>
          <label className="mb-3 flex h-10 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-studio">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nas perguntas..."
              aria-label="Buscar nas perguntas frequentes"
              className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
            />
          </label>
          <div className="mmv-surface divide-y divide-line px-4 sm:px-5">
            {filteredQuestions.length ? (
              filteredQuestions.map(({ question, answer }) => (
                <details key={question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                    <CircleHelp className="h-4 w-4 shrink-0 text-brass-deep" />
                    <span className="flex-1">{question}</span>
                    <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>＋</span>
                  </summary>
                  <p className="ml-7 mt-2 max-w-3xl text-[12.5px] leading-relaxed text-muted">{answer}</p>
                </details>
              ))
            ) : (
              <div className="py-8 text-center">
                <ClipboardList className="mx-auto h-5 w-5 text-muted" />
                <p className="mt-2 text-[13px] font-medium text-ink">Nenhum resultado encontrado</p>
                <p className="mt-1 text-[12px] text-muted">Tente buscar por outro termo.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mmv-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-studio" />
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Ainda precisa de ajuda?</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">Procure a administração da sua organização para dúvidas sobre acesso, conta ou permissões.</p>
            </div>
          </div>
          <Link to="/profile" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line px-3 text-[12px] font-medium text-ink transition-colors hover:bg-ink/[0.04]">
            <UserRound className="mr-2 h-3.5 w-3.5" /> Meu perfil
          </Link>
        </section>
      </div>
    </Shell>
  );
}
