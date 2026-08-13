import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Landing & Auth
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Dashboard Layout
import DashboardLayout from './components/DashboardLayout';

// Core Pages
import Dashboard from './pages/Dashboard';
import ContactsPage from './pages/ContactsPage';
import EventsPage from './pages/EventsPage';
import AIGreetingPage from './pages/AIGreetingPage';
import ScheduleWishPage from './pages/ScheduleWishPage';
import EmailLogsPage from './pages/EmailLogsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';

// New SaaS Pages
import Calendar from './pages/Calendar';
import Templates from './pages/Templates';
import Notifications from './pages/Notifications';
import Subscription from './pages/Subscription';
import Billing from './pages/Billing';
import Payments from './pages/Payments';
import HelpCenter from './pages/HelpCenter';
import Contact from './pages/Contact';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
import AdminPrompts from './pages/AdminPrompts';
import AdminLogs from './pages/AdminLogs';

// Fallbacks
import NotFound from './pages/NotFound';
import Error500 from './pages/Error500';
import Maintenance from './pages/Maintenance';

// Greeting Cards
import MyGreetingCards from './pages/greeting-cards/MyGreetingCards';
import CreateGreetingCard from './GreetingCards/pages/GreetingWizard';
import CardTemplatesPage from './GreetingCards/pages/GreetingTemplates';
import SavedDrafts from './pages/greeting-cards/SavedDrafts';
import GreetingPreview from './GreetingCards/pages/GreetingPreview';


// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'super_admin' || user?.is_staff || user?.is_superuser;
  return isAuthenticated && isAdmin ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/500" element={<Error500 />} />
      <Route path="/maintenance" element={<Maintenance />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/contacts" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ContactsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/events" element={
        <ProtectedRoute>
          <DashboardLayout>
            <EventsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Calendar />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/ai-greeting" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AIGreetingPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/schedule" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ScheduleWishPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/templates" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Templates />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/email-logs" element={
        <ProtectedRoute>
          <DashboardLayout>
            <EmailLogsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/activities" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ActivitiesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Notifications />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <DashboardLayout>
            <ReportsPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Subscription />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/billing" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Billing />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/payments" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Payments />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/help-center" element={
        <ProtectedRoute>
          <DashboardLayout>
            <HelpCenter />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/contact" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Contact />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/about" element={
        <ProtectedRoute>
          <DashboardLayout>
            <About />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/privacy" element={
        <ProtectedRoute>
          <DashboardLayout>
            <PrivacyPolicy />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/terms" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Terms />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Admin Specific Routes */}
      <Route path="/admin-dashboard" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminUsers />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/roles" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminRoles />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/prompts" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminPrompts />
          </DashboardLayout>
        </AdminRoute>
      } />
      <Route path="/admin/logs" element={
        <AdminRoute>
          <DashboardLayout>
            <AdminLogs />
          </DashboardLayout>
        </AdminRoute>
      } />

      {/* Greeting Card Routes */}
      <Route path="/greeting-cards" element={
        <ProtectedRoute>
          <DashboardLayout>
            <MyGreetingCards />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/greeting-cards/create" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CreateGreetingCard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/greeting-cards/create/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CreateGreetingCard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/greeting-cards/templates" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CardTemplatesPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/greeting-cards/drafts" element={
        <ProtectedRoute>
          <DashboardLayout>
            <SavedDrafts />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/greeting-cards/preview/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <GreetingPreview />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
