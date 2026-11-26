import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Shell } from './components/layout/Shell';
import { MODULE_NAV } from './modules/registry';
import { Spinner } from './components/ui';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AppCentral = lazy(() => import('./pages/AppCentral'));
const WorkspaceHub = lazy(() => import('./pages/WorkspaceHub'));
const ManagementWorkspace = lazy(() => import('./pages/ManagementWorkspace'));
const StudioLayout = lazy(() => import('./pages/studio/StudioLayout'));
const StudioDashboard = lazy(() => import('./pages/studio/Dashboard'));
const StudioEvents = lazy(() => import('./pages/studio/Events'));
const StudioEventDetail = lazy(() => import('./pages/studio/EventDetail'));
const StudioSchedules = lazy(() => import('./pages/studio/Schedules'));
const StudioChecklists = lazy(() => import('./pages/studio/Checklists'));
const StudioChecklistRun = lazy(() => import('./pages/studio/ChecklistRun'));
const StudioProduction = lazy(() => import('./pages/studio/Production'));
const StudioDepartment = lazy(() => import('./pages/studio/Department'));
const StudioReports = lazy(() => import('./pages/studio/Reports'));
const StudioReportDetail = lazy(() => import('./pages/studio/ReportDetail'));
const StudioProblems = lazy(() => import('./pages/studio/Problems'));
const StudioProblemDetail = lazy(() => import('./pages/studio/ProblemDetail'));
const StudioOccurrences = lazy(() => import('./pages/studio/Occurrences'));
const StudioErrors = lazy(() => import('./pages/studio/Errors'));
const People = lazy(() => import('./pages/People'));
const Departments = lazy(() => import('./pages/Departments'));
const Communication = lazy(() => import('./pages/Communication'));
const SocialMedia = lazy(() => import('./pages/SocialMedia'));
const DesignLab = lazy(() => import('./pages/DesignLab'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const EscalasPage = lazy(() => import('./pages/Escalas'));
const PersonalArea = lazy(() => import('./pages/PersonalArea'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Help = lazy(() => import('./pages/Help'));
const NotFound = lazy(() => import('./pages/NotFound'));

const UsersPage = lazy(() => import('./pages/admin/Users'));
const ModulesPage = lazy(() => import('./pages/admin/Modules'));
const SectorsPage = lazy(() => import('./pages/admin/Sectors'));
const SettingsPage = lazy(() => import('./pages/admin/Settings'));
const AuditPage = lazy(() => import('./pages/admin/Audit'));
const Management = lazy(() => import('./pages/admin/Management'));

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
  const path = location.pathname;
  const theme = path.startsWith('/m/communication') || path.startsWith('/ambiente/inteligencia') ? 'communication'
    : path.startsWith('/m/studio') || path.startsWith('/ambiente/producao') ? 'production'
    : path.startsWith('/gestao') || path.startsWith('/ambiente/gestao') ? 'management'
    : path.startsWith('/admin') || path.startsWith('/ambiente/administracao') ? 'administration'
    : 'default';
  return <div className={`mmv-theme mmv-theme--${theme}`} data-mmv-theme={theme}><Outlet /></div>;
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
  return level >= 4 ? <Outlet /> : <Gate level={4}>{<Outlet />}</Gate>;
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<Protected />}>
          <Route path="/" element={<AppCentral />} />
          <Route path="/ambiente/:slug" element={<WorkspaceHub />} />
          <Route path="/gestao" element={<ManagementWorkspace />} />
          <Route path="/m/studio" element={<StudioLayout />}>
            <Route index element={<StudioDashboard />} />
            <Route path="events" element={<StudioEvents />} />
            <Route path="events/:id" element={<StudioEventDetail />} />
            <Route path="schedules" element={<StudioSchedules />} />
            <Route path="checklists" element={<StudioChecklists />} />
            <Route path="checklists/runs/:id" element={<StudioChecklistRun />} />
            <Route path="production" element={<StudioProduction />} />
            <Route path="production/my-space" element={<StudioProduction />} />
            <Route path="production/:slug" element={<StudioProduction />} />
            <Route path="departments/:slug" element={<StudioDepartment />} />
            <Route path="reports" element={<StudioReports />} />
            <Route path="reports/:id" element={<StudioReportDetail />} />
            <Route path="problems" element={<StudioProblems />} />
            <Route path="problems/:id" element={<StudioProblemDetail />} />
            <Route path="occurrences" element={<StudioOccurrences />} />
            <Route path="errors" element={<StudioErrors />} />
          </Route>
          <Route path="/design-lab" element={<DesignLab />} />
          <Route path="/help" element={<Help />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/escalas" element={<EscalasPage />} />
          <Route path="/pessoal" element={<PersonalArea />} />

          <Route path="/m/people" element={<ModuleLayout moduleKey="people" />}>
            <Route index element={<People />} />
          </Route>
          <Route path="/m/departments" element={<ModuleLayout moduleKey="departments" />}>
            <Route index element={<Departments />} />
          </Route>
          <Route path="/m/communication" element={<ModuleLayout moduleKey="communication" />}>
            <Route index element={<Communication />} />
            <Route path="social" element={<SocialMedia />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Management />} />
            <Route path="users" element={<Gate level={5}><UsersPage /></Gate>} />
            <Route path="modules" element={<Gate level={5}><ModulesPage /></Gate>} />
            <Route path="sectors" element={<SectorsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
