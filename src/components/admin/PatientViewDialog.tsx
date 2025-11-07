import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useContext, useState } from "react";
import { ViewAsPatientProvider, ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { CreateAnalysisDialog } from "@/components/admin/CreateAnalysisDialog";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
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
  const { isSuperAdmin } = useSuperAdminCheck();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!patientId) return null;

  return (
    <Dialog open={!!patientId} onOpenChange={onClose}>
      <DialogContent className="max-w-none h-screen w-screen p-0 m-0 border-0 rounded-none overflow-hidden">
        <ViewAsPatientProvider userId={patientId}>
          <div className="h-screen w-full flex flex-col relative overflow-hidden">
            {/* Action buttons */}
            <div className="absolute top-4 right-4 z-[100] flex gap-2">
              {isSuperAdmin && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить анализ
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="default"
                size="sm"
                className="shadow-lg"
              >
                <X className="h-4 w-4 mr-2" />
                Закрыть просмотр
              </Button>
            </div>

            {/* Patient view content with scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <SimulatedContent />
            </div>
          </div>

          <CreateAnalysisDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen}
          />
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
