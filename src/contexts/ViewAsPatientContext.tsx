import { createContext, useState, ReactNode } from "react";

interface ViewAsPatientContextType {
  viewAsUserId: string | null;
  setViewAsUserId: (userId: string | null) => void;
  simPath: string;
  setSimPath: (path: string) => void;
}

export const ViewAsPatientContext = createContext<ViewAsPatientContextType>({
  viewAsUserId: null,
  setViewAsUserId: () => {},
  simPath: "/dashboard",
  setSimPath: () => {},
});

interface ViewAsPatientProviderProps {
  children: ReactNode;
  userId?: string | null;
}

export function ViewAsPatientProvider({ children, userId = null }: ViewAsPatientProviderProps) {
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(userId);
  const [simPath, setSimPath] = useState<string>("/dashboard");

  return (
    <ViewAsPatientContext.Provider value={{ viewAsUserId, setViewAsUserId, simPath, setSimPath }}>
      {children}
    </ViewAsPatientContext.Provider>
  );
}
