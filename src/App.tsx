import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from './pages/LandingPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AppShell } from './components/AppShell';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { VisibilityPage } from './pages/dashboard/VisibilityPage';
import { CompetitorsPage } from './pages/dashboard/CompetitorsPage';
import { FixesPage } from './pages/dashboard/FixesPage';
import { FixDetailPage } from './pages/dashboard/FixDetailPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function DashboardLayout() {
  return (
    <AppShell>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="visibility" element={<VisibilityPage />} />
        <Route path="competitors" element={<CompetitorsPage />} />
        <Route path="fixes" element={<FixesPage />} />
        <Route path="fixes/:id" element={<FixDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
