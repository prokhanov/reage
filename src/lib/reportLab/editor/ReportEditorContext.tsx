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
  flushDraftsFromDom: () => Record<string, string>;
  resetDrafts: () => void;
  drafts: Record<string, string>;
}

const Ctx = createContext<ReportEditorState | null>(null);

export function ReportEditorProvider({ children, initialMode = "view" }: { children: ReactNode; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const setDraft = useCallback((id: string, markdown: string) => {
    setDrafts((d) => ({ ...d, [id]: markdown }));
  }, []);

  const getDraft = useCallback((id: string) => drafts[id], [drafts]);

  const flushDraftsFromDom = useCallback(() => {
    const w = window as typeof window & {
      __reportLabCollectDrafts?: () => Record<string, string>;
    };
    const liveDrafts = w.__reportLabCollectDrafts?.() ?? {};
    if (Object.keys(liveDrafts).length > 0) {
      setDrafts((current) => ({ ...current, ...liveDrafts }));
    }
    return { ...drafts, ...liveDrafts };
  }, [drafts]);

  const resetDrafts = useCallback(() => setDrafts({}), []);

  const value = useMemo(
    () => ({ mode, setMode, getDraft, setDraft, flushDraftsFromDom, resetDrafts, drafts }),
    [mode, getDraft, setDraft, flushDraftsFromDom, resetDrafts, drafts],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Read-only снапшот драфтов — используется при `renderToStaticMarkup` внутри
 * PagedReportPreview: HTML собирается синхронно, поэтому нам нужен провайдер,
 * который просто отдаёт значения без мутаций.
 */
export function StaticReportEditorProvider({
  drafts,
  mode,
  children,
}: {
  drafts: Record<string, string>;
  mode: Mode;
  children: ReactNode;
}) {
  const value = useMemo<ReportEditorState>(
    () => ({
      mode,
      setMode: () => {},
      drafts,
      getDraft: (id) => drafts[id],
      setDraft: () => {},
      flushDraftsFromDom: () => drafts,
      resetDrafts: () => {},
    }),
    [drafts, mode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportEditor(): ReportEditorState | null {
  return useContext(Ctx);
}
