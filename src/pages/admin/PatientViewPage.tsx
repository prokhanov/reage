import { useParams } from "react-router-dom";
import { ViewAsPatientProvider } from "@/contexts/ViewAsPatientContext";
import { SimulatedPatientRouter } from "@/components/admin/SimulatedPatientRouter";

export default function PatientViewPage() {
  const { userId } = useParams<{ userId: string }>();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Пациент не найден</p>
      </div>
    );
  }

  return (
    <ViewAsPatientProvider userId={userId}>
      <SimulatedPatientRouter />
    </ViewAsPatientProvider>
  );
}
