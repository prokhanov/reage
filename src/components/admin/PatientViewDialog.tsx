import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { ViewAsPatientProvider } from "@/contexts/ViewAsPatientContext";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import Biomarkers from "@/pages/Biomarkers";
import Recommendations from "@/pages/Recommendations";
import Trends from "@/pages/Trends";
import MyState from "@/pages/MyState";

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

            {/* Routes */}
            <MemoryRouter initialEntries={["/dashboard"]}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/analyses" element={<Analyses />} />
                <Route path="/analyses/:id" element={<AnalysisDetail />} />
                <Route path="/biomarkers" element={<Biomarkers />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/my-state" element={<MyState />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MemoryRouter>
          </div>
        </ViewAsPatientProvider>
      </DialogContent>
    </Dialog>
  );
}
