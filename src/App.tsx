import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useEmailVerificationHandler } from "@/hooks/useEmailVerificationHandler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AdminModuleRoute } from "@/components/AdminModuleRoute";
import { PatientRoute } from "@/components/PatientRoute";
import { StaffRoute } from "@/components/StaffRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Analyses from "./pages/Analyses";
import AnalysisDetail from "./pages/AnalysisDetail";
import { Navigate } from "react-router-dom";
import Biomarkers from "./pages/Biomarkers";
import Recommendations from "./pages/Recommendations";
import Prescriptions from "./pages/Prescriptions";
import Trends from "./pages/Trends";
import MyState from "./pages/MyState";
import HealthAssistant from "./pages/HealthAssistant";
import Subscription from "./pages/Subscription";
import HealthStrategy from "./pages/HealthStrategy";
import ExampleReport from "./pages/ExampleReport";
import AnalysisPrep from "./pages/AnalysisPrep";

import AISettings from "./pages/admin/AISettings";
import DataManagement from "./pages/admin/DataManagement";
import Patients from "./pages/admin/Patients";
import PatientProfile from "./pages/admin/PatientProfile";
import UserManagement from "./pages/admin/UserManagement";
import AnalysisBookings from "./pages/admin/AnalysisBookings";
import MyAssignments from "./pages/admin/MyAssignments";
import SubscriptionPlans from "./pages/admin/SubscriptionPlans";
import ReportVisualsTest from "./pages/admin/ReportVisualsTest";
import ScaleLabelsPreview from "./pages/admin/ScaleLabelsPreview";
import EmailSettings from "./pages/admin/EmailSettings";
import SmsSettings from "./pages/admin/SmsSettings";
import TelegramSettings from "./pages/admin/TelegramSettings";
import RegisterStaff from "./pages/RegisterStaff";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";
import { RouteMeta } from "@/components/RouteMeta";
import { YandexMetrika } from "@/components/YandexMetrika";
import Requisites from "./pages/legal/Requisites";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import ConsentData from "./pages/legal/ConsentData";
import ConsentResearch from "./pages/legal/ConsentResearch";
import Documents from "./pages/legal/Documents";
import Compliance from "./pages/legal/Compliance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 секунд - данные свежие
      gcTime: 5 * 60 * 1000, // 5 минут в кеше (вместо устаревшего cacheTime)
      refetchOnWindowFocus: false, // не перезапрашивать при фокусе окна
      refetchOnMount: false, // не перезапрашивать при каждом монтировании
      retry: 1, // одна попытка повтора при ошибке
    },
  },
});

function EmailVerificationListener() {
  useEmailVerificationHandler();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <EmailVerificationListener />
        <BrowserRouter>
          <YandexMetrika />
          <RouteMeta />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            {/* Публичный пример отчёта — рендерится как Dialog поверх лендинга. */}
            <Route
              path="/example-report"
              element={
                <>
                  <Index />
                  <ExampleReport />
                </>
              }
            />
            <Route path="/auth" element={<Auth />} />
            <Route path="/prep" element={<AnalysisPrep />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-staff" element={<RegisterStaff />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected routes with persistent DashboardLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Outlet />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            >
              {/* Patient routes */}
              <Route path="/dashboard" element={<PatientRoute><Dashboard /></PatientRoute>} />
              <Route path="/health-strategy" element={<PatientRoute><HealthStrategy /></PatientRoute>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analyses" element={<PatientRoute><Analyses /></PatientRoute>} />
              <Route path="/analyses/:id" element={<PatientRoute><AnalysisDetail /></PatientRoute>} />
              <Route path="/biomarkers" element={<Navigate to="/dashboard" replace />} />
              <Route path="/recommendations" element={<PatientRoute><Recommendations /></PatientRoute>} />
              <Route path="/prescriptions" element={<PatientRoute><Prescriptions /></PatientRoute>} />
              <Route path="/prescriptions-v2" element={<Navigate to="/prescriptions" replace />} />
              <Route path="/trends" element={<Navigate to="/dashboard" replace />} />
              <Route path="/my-state" element={<PatientRoute><MyState /></PatientRoute>} />
              <Route path="/health-assistant" element={<PatientRoute><HealthAssistant /></PatientRoute>} />
              <Route path="/subscription" element={<PatientRoute><Subscription /></PatientRoute>} />

              {/* Admin routes */}
              <Route 
                path="/admin/ai-settings" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="ai_settings">
                      <AISettings />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/data-management" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="data_management">
                      <DataManagement />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/patients" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="patients">
                      <Patients />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/patients/:userId" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="patients">
                      <PatientProfile />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route
                path="/admin/user-management" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="user_management">
                      <UserManagement />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/analysis-bookings" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="analysis_bookings">
                      <AnalysisBookings />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/my-assignments" 
                element={
                  <StaffRoute>
                    <AdminModuleRoute module="my_assignments">
                      <MyAssignments />
                    </AdminModuleRoute>
                  </StaffRoute>
                } 
              />
              <Route 
                path="/admin/subscription-plans" 
                element={
                  <SuperAdminRoute>
                    <SubscriptionPlans />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="/admin/report-visuals" 
                element={
                  <SuperAdminRoute>
                    <ReportVisualsTest />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="/admin/scale-preview" 
                element={
                  <SuperAdminRoute>
                    <ScaleLabelsPreview />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="/admin/email-settings" 
                element={
                  <SuperAdminRoute>
                    <EmailSettings />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="/admin/sms-settings" 
                element={
                  <SuperAdminRoute>
                    <SmsSettings />
                  </SuperAdminRoute>
                } 
              />
              <Route 
                path="/admin/telegram-settings" 
                element={
                  <SuperAdminRoute>
                    <TelegramSettings />
                  </SuperAdminRoute>
                } 
              />
            </Route>

            {/* Legal pages */}
            <Route path="/legal/requisites" element={<Requisites />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/legal/consent-data" element={<ConsentData />} />
            <Route path="/legal/consent-research" element={<ConsentResearch />} />
            <Route path="/legal/documents" element={<Documents />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
