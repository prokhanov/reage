import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Biomarkers from "./pages/Biomarkers";
import Recommendations from "./pages/Recommendations";
import Prescriptions from "./pages/Prescriptions";
import Trends from "./pages/Trends";
import MyState from "./pages/MyState";
import HealthAssistant from "./pages/HealthAssistant";
import AISettings from "./pages/admin/AISettings";
import DataManagement from "./pages/admin/DataManagement";
import Patients from "./pages/admin/Patients";
import PatientProfile from "./pages/admin/PatientProfile";
import UserManagement from "./pages/admin/UserManagement";
import RegisterStaff from "./pages/RegisterStaff";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-staff" element={<RegisterStaff />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Dashboard />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyses"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Analyses />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyses/:id"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <AnalysisDetail />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/biomarkers"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Biomarkers />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Recommendations />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Prescriptions />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <Trends />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-state"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <MyState />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-assistant"
            element={
              <ProtectedRoute>
                <PatientRoute>
                  <HealthAssistant />
                </PatientRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ai-settings"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <AdminModuleRoute module="ai_settings">
                    <DashboardLayout>
                      <AISettings />
                    </DashboardLayout>
                  </AdminModuleRoute>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data-management"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <AdminModuleRoute module="data_management">
                    <DashboardLayout>
                      <DataManagement />
                    </DashboardLayout>
                  </AdminModuleRoute>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <AdminModuleRoute module="patients">
                    <DashboardLayout>
                      <Patients />
                    </DashboardLayout>
                  </AdminModuleRoute>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/:userId"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <AdminModuleRoute module="patients">
                    <DashboardLayout>
                      <PatientProfile />
                    </DashboardLayout>
                  </AdminModuleRoute>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <AdminModuleRoute module="user_management">
                    <DashboardLayout>
                      <UserManagement />
                    </DashboardLayout>
                  </AdminModuleRoute>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
