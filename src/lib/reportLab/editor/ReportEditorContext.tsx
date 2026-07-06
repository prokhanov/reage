import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CoverOverrides } from "../types";

type Mode = "view" | "edit";

interface ReportEditorState {
  mode: Mode;
  setMode: (m: Mode) => void;
  getDraft: (id: string) => string | undefined;
  setDraft: (id: string, markdown: string) => void;
  flushDraftsFromDom: () => Record<string, string>;
  resetDrafts: () => void;
  drafts: Record<string, string>;
  /** Правки обложки в процессе редактирования (не сохранённые). */
  coverOverrides: CoverOverrides | null;
  setCoverOverrides: (v: CoverOverrides | null) => void;
  /** Оригинальный snapshot из БД — нужен для точного сравнения при сохранении. */
  initialCoverOverrides: CoverOverrides | null;
}

const Ctx = createContext<ReportEditorState | null>(null);

export function ReportEditorProvider({
  children,
  initialMode = "view",
  initialCoverOverrides = null,
}: {
  children: ReactNode;
  initialMode?: Mode;
  initialCoverOverrides?: CoverOverrides | null;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [coverOverrides, setCoverOverrides] = useState<CoverOverrides | null>(
    initialCoverOverrides,
  );

  // Если родитель перезагрузил report — синхронизируем стартовые overrides.
  useEffect(() => {
    setCoverOverrides(initialCoverOverrides);
  }, [initialCoverOverrides]);

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

  const resetDrafts = useCallback(() => {
    setDrafts({});
    setCoverOverrides(initialCoverOverrides);
  }, [initialCoverOverrides]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      getDraft,
      setDraft,
      flushDraftsFromDom,
      resetDrafts,
      drafts,
      coverOverrides,
      setCoverOverrides,
      initialCoverOverrides,
    }),
    [
      mode,
      getDraft,
      setDraft,
      flushDraftsFromDom,
      resetDrafts,
      drafts,
      coverOverrides,
      initialCoverOverrides,
    ],
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
  coverOverrides = null,
  children,
}: {
  drafts: Record<string, string>;
  mode: Mode;
  coverOverrides?: CoverOverrides | null;
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
      coverOverrides,
      setCoverOverrides: () => {},
      initialCoverOverrides: coverOverrides,
    }),
    [drafts, mode, coverOverrides],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportEditor(): ReportEditorState | null {
  return useContext(Ctx);
}
