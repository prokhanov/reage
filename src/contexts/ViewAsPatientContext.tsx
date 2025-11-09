import { createContext, useState, ReactNode } from "react";

interface ViewAsPatientContextType {
  viewAsUserId: string | null;
  setViewAsUserId: (userId: string | null) => void;
  simPath: string;
  setSimPath: (path: string) => void;
  onExitView?: () => void;
}

export const ViewAsPatientContext = createContext<ViewAsPatientContextType>({
  viewAsUserId: null,
  setViewAsUserId: () => {},
  simPath: "/dashboard",
  setSimPath: () => {},
  onExitView: undefined,
});

interface ViewAsPatientProviderProps {
  children: ReactNode;
  userId?: string | null;
  onExitView?: () => void;
}

export function ViewAsPatientProvider({ children, userId = null, onExitView }: ViewAsPatientProviderProps) {
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(userId);
  const [simPath, setSimPath] = useState<string>("/dashboard");

  return (
    <ViewAsPatientContext.Provider value={{ viewAsUserId, setViewAsUserId, simPath, setSimPath, onExitView }}>
      {children}
    </ViewAsPatientContext.Provider>
  );
}
