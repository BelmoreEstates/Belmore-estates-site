/**
 * The visual editor (lazy-loaded on /editor only — never part of visitor pages).
 * Puck holds the current page's sections in `content` and the whole site doc
 * (texts, other pages, menu, theme) in root props, so every change — text,
 * photo, section, page, menu, theme — goes through Puck's undo/redo history.
 */
import "@puckeditor/core/no-external.css";
import "./editor.css";
import {
  ActionBar,
  Puck,
  useGetPuck,
  type Data,
  type Overrides,
  type Plugin,
} from "@puckeditor/core";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSiteData } from "@/components/site/text";
import { loadEditor, publishSite, setPreview, type EditorState } from "@/server/editor";
import type { PublicData } from "@/server/public";
import { isLibraryType, pagePath, systemPageBySlug } from "@/site/doc";
import { buildConfig } from "./config";
import { rootProps, usePuck, useRoot } from "./context";
import { Dialog, EditorDialogs, errorText } from "./dialogs";
import {
  HistoryPanel,
  PagesPanel,
  SettingsPanel,
  TextsPanel,
  ThemePanel,
  pageList,
  useSwitchPage,
} from "./panels";
import { SessionProvider, dataForPage, docFromData, useSession } from "./session";
import { askConfirm, toast } from "./store";

const VIEWPORTS = [
  { width: 1366, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
  { width: 768, height: "auto" as const, label: "Tablet", icon: "Tablet" as const },
  { width: 390, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
];

/** Visitor URL for an editor page (detail templates use the first plan / lot). */
function visitorPath(slug: string, base: PublicData) {
  const tpl = systemPageBySlug[slug]?.template;
  if (tpl === "plan") return base.plans[0] ? `/plans/${base.plans[0].slug}` : "/plans";
  if (tpl === "lot") return base.lots[0] ? `/lots/${base.lots[0].slug}` : "/lots";
  return pagePath(slug);
}

/* ---------------------------------------------------------------- toolbar */

function PublishDialog({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const publish = async () => {
    setBusy(true);
    setError("");
    try {
      await session.flush();
      await publishSite({ data: { revision: session.revision(), note: note.trim() } });
      session.markPublished(session.me.email);
      session.bumpVersions();
      toast("Published! Visitors now see your changes.");
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="Publish your changes?"
      labelId="be-publish-title"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <button type="button" className="be-btn" onClick={onClose} disabled={busy}>
            Not yet
          </button>
          <button
            type="button"
            className="be-btn be-primary"
            onClick={publish}
            disabled={busy}
            data-publish-yes=""
          >
            {busy ? "Publishing…" : "Yes, publish to the live site"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0 }}>
        Everyone who visits the website will see your draft — all pages, the menu and the colors —
        as soon as you click publish.
      </p>
      <p>
        A copy is saved in <strong>Versions</strong>, so you can always go back.
      </p>
      <label className="be-field">
        <span>What changed? (optional, helps you find this version later)</span>
        <input
          className="be-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g. New open house page"
        />
      </label>
      {error ? (
        <p className="be-err" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

const STATUS: Record<string, string> = {
  saved: "All changes saved",
  unsaved: "Saving soon…",
  saving: "Saving…",
  error: "Not saved — retrying",
  conflict: "Changed elsewhere — reload",
};

function Toolbar({ base }: { base: PublicData }) {
  const session = useSession();
  const { slug, site } = useRoot();
  const history = usePuck((s) => s.history);
  const width = usePuck((s) => s.appState.ui.viewports.current.width);
  const dispatch = usePuck((s) => s.dispatch);
  const viewports = usePuck((s) => s.appState.ui.viewports);
  const switchPage = useSwitchPage();
  const [publishing, setPublishing] = useState(false);
  const pages = pageList(site);

  const leave = async (href: string) => {
    try {
      await session.flush();
    } catch (err) {
      toast(errorText(err), "error");
      return;
    }
    window.location.href = href;
  };
  const preview = async () => {
    const win = window.open("about:blank", "_blank");
    try {
      await session.flush();
      await setPreview({ data: { on: true } });
      if (win) win.location.href = visitorPath(slug, base);
      else window.location.href = visitorPath(slug, base);
    } catch (err) {
      win?.close();
      toast(errorText(err), "error");
    }
  };

  return (
    <header className="be-toolbar" data-editor-toolbar="">
      <div className="be-tb-group">
        <span className="be-brand">Belmore editor</span>
        <label className="be-page-pick">
          <span>Editing page</span>
          <select
            className="be-tb-select"
            value={slug}
            onChange={(e) => switchPage(e.target.value)}
            aria-label="Page to edit"
          >
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="be-tb-btn"
          onClick={() => history.back()}
          disabled={!history.hasPast}
          title="Undo (Ctrl+Z)"
          data-undo=""
        >
          ↶ Undo
        </button>
        <button
          type="button"
          className="be-tb-btn"
          onClick={() => history.forward()}
          disabled={!history.hasFuture}
          title="Redo (Ctrl+Shift+Z)"
          data-redo=""
        >
          ↷ Redo
        </button>
      </div>
      <div className="be-seg be-devices" role="radiogroup" aria-label="Screen size">
        {VIEWPORTS.map((v) => (
          <button
            key={v.label}
            type="button"
            role="radio"
            aria-checked={width === v.width}
            aria-pressed={width === v.width}
            data-viewport={v.label}
            className="be-tb-btn"
            onClick={() =>
              dispatch({
                type: "setUi",
                ui: { viewports: { ...viewports, current: { width: v.width, height: "auto" } } },
              })
            }
          >
            {v.label === "Desktop" ? "🖥" : v.label === "Tablet" ? "▭" : "📱"} {v.label}
          </button>
        ))}
      </div>
      <div className="be-tb-group">
        <span
          className={`be-status ${session.status === "error" || session.status === "conflict" ? "be-bad" : ""}`}
          title={session.statusText}
          role="status"
        >
          {STATUS[session.status]}
          {session.status === "saved"
            ? session.unpublished
              ? " · not published yet"
              : " · live site is up to date"
            : ""}
        </span>
        <button type="button" className="be-tb-btn" onClick={preview} data-preview="">
          👁 Preview
        </button>
        <button
          type="button"
          className="be-tb-btn be-primary"
          onClick={() => setPublishing(true)}
          disabled={session.status === "conflict"}
          data-publish=""
        >
          Publish…
        </button>
        <button
          type="button"
          className="be-tb-btn"
          onClick={() => leave(visitorPath(slug, base))}
          title="Back to the website"
        >
          Exit
        </button>
      </div>
      {publishing ? <PublishDialog onClose={() => setPublishing(false)} /> : null}
    </header>
  );
}

/* ------------------------------------------------------------- action bar */

function SectionActions({ label, children }: { label?: string; children: ReactNode }) {
  const getPuck = useGetPuck();
  const selected = usePuck((s) => s.selectedItem);
  const sel = usePuck((s) => s.appState.ui.itemSelector);
  const count = usePuck((s) => s.appState.data.content.length);
  if (!selected || !sel) return <ActionBar label={label}>{children}</ActionBar>;
  const id = selected.props.id as string;
  const hidden = !!selected.props.hidden;
  const zone = sel.zone ?? "root:default-zone";
  const index = sel.index;
  const move = (d: number) => {
    const { dispatch } = getPuck();
    dispatch({
      type: "reorder",
      sourceIndex: index,
      destinationIndex: index + d,
      destinationZone: zone,
    });
    dispatch({ type: "setUi", ui: { itemSelector: { index: index + d, zone } } });
  };
  const toggle = () => {
    const { dispatch, getItemById } = getPuck();
    const item = getItemById(id);
    if (item)
      dispatch({
        type: "replace",
        destinationIndex: index,
        destinationZone: zone,
        data: { ...item, props: { ...item.props, hidden: !hidden } },
      });
    toast(
      hidden
        ? "Section visible to visitors again"
        : "Section hidden from visitors (still shown faded here)",
    );
  };
  const remove = () =>
    askConfirm({
      title: "Delete this section?",
      body: `“${label ?? "This section"}” will be removed from the page. You can undo this, or use Hide instead to keep it for later.${isLibraryType(selected.type as string) ? "" : "\nOriginal sections can be put back from “Add a section”."}`,
      confirmLabel: "Delete section",
      danger: true,
      onConfirm: () => {
        const { dispatch } = getPuck();
        dispatch({ type: "setUi", ui: { itemSelector: null } });
        dispatch({ type: "remove", index, zone });
        toast("Section deleted — Undo brings it back");
      },
    });
  return (
    <div className="be-actions">
      <ActionBar label={label}>
        <ActionBar.Group>
          <ActionBar.Action label="Move up" onClick={() => move(-1)} disabled={index === 0}>
            ↑
          </ActionBar.Action>
          <ActionBar.Action label="Move down" onClick={() => move(1)} disabled={index >= count - 1}>
            ↓
          </ActionBar.Action>
          <ActionBar.Action
            label={hidden ? "Show to visitors" : "Hide from visitors"}
            onClick={toggle}
          >
            {hidden ? "Show" : "Hide"}
          </ActionBar.Action>
          {children}
          <ActionBar.Action label="Delete section" onClick={remove}>
            🗑
          </ActionBar.Action>
        </ActionBar.Group>
      </ActionBar>
    </div>
  );
}

function FieldsPanel({ children, itemSelector }: { children: ReactNode; itemSelector?: unknown }) {
  if (!itemSelector)
    return (
      <div className="be-panel">
        <h3 style={{ marginTop: 0 }}>Section settings</h3>
        <p className="be-help">
          Click a section on the page to change its background, spacing and other settings here.
          Click any text on the page to type over it, or any photo to replace it.
        </p>
      </div>
    );
  return <div className="be-fields">{children}</div>;
}

/* ------------------------------------------------------------------ host */

const icon = (s: string) => (
  <span style={{ fontSize: 18 }} aria-hidden>
    {s}
  </span>
);
const PLUGINS: Plugin[] = [
  { name: "pages", label: "Pages & menu", icon: icon("📄"), render: () => <PagesPanel /> },
  { name: "theme", label: "Colors & fonts", icon: icon("🎨"), render: () => <ThemePanel /> },
  { name: "texts", label: "All text", icon: icon("🔤"), render: () => <TextsPanel /> },
  {
    name: "settings",
    label: "Social & footer",
    icon: icon("⚙️"),
    render: () => <SettingsPanel />,
  },
  { name: "history", label: "Versions", icon: icon("🕘"), render: () => <HistoryPanel /> },
];

function PuckHost({
  initial,
  base,
  page,
}: {
  initial: EditorState;
  base: PublicData;
  page: string;
}) {
  const session = useSession();
  const startData = useMemo(() => dataForPage(initial.doc, page), [initial, page]);
  const startSlug = rootProps(startData).slug;
  const [view, setView] = useState({
    slug: startSlug,
    types: (startData.content ?? []).map((c) => c.type as string).join(","),
  });
  const config = useMemo(() => buildConfig(base, view.slug, view.types.split(",")), [base, view]);

  const onChange = useCallback(
    (data: Data) => {
      const slug = rootProps(data).slug;
      const types = data.content.map((c) => c.type as string).join(",");
      setView((v) => (v.slug === slug && v.types === types ? v : { slug, types }));
      session.schedule(docFromData(data));
    },
    [session],
  );

  const overrides = useMemo<Partial<Overrides>>(
    () => ({
      header: () => <Toolbar base={base} />,
      actionBar: ({ label, children }) => <SectionActions label={label}>{children}</SectionActions>,
      fields: ({ children, itemSelector }) => (
        <FieldsPanel itemSelector={itemSelector}>{children}</FieldsPanel>
      ),
    }),
    [base],
  );

  return (
    <Puck
      config={config}
      data={startData}
      onChange={onChange}
      plugins={PLUGINS}
      overrides={overrides}
      permissions={{ delete: false }}
      viewports={VIEWPORTS}
      ui={
        {
          viewports: {
            current: { width: 1366, height: "auto" },
            controlsVisible: true,
            options: VIEWPORTS,
          },
        } as never
      }
      iframe={{ enabled: true, waitForStyles: true }}
      height="100vh"
      headerTitle="Belmore editor"
      dictionary={
        {
          "plugin-blocks": "Add a section",
          "plugin-outline": "Sections list",
          "plugin-fields": "Section settings",
          "action-duplicate": "Duplicate section",
          "drawer-category-other": "More",
        } as never
      }
    />
  );
}

export default function EditorApp({ page }: { page: string }) {
  const base = useSiteData();
  const [state, setState] = useState<EditorState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadEditor()
      .then((s) => setState(s as EditorState))
      .catch((err) => setError(errorText(err)));
  }, []);

  if (error)
    return (
      <div className="be-center">
        <div className="be-dialog" style={{ position: "static" }}>
          <header>
            <h2>Please sign in to edit the site</h2>
          </header>
          <div className="be-body">
            <p>The editor is only for Belmore Estates owners and admins.</p>
            {/signed out/i.test(error) ? null : <p className="be-help">{error}</p>}
          </div>
          <footer>
            <a className="be-btn be-primary" href="/login">
              Sign in
            </a>
          </footer>
        </div>
      </div>
    );
  if (!state)
    return (
      <div className="be-center" role="status">
        Opening the editor…
      </div>
    );
  return (
    <div className="be-app">
      <SessionProvider initial={state}>
        <PuckHost initial={state} base={base} page={page} />
        <EditorDialogs />
      </SessionProvider>
    </div>
  );
}
