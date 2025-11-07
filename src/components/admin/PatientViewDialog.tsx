import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContext } from "react";
import { ViewAsPatientProvider, ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import Biomarkers from "@/pages/Biomarkers";
import Recommendations from "@/pages/Recommendations";
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
      <DialogContent className="max-w-none h-screen w-screen p-0 m-0 border-0 rounded-none overflow-hidden">
        <ViewAsPatientProvider userId={patientId}>
          <div className="h-screen w-full flex flex-col relative overflow-hidden">
            {/* Patient view content with scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <SimulatedContent />
            </div>
          </div>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
