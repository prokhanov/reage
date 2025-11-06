import { createContext, useState, ReactNode } from "react";

interface ViewAsPatientContextType {
  viewAsUserId: string | null;
  setViewAsUserId: (userId: string | null) => void;
}

export const ViewAsPatientContext = createContext<ViewAsPatientContextType>({
  viewAsUserId: null,
  setViewAsUserId: () => {},
});

interface ViewAsPatientProviderProps {
  children: ReactNode;
  userId?: string | null;
}

export function ViewAsPatientProvider({ children, userId = null }: ViewAsPatientProviderProps) {
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(userId);

  return (
    <ViewAsPatientContext.Provider value={{ viewAsUserId, setViewAsUserId }}>
      {children}
    </ViewAsPatientContext.Provider>
  );
}
