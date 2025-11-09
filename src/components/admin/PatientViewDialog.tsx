import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContext } from "react";
import { ViewAsPatientProvider, ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import Biomarkers from "@/pages/Biomarkers";
import Recommendations from "@/pages/Recommendations";
import Prescriptions from "@/pages/Prescriptions";
import Trends from "@/pages/Trends";
import MyState from "@/pages/MyState";

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
        className="max-w-full w-screen h-screen p-0 gap-0 overflow-auto"
        hideCloseButton
      >
        <ViewAsPatientProvider userId={patientId} onExitView={onClose}>
          <DashboardLayout>
            <SimulatedContent />
          </DashboardLayout>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
