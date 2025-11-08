import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AdminModuleRoute } from "@/components/AdminModuleRoute";
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

const queryClient = new QueryClient();

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
                <Dashboard />
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
                <Analyses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyses/:id"
            element={
              <ProtectedRoute>
                <AnalysisDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/biomarkers"
            element={
              <ProtectedRoute>
                <Biomarkers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <Recommendations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute>
                <Trends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-state"
            element={
              <ProtectedRoute>
                <MyState />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-assistant"
            element={
              <ProtectedRoute>
                <HealthAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ai-settings"
            element={
              <ProtectedRoute>
                <AdminModuleRoute module="ai_settings">
                  <DashboardLayout>
                    <AISettings />
                  </DashboardLayout>
                </AdminModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data-management"
            element={
              <ProtectedRoute>
                <AdminModuleRoute module="data_management">
                  <DashboardLayout>
                    <DataManagement />
                  </DashboardLayout>
                </AdminModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute>
                <AdminModuleRoute module="patients">
                  <DashboardLayout>
                    <Patients />
                  </DashboardLayout>
                </AdminModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/:userId"
            element={
              <ProtectedRoute>
                <AdminModuleRoute module="patients">
                  <DashboardLayout>
                    <PatientProfile />
                  </DashboardLayout>
                </AdminModuleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute>
                <AdminModuleRoute module="user_management">
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </AdminModuleRoute>
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
