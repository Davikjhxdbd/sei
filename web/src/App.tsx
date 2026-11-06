import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Shell } from './components/layout/Shell';
import { ADMIN_NAV, MODULE_NAV } from './modules/registry';
import { Spinner } from './components/ui';
import { Link } from 'react-router-dom';
import { CircleHelp, ShieldAlert } from 'lucide-react';

import Login from './pages/Login';
import AppCentral from './pages/AppCentral';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Help from './pages/Help';
import NotFound from './pages/NotFound';

import UsersPage from './pages/admin/Users';
import ModulesPage from './pages/admin/Modules';
import SectorsPage from './pages/admin/Sectors';
import SettingsPage from './pages/admin/Settings';
import AuditPage from './pages/admin/Audit';

import Dashboard from './pages/studio/Dashboard';
import Events from './pages/studio/Events';
import EventDetail from './pages/studio/EventDetail';
import Presets from './pages/studio/Presets';
import Checklists from './pages/studio/Checklists';
import ChecklistRun from './pages/studio/ChecklistRun';
import Reports from './pages/studio/Reports';
import ReportDetail from './pages/studio/ReportDetail';
import Errors from './pages/studio/Errors';
import Occurrences from './pages/studio/Occurrences';
import Problems from './pages/studio/Problems';
import ProblemDetail from './pages/studio/ProblemDetail';
import Schedules from './pages/studio/Schedules';
import Media from './pages/studio/Media';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-strong">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brass text-sm font-bold text-white">
        MV
      </span>
      <div className="flex items-center gap-2 text-[12.5px] text-white/60">
        <Spinner className="text-white/60" />
        Carregando a plataforma…
      </div>
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <>
      <Outlet />
      <Link
        to="/help"
        aria-label="Central de ajuda"
        title="Central de ajuda"
        className="fixed bottom-5 right-5 z-50 grid h-11 w-11 place-items-center rounded-full bg-strong text-white shadow-lift transition-transform hover:scale-105 hover:bg-strong-soft"
      >
        <CircleHelp className="h-5 w-5" />
      </Link>
    </>
  );
}

function Gate({ level, children }: { level: number; children: JSX.Element }) {
  const { level: myLevel } = useAuth();
  if (myLevel < level) {
    return (
      <div className="mmv-surface mx-auto max-w-lg px-6 py-10 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-amber-50 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h2 className="text-[16px] font-semibold text-ink">Acesso restrito</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Esta área exige um nível de autoridade superior ao do seu perfil. A
          verificação é feita no servidor.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink hover:border-ink/30"
        >
          Voltar à central
        </Link>
      </div>
    );
  }
  return children;
}

function ModuleLayout({ moduleKey }: { moduleKey: string }) {
  const { modules, loading } = useAuth();
  const module = modules.find((item) => item.key === moduleKey);

  if (loading) return <FullScreenLoader />;

  if (!module) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="mmv-surface max-w-lg px-6 py-10 text-center">
          <h1 className="text-[18px] font-semibold text-ink">
            Aplicativo indisponível
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Este aplicativo não está habilitado ou o seu perfil não possui
            autorização de acesso. A lista da central é montada a partir do
            registro de módulos e das suas permissões.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-strong px-3 text-[12.5px] font-medium text-white"
          >
            Voltar à central
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Shell module={module} nav={MODULE_NAV[moduleKey]} sidebarEyebrow="Aplicativo">
      <Outlet />
    </Shell>
  );
}

function AdminLayout() {
  const { level } = useAuth();
  return (
    <Shell nav={ADMIN_NAV} sidebarEyebrow="Plataforma">
      {level >= 4 ? <Outlet /> : <Gate level={4}>{<Outlet />}</Gate>}
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Protected />}>
        <Route path="/" element={<AppCentral />} />
        <Route path="/help" element={<Help />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/m/studio" element={<ModuleLayout moduleKey="studio" />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="presets" element={<Presets />} />
          <Route path="checklists" element={<Checklists />} />
          <Route path="checklists/runs/:id" element={<ChecklistRun />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="errors" element={<Errors />} />
          <Route
            path="occurrences"
            element={
              <Gate level={3}>
                <Occurrences />
              </Gate>
            }
          />
          <Route path="problems" element={<Problems />} />
          <Route path="problems/:id" element={<ProblemDetail />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="media" element={<Media />} />
          <Route
            path="settings"
            element={
              <Gate level={4}>
                <SettingsPage />
              </Gate>
            }
          />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/audit" replace />} />
          <Route
            path="users"
            element={
              <Gate level={5}>
                <UsersPage />
              </Gate>
            }
          />
          <Route
            path="modules"
            element={
              <Gate level={5}>
                <ModulesPage />
              </Gate>
            }
          />
          <Route path="sectors" element={<SectorsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
