import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ClassesPage from './pages/ClassesPage';
import SubjectsPage from './pages/SubjectsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ResultsPage from './pages/ResultsPage';
import GradingPage from './pages/GradingPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AcademicPage from './pages/AcademicPage';
import SettingsPage from './pages/SettingsPage';
import StudentResultsPage from './pages/StudentResultsPage';
import ReportCardPage from './pages/ReportCardPage';
import EnterMarksPage from './pages/EnterMarksPage';
import MyClassesPage from './pages/MyClassesPage';
import FeesPage from './pages/FeesPage';
import AssignTeacherPage from './pages/AssignTeacherPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FeedbackPage from './pages/FeedbackPage';
import BulkReportsPage from './pages/BulkReportsPage';
import FinancePage from './pages/FinancePage';
import FinanceBlockPage from './pages/FinanceBlockPage';
import PendingFeesPage from './pages/PendingFeesPage';
import AttendancePage from './pages/AttendancePage';
import ManageUsersPage from './pages/ManageUsersPage';
import NoticesPage from './pages/NoticesPage';
import EventsPage from './pages/EventsPage';
import ResourcesPage from './pages/ResourcesPage';
import AssignmentsPage from './pages/AssignmentsPage';

function RoleGuard({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-mlk-red border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user || !allowed.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#1f2937', color: '#f9fafb', borderRadius: '12px' } }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<RoleGuard allowed={['admin', 'headmaster']}><StudentsPage /></RoleGuard>} />
              <Route path="teachers" element={<RoleGuard allowed={['admin']}><TeachersPage /></RoleGuard>} />
              <Route path="classes" element={<RoleGuard allowed={['admin']}><ClassesPage /></RoleGuard>} />
              <Route path="subjects" element={<RoleGuard allowed={['admin']}><SubjectsPage /></RoleGuard>} />
              <Route path="departments" element={<RoleGuard allowed={['admin']}><DepartmentsPage /></RoleGuard>} />
              <Route path="results" element={<RoleGuard allowed={['admin', 'teacher', 'headmaster']}><ResultsPage /></RoleGuard>} />
              <Route path="grading" element={<RoleGuard allowed={['admin']}><GradingPage /></RoleGuard>} />
              <Route path="reports" element={<RoleGuard allowed={['admin', 'teacher', 'headmaster']}><ReportsPage /></RoleGuard>} />
              <Route path="analytics" element={<RoleGuard allowed={['admin', 'headmaster']}><AnalyticsPage /></RoleGuard>} />
              <Route path="academic" element={<RoleGuard allowed={['admin']}><AcademicPage /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard allowed={['admin']}><SettingsPage /></RoleGuard>} />
              <Route path="my-results" element={<StudentResultsPage />} />
              <Route path="report-card" element={<ReportCardPage />} />
              <Route path="enter-marks" element={<RoleGuard allowed={['teacher']}><EnterMarksPage /></RoleGuard>} />
              <Route path="my-classes" element={<RoleGuard allowed={['teacher']}><MyClassesPage /></RoleGuard>} />
              <Route path="fees" element={<RoleGuard allowed={['admin', 'finance']}><FeesPage /></RoleGuard>} />
              <Route path="assign-teachers" element={<RoleGuard allowed={['admin']}><AssignTeacherPage /></RoleGuard>} />
              <Route path="attendance" element={<RoleGuard allowed={['admin']}><AttendancePage /></RoleGuard>} />
              <Route path="manage-users" element={<RoleGuard allowed={['admin']}><ManageUsersPage /></RoleGuard>} />
              <Route path="notices" element={<NoticesPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="approvals" element={<RoleGuard allowed={['headmaster']}><ApprovalsPage /></RoleGuard>} />
              <Route path="feedback" element={<RoleGuard allowed={['headmaster', 'teacher']}><FeedbackPage /></RoleGuard>} />
              <Route path="bulk-reports" element={<RoleGuard allowed={['admin', 'headmaster']}><BulkReportsPage /></RoleGuard>} />
              <Route path="finance" element={<RoleGuard allowed={['finance']}><FinancePage /></RoleGuard>} />
              <Route path="finance-block" element={<RoleGuard allowed={['finance']}><FinanceBlockPage /></RoleGuard>} />
              <Route path="pending-fees" element={<RoleGuard allowed={['headmaster']}><PendingFeesPage /></RoleGuard>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
