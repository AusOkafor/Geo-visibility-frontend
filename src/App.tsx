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
import { AdminCitationVerifierPage } from './pages/admin/AdminCitationVerifierPage';
import { AdminReviewDetectorPage } from './pages/admin/AdminReviewDetectorPage';
import { AdminShell } from './pages/admin/AdminShell';
import { Toaster } from 'sonner';

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

// Redirects to /admin if no admin API key is present.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const key = localStorage.getItem('admin_api_key');
  if (!key) return <Navigate to="/admin" replace />;
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
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#E2E8F0',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
          },
        }}
      />
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
              <AdminRoute>
                <AdminShell>
                  <AdminSpotChecksPage />
                </AdminShell>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/verifier"
            element={
              <AdminRoute>
                <AdminShell>
                  <AdminCitationVerifierPage />
                </AdminShell>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <AdminRoute>
                <AdminShell>
                  <AdminReviewDetectorPage />
                </AdminShell>
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
