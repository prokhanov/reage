import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useContext, useState, useEffect } from "react";
import { ViewAsPatientProvider, ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { AppSidebar } from "@/components/AppSidebar";

import { AnalysisBookingBanner } from "@/components/AnalysisBookingBanner";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemedLogo } from "@/components/ThemedLogo";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";

import Recommendations from "@/pages/Recommendations";
import Prescriptions from "@/pages/Prescriptions";

import MyState from "@/pages/MyState";
import Subscription from "@/pages/Subscription";
import HealthAssistant from "@/pages/HealthAssistant";
import HealthStrategy from "@/pages/HealthStrategy";
function SimulatedContent() {
  const { simPath } = useContext(ViewAsPatientContext);

  if (simPath.startsWith("/analyses/")) {
    const id = simPath.split("/")[2] || "";
    return <AnalysisDetail analysisId={id} />;
  }

  switch (simPath) {
    case "/dashboard":
      return <Dashboard />;
    case "/profile":
      return <Profile />;
    case "/analyses":
      return <Analyses />;
    case "/biomarkers":
      return <Dashboard />;
    case "/recommendations":
      return <Recommendations />;
    case "/prescriptions":
      return <Prescriptions />;
    case "/trends":
      return <Dashboard />;
    case "/my-state":
      return <MyState />;
    case "/subscription":
      return <Subscription />;
    case "/health-assistant":
      return <HealthAssistant />;
    case "/health-strategy":
      return <HealthStrategy />;
    default:
      return <Dashboard />;
  }
}

interface PatientViewDialogProps {
  patientId: string | null;
  onClose: () => void;
}

export function PatientViewDialog({ patientId, onClose }: PatientViewDialogProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  
  // Set initial state based on screen size
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    setSidebarOpen(isDesktop);
  }, []);
  
  if (!patientId) return null;

  return (
    <Dialog open={!!patientId} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full w-screen h-screen p-0 gap-0"
        hideCloseButton
      >
        <DialogTitle className="sr-only">Просмотр пациента</DialogTitle>
        <DialogDescription className="sr-only">Режим просмотра пациентского интерфейса</DialogDescription>
        <ViewAsPatientProvider userId={patientId} onExitView={onClose}>
          <div className="flex h-full w-full bg-gradient-dark">
            <AppSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/30 bg-secondary/90 backdrop-blur-xl">
              <div className="flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <ThemedLogo className="h-8 w-auto" />
                <div className="w-10" />
              </div>
            </header>
            
            <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
              <div className="pt-16 lg:pt-0 flex-shrink-0">
                <AnalysisBookingBanner />
              </div>
              <main className="flex-1 min-h-0 overflow-y-auto">
                <SimulatedContent />
              </main>
            </div>
          </div>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
