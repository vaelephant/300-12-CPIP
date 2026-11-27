import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app/app-shell";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import PathwaysPage from "@/pages/pathways";
import PathwayStudioPage from "@/pages/pathways/studio";
import PathwayVersionsPage from "@/pages/pathways/versions";
import ApprovalsPage from "@/pages/approvals";
import PatientsPage from "@/pages/patients";
import PatientMapPage from "@/pages/patients/map";
import PatientReplayPage from "@/pages/patients/replay";
import PatientDetailPage from "@/pages/patients/detail";
import PatientPathwayPage from "@/pages/patients/pathway";
import PlanningPage from "@/pages/planning";
import TasksPage from "@/pages/tasks";
import FollowupsPage from "@/pages/followups";
import VariationsPage from "@/pages/variations";
import SimulationPage from "@/pages/simulation";
import KnowledgePage from "@/pages/knowledge";
import AnalyticsPage from "@/pages/analytics";
import ExecutivePage from "@/pages/executive";
import ProcessMiningPage from "@/pages/process-mining";
import AboutPage from "@/pages/about";
import UsersPage from "@/pages/settings/users";
import RolesPage from "@/pages/settings/roles";
import AuditPage from "@/pages/settings/audit";
import VizGalleryPage from "@/dev/desgin/Gallery";
import PathwayGalleryPage from "@/dev/desgin/PathwayGallery";
import StageTasksGalleryPage from "@/dev/desgin/StageTasksGallery";
import ComboGalleryPage from "@/dev/desgin/ComboGallery";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 0 } },
});

function NotFound() {
  const location = useLocation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">404 · Route not found</p>
      <h1 className="mt-2 text-[22px] font-semibold">页面不存在</h1>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        未找到路由 <span className="font-mono text-foreground/70">{location.pathname}</span>
      </p>
      <Button asChild className="mt-5" size="sm">
        <Link to="/dashboard">返回工作台</Link>
      </Button>
    </div>
  );
}

function SessionEffects() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);

  useEffect(() => {
    const handler = () => {
      logout();
      queryClient.clear();
      if (window.location.pathname !== "/login") window.location.assign("/login");
    };
    window.addEventListener("hcc:unauthorized", handler);
    return () => window.removeEventListener("hcc:unauthorized", handler);
  }, [logout, queryClient]);

  useEffect(() => {
    // Logout / 401 must not leave patient or task data in the query cache.
    if (!user) queryClient.clear();
  }, [user, queryClient]);

  return null;
}

function LoginRoute() {
  const user = useSessionStore((s) => s.user);
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={180}>
          <BrowserRouter>
            <SessionEffects />
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/dev/desgin" element={<VizGalleryPage />} />
              <Route path="/dev/desgin/pathway" element={<PathwayGalleryPage />} />
              <Route path="/dev/desgin/tasks" element={<StageTasksGalleryPage />} />
              <Route path="/dev/desgin/combo" element={<ComboGalleryPage />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/pathways" element={<PathwaysPage />} />
                <Route path="/pathways/:id/studio" element={<PathwayStudioPage />} />
                <Route path="/pathways/:id/versions" element={<PathwayVersionsPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:id" element={<PatientDetailPage />} />
                <Route path="/patients/:id/map" element={<PatientMapPage />} />
                <Route path="/patients/:id/replay" element={<PatientReplayPage />} />
                <Route path="/patients/:id/pathway" element={<PatientPathwayPage />} />
                <Route path="/planning/:instanceId" element={<PlanningPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/variations" element={<VariationsPage />} />
                <Route path="/followups" element={<FollowupsPage />} />
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/executive" element={<ExecutivePage />} />
                <Route path="/process-mining" element={<ProcessMiningPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/settings/users" element={<UsersPage />} />
                <Route path="/settings/roles" element={<RolesPage />} />
                <Route path="/settings/audit" element={<AuditPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
