import { useContext } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Analyses from "@/pages/Analyses";
import AnalysisDetail from "@/pages/AnalysisDetail";
import Biomarkers from "@/pages/Biomarkers";
import Recommendations from "@/pages/Recommendations";
import Prescriptions from "@/pages/Prescriptions";
import Trends from "@/pages/Trends";
import MyState from "@/pages/MyState";
import HealthAssistant from "@/pages/HealthAssistant";

export function SimulatedPatientRouter() {
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
    case "/health-assistant":
      return <HealthAssistant />;
    default:
      return <Dashboard />;
  }
}
