/**
 * Editor session: autosave of the draft (debounced, revision-checked), the
 * publish state, and helpers to turn Puck's data into the site doc.
 */
import type { Data } from "@puckeditor/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { saveDraft, type EditorState } from "@/server/editor";
import { compactDoc, normalizeDoc, stableJson, type Block, type SiteDoc } from "@/site/doc";
import { makeRoot, rootOf } from "./context";
import { errorText } from "./dialogs";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

/** Puck data (current page in `content`, everything else in root props) → the site doc. */
export function docFromData(data: Data): SiteDoc {
  const { slug, site } = rootOf(data);
  const content: Block[] = (data.content ?? []).map((item) => ({
    type: item.type as string,
    props: item.props as Block["props"],
  }));
  const page = site.pages[slug] ?? { title: slug, content: [] };
  return { ...site, pages: { ...site.pages, [slug]: { ...page, content } } };
}

/** Site doc + page → initial Puck data. */
export function dataForPage(site: SiteDoc, slug: string): Data {
  const full = normalizeDoc(site);
  const page = full.pages[slug] ? slug : "home";
  return {
    root: makeRoot(page, full) as never,
    content: full.pages[page].content as Data["content"],
  };
}

type Session = {
  me: EditorState["me"];
  status: SaveStatus;
  statusText: string;
  unpublished: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  revision: () => number;
  /** Queue an autosave of this doc (no-op when unchanged). */
  schedule: (doc: SiteDoc) => void;
  /** Save now if anything is pending; resolves when the server has it. */
  flush: () => Promise<void>;
  /** The server's draft changed (restore / discard): take its revision. */
  adopt: (doc: SiteDoc, revision: number, unpublished: boolean) => void;
  markPublished: (by: string) => void;
  versionsTick: number;
  bumpVersions: () => void;
};

const Ctx = createContext<Session | null>(null);
export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("No editor session");
  return s;
};

export function SessionProvider({
  initial,
  children,
}: {
  initial: EditorState;
  children: ReactNode;
}) {
  const revisionRef = useRef(initial.revision);
  const savedRef = useRef(stableJson(compactDoc(normalizeDoc(initial.doc))));
  const pendingRef = useRef<SiteDoc | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [statusText, setStatusText] = useState("");
  const [unpublished, setUnpublished] = useState(initial.unpublished);
  const [published, setPublished] = useState({ at: initial.publishedAt, by: initial.publishedBy });
  const [versionsTick, setTick] = useState(0);
  const stopped = useRef(false);

  const runSave = useCallback(async (): Promise<void> => {
    if (inflight.current) await inflight.current;
    const doc = pendingRef.current;
    if (!doc || stopped.current) return;
    pendingRef.current = null;
    const compact = compactDoc(doc);
    const json = stableJson(compact);
    if (json === savedRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    const p = (async () => {
      try {
        const res = await saveDraft({ data: { doc: compact, revision: revisionRef.current } });
        revisionRef.current = res.revision;
        savedRef.current = json;
        setUnpublished(res.unpublished);
        setStatus(pendingRef.current ? "unsaved" : "saved");
        setStatusText("");
      } catch (err) {
        const text = errorText(err);
        if (/another window/.test(text)) {
          stopped.current = true;
          setStatus("conflict");
        } else {
          pendingRef.current = pendingRef.current ?? doc;
          setStatus("error");
        }
        setStatusText(text);
      }
    })();
    inflight.current = p;
    await p;
    inflight.current = null;
    if (pendingRef.current && !stopped.current)
      timer.current = setTimeout(() => void runSave(), 1200);
  }, []);

  const schedule = useCallback(
    (doc: SiteDoc) => {
      if (stopped.current) return;
      if (stableJson(compactDoc(doc)) === savedRef.current && !pendingRef.current) return;
      pendingRef.current = doc;
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void runSave(), 1200);
    },
    [runSave],
  );

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    await runSave();
    if (inflight.current) await inflight.current;
    if (stopped.current)
      throw new Error(
        "This draft was changed in another window. Reload the page to get the latest version.",
      );
    if (pendingRef.current)
      throw new Error(
        "Your latest changes couldn't be saved yet. Check your connection and try again.",
      );
  }, [runSave]);

  const adopt = useCallback((doc: SiteDoc, revision: number, unpub: boolean) => {
    clearTimeout(timer.current);
    pendingRef.current = null;
    revisionRef.current = revision;
    savedRef.current = stableJson(compactDoc(normalizeDoc(doc)));
    setUnpublished(unpub);
    setStatus("saved");
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current || inflight.current) {
        void runSave();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [runSave]);

  const value = useMemo<Session>(
    () => ({
      me: initial.me,
      status,
      statusText,
      unpublished,
      publishedAt: published.at,
      publishedBy: published.by,
      revision: () => revisionRef.current,
      schedule,
      flush,
      adopt,
      markPublished: (by) => {
        setPublished({ at: new Date().toISOString(), by });
        setUnpublished(false);
      },
      versionsTick,
      bumpVersions: () => setTick((t) => t + 1),
    }),
    [initial.me, status, statusText, unpublished, published, schedule, flush, adopt, versionsTick],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
