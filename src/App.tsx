import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useEmailVerificationHandler } from "@/hooks/useEmailVerificationHandler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AdminModuleRoute } from "@/components/AdminModuleRoute";
import { PatientRoute } from "@/components/PatientRoute";
import { StaffRoute } from "@/components/StaffRoute";
import { OnboardingGate } from "@/components/OnboardingGate";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteMeta } from "@/components/RouteMeta";
import { RegisterGuardProvider } from "@/components/RegisterGuard";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { YandexMetrika } from "@/components/YandexMetrika";
import { JivoVisibility } from "./components/JivoVisibility";

// Statically imported — landing critical path
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth / public utilities
const LandingV2 = lazy(() => import("./pages/LandingV2"));
const Auth = lazy(() => import("./pages/Auth"));
const Register = lazy(() => import("./pages/Register"));
const RegisterStaff = lazy(() => import("./pages/RegisterStaff"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const LifestyleTest = lazy(() => import("./pages/LifestyleTest"));
const AnalysisPrep = lazy(() => import("./pages/AnalysisPrep"));
const Faq = lazy(() => import("./pages/Faq"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Patient area
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Analyses = lazy(() => import("./pages/Analyses"));
const AnalysisDetail = lazy(() => import("./pages/AnalysisDetail"));
const AnalysesPrint = lazy(() => import("./pages/AnalysesPrint"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Prescriptions = lazy(() => import("./pages/Prescriptions"));
const MyState = lazy(() => import("./pages/MyState"));
const HealthAssistant = lazy(() => import("./pages/HealthAssistant"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionFail = lazy(() => import("./pages/SubscriptionFail"));
const HealthStrategy = lazy(() => import("./pages/HealthStrategy"));
const ExampleReport = lazy(() => import("./pages/ExampleReport"));
const DemoReport = lazy(() => import("./pages/DemoReport"));

// Admin area
const AISettings = lazy(() => import("./pages/admin/AISettings"));
const DataManagement = lazy(() => import("./pages/admin/DataManagement"));
const Patients = lazy(() => import("./pages/admin/Patients"));
const PatientProfile = lazy(() => import("./pages/admin/PatientProfile"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AnalysisBookings = lazy(() => import("./pages/admin/AnalysisBookings"));
const MyAssignments = lazy(() => import("./pages/admin/MyAssignments"));
const SubscriptionPlans = lazy(() => import("./pages/admin/SubscriptionPlans"));
const PaymentGatewaySettings = lazy(() => import("./pages/admin/PaymentGatewaySettings"));
const ReportVisualsTest = lazy(() => import("./pages/admin/ReportVisualsTest"));
const ScaleLabelsPreview = lazy(() => import("./pages/admin/ScaleLabelsPreview"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const SmsSettings = lazy(() => import("./pages/admin/SmsSettings"));
const TelegramSettings = lazy(() => import("./pages/admin/TelegramSettings"));
const LabLocations = lazy(() => import("./pages/admin/LabLocations"));
const PromoCodes = lazy(() => import("./pages/admin/PromoCodes"));

// Internal service pages (Playwright PDF renderer, standalone report)
const ReportPreview = lazy(() => import("./pages/internal/ReportPreview"));
const ReportV2Standalone = lazy(() => import("./pages/internal/ReportV2Standalone"));

// Legal
const Requisites = lazy(() => import("./pages/legal/Requisites"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const ConsentData = lazy(() => import("./pages/legal/ConsentData"));
const ConsentResearch = lazy(() => import("./pages/legal/ConsentResearch"));
const Documents = lazy(() => import("./pages/legal/Documents"));
const Compliance = lazy(() => import("./pages/legal/Compliance"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function EmailVerificationListener() {
  useEmailVerificationHandler();
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Sonner />
        <EmailVerificationListener />
        <BrowserRouter>
          <YandexMetrika />
          <RouteMeta />
          <JivoVisibility />
          <RegisterGuardProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/landing-v2" element={<LandingV2 />} />
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
            {/* Полностраничная демо-версия отчёта Елены Ивановой (noindex). */}
            <Route path="/demo-report" element={<DemoReport />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/prep" element={<AnalysisPrep />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/lifestyle-test" element={<LifestyleTest />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:step" element={<Register />} />
            <Route path="/register-staff" element={<RegisterStaff />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            {/* /email-unsubscribe — путь, который использует Lovable email-API
                в футере транзакционных/auth-писем. НЕ переименовывать. */}
            <Route path="/email-unsubscribe" element={<Unsubscribe />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/onboarding/:step" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            <Route path="/analyses/print" element={<AnalysesPrint />} />
            {/* Internal report preview для Playwright; защищён HMAC-токеном
                внутри самой страницы, никаких сессий/хедеров/сайдбара. */}
            <Route path="/internal/report-preview" element={<ReportPreview />} />
            {/* Полностраничный отчёт v2 (открытие в новой вкладке из ЛК). */}
            <Route path="/internal/report-v2" element={<ReportV2Standalone />} />

            {/* Protected routes with persistent DashboardLayout.
                OnboardingGate: пациент с активной подпиской и незавершённой
                анкетой (onboarding_completed=false) редиректится на /onboarding.
                Пути /onboarding/*, /subscription*, /admin/*, /profile — исключения. */}
            <Route
              element={
                <ProtectedRoute>
                  <DemoModeProvider>
                    <OnboardingGate>
                      <DashboardLayout>
                        <Suspense fallback={<RouteFallback />}>
                          <Outlet />
                        </Suspense>
                      </DashboardLayout>
                    </OnboardingGate>
                  </DemoModeProvider>
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
                path="/admin/payment-gateway"
                element={
                  <SuperAdminRoute>
                    <PaymentGatewaySettings />
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
              <Route
                path="/admin/labs"
                element={
                  <SuperAdminRoute>
                    <LabLocations />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/admin/promo-codes"
                element={
                  <SuperAdminRoute>
                    <PromoCodes />
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
            {/* Robokassa return pages */}
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/fail" element={<SubscriptionFail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </RegisterGuardProvider>
        </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
