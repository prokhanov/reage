import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Mode = "view" | "edit";

interface ReportEditorState {
  mode: Mode;
  setMode: (m: Mode) => void;
  getDraft: (id: string) => string | undefined;
  setDraft: (id: string, markdown: string) => void;
  resetDrafts: () => void;
  drafts: Record<string, string>;
}

const Ctx = createContext<ReportEditorState | null>(null);

export function ReportEditorProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("view");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const setDraft = useCallback((id: string, markdown: string) => {
    setDrafts((d) => ({ ...d, [id]: markdown }));
  }, []);

  const getDraft = useCallback((id: string) => drafts[id], [drafts]);

  const resetDrafts = useCallback(() => setDrafts({}), []);

  const value = useMemo(
    () => ({ mode, setMode, getDraft, setDraft, resetDrafts, drafts }),
    [mode, getDraft, setDraft, resetDrafts, drafts],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportEditor(): ReportEditorState | null {
  return useContext(Ctx);
}
