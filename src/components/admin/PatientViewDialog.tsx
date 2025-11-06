import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

import { ViewAsPatientProvider } from "@/contexts/ViewAsPatientContext";
import Dashboard from "@/pages/Dashboard";

interface PatientViewDialogProps {
  patientId: string | null;
  onClose: () => void;
}

export function PatientViewDialog({ patientId, onClose }: PatientViewDialogProps) {
  if (!patientId) return null;

  return (
    <Dialog open={!!patientId} onOpenChange={onClose}>
      <DialogContent className="max-w-none h-screen w-screen p-0 m-0 border-0 rounded-none">
        <ViewAsPatientProvider userId={patientId}>
          <div className="h-screen w-full flex flex-col relative">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-[100]">
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

            {/* Patient view content (no nested router) */}
            <Dashboard />
          </div>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
