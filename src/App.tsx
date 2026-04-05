import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AppShell } from './components/AppShell';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { VisibilityPage } from './pages/dashboard/VisibilityPage';
import { CompetitorsPage } from './pages/dashboard/CompetitorsPage';
import { FixesPage } from './pages/dashboard/FixesPage';
import { FixDetailPage } from './pages/dashboard/FixDetailPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminSpotChecksPage } from './pages/admin/AdminSpotChecksPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Redirects to /login if no session token is present.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('geo_session_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardLayout() {
  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
          {/* Admin — completely separate from merchant dashboard */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route
            path="/admin/spot-checks"
            element={
              localStorage.getItem('admin_api_key')
                ? <AdminSpotChecksPage />
                : <Navigate to="/admin" replace />
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
