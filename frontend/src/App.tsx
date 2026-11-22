import React from 'react';
import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Student & Public Pages
import { LandingPage } from '@/pages/LandingPage';
import { QuestionTakePage } from '@/pages/student/QuestionTakePage';
import { QuizTakePage } from '@/pages/student/QuizTakePage';
import { FeedbackFormPage } from '@/pages/student/FeedbackFormPage';
import { FeedbackConfirmationPage } from '@/pages/student/FeedbackConfirmationPage';

// Admin Pages
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { DashboardOverviewPage } from '@/pages/admin/DashboardOverviewPage';
import { ManageQuizzesPage } from '@/pages/admin/ManageQuizzesPage';
import { QuizFormPage } from '@/pages/admin/QuizFormPage';
import { ManageQuestionsPage } from '@/pages/admin/ManageQuestionsPage';
import { QrGeneratorPage } from '@/pages/admin/QrGeneratorPage';
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage';
import { FeedbackManagementPage } from '@/pages/admin/FeedbackManagementPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <AdminLayout
        title="Administrator Access Required"
        subtitle="Role-based privacy safeguard"
      >
        <Card className="mx-auto max-w-lg text-center border-amber-200">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Restricted to Administrators</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To protect student confidentiality, anonymous feedback records and system settings are strictly restricted to authorized college Administrators. Staff accounts cannot view or access feedback records.
            </p>
            <Link to="/admin/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Student & Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/q/:publicCode" element={<QuestionTakePage />} />
      <Route path="/quiz/:publicCode" element={<QuizTakePage />} />
      <Route path="/feedback" element={<FeedbackFormPage />} />
      <Route path="/feedback/confirmation" element={<FeedbackConfirmationPage />} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin & Staff Routes */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth>
            <DashboardOverviewPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes"
        element={
          <RequireAuth>
            <ManageQuizzesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/new"
        element={
          <RequireAuth>
            <QuizFormPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/:id/edit"
        element={
          <RequireAuth>
            <QuizFormPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/:id/questions"
        element={
          <RequireAuth>
            <ManageQuestionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/qr-codes"
        element={
          <RequireAuth>
            <QrGeneratorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <RequireAuth>
            <AnalyticsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/analytics/:quizId"
        element={
          <RequireAuth>
            <AnalyticsPage />
          </RequireAuth>
        }
      />

      {/* Strictly ADMIN-Only Routes */}
      <Route
        path="/admin/feedback"
        element={
          <RequireAuth>
            <RequireAdmin>
              <FeedbackManagementPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAuth>
            <RequireAdmin>
              <SettingsPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
