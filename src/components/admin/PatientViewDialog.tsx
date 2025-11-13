import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useContext } from "react";
import { ViewAsPatientProvider, ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { AppSidebar } from "@/components/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisBookingBanner } from "@/components/AnalysisBookingBanner";
import { SidebarProvider } from "@/components/ui/sidebar";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import Biomarkers from "@/pages/Biomarkers";
import Recommendations from "@/pages/Recommendations";
import Prescriptions from "@/pages/Prescriptions";
import Trends from "@/pages/Trends";
import MyState from "@/pages/MyState";
import Subscription from "@/pages/Subscription";
import { useState } from "react";

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
      return <Biomarkers />;
    case "/recommendations":
      return <Recommendations />;
    case "/prescriptions":
      return <Prescriptions />;
    case "/trends":
      return <Trends />;
    case "/my-state":
      return <MyState />;
    case "/subscription":
      return <Subscription />;
    default:
      return <Dashboard />;
  }
}

interface PatientViewDialogProps {
  patientId: string | null;
  onClose: () => void;
}

export function PatientViewDialog({ patientId, onClose }: PatientViewDialogProps) {
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
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-full w-full bg-gradient-dark">
              <AppSidebar />
              
              <ScrollArea className="flex-1 h-screen">
                <div className="pt-16 lg:pt-0">
                  <AnalysisBookingBanner />
                </div>
                <main className="pb-10">
                  <SimulatedContent />
                </main>
              </ScrollArea>
            </div>
          </SidebarProvider>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
