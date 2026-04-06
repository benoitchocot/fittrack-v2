import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CguPage from './pages/CguPage';
import RgpdPage from './pages/RgpdPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import NewSessionPage from './pages/NewSessionPage';
import ExercisesPage from './pages/ExercisesPage';
import ProgressionPage from './pages/ProgressionPage';
import ProfilePage from './pages/ProfilePage';
import TemplatesPage from './pages/TemplatesPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cgu" element={<CguPage />} />
        <Route path="/rgpd" element={<RgpdPage />} />

        {/* Protected */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/new" element={<NewSessionPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="progression" element={<ProgressionPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
