/** Left-sidebar panels: Pages & menu, Theme, Version history, All text. */
import { useGetPuck } from "@puckeditor/core";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { blockDefs, blockDefaults } from "@/data/content";
import { discardDraft, listVersions, restoreVersion, type VersionRow } from "@/server/editor";
import {
  BELMORE_COLORS,
  COLOR_PRESETS,
  COLOR_ROLES,
  DEFAULT_FONTS,
  FONTS,
  HEX_RE,
  SWATCHES,
  SYSTEM_PAGES,
  RESERVED_SLUGS,
  SLUG_RE,
  isExternalHref,
  navOf,
  normalizeDoc,
  systemPageBySlug,
  type NavItem,
  type SiteDoc,
  type Theme,
} from "@/site/doc";
import { makeRoot, rootOf, setText, useRoot, useSiteUpdater } from "./context";
import { errorText } from "./dialogs";
import { docFromData, useSession } from "./session";
import { askConfirm, openImageDialog, toast } from "./store";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

/** Input that commits on blur / Enter (so typing isn't one undo step per key). */
function BlurInput({
  value,
  onCommit,
  multiline,
  ...rest
}: { value: string; onCommit: (v: string) => void; multiline?: boolean } & Record<
  string,
  unknown
>) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onCommit(v);
  return multiline ? (
    <textarea
      className="be-input"
      rows={3}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      {...rest}
    />
  ) : (
    <input
      className="be-input"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      {...rest}
    />
  );
}

function Section({ title, children, help }: { title: string; children: ReactNode; help?: string }) {
  return (
    <section className="be-section">
      <h3>{title}</h3>
      {help ? <p className="be-help">{help}</p> : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ page switch */

export function useSwitchPage() {
  const getPuck = useGetPuck();
  return useCallback(
    (slug: string, siteOverride?: (site: SiteDoc) => SiteDoc) => {
      const { appState, dispatch } = getPuck();
      let site = docFromData(appState.data);
      if (siteOverride) site = siteOverride(site);
      site = normalizeDoc(site);
      const target = site.pages[slug] ? slug : "home";
      dispatch({
        type: "setData",
        data: { root: makeRoot(target, site), content: site.pages[target].content as never },
        recordHistory: true,
      } as never);
      dispatch({ type: "setUi", ui: { itemSelector: null } });
      const url = new URL(window.location.href);
      url.searchParams.set("page", target);
      window.history.replaceState(null, "", url);
    },
    [getPuck],
  );
}

export function pageList(site: SiteDoc) {
  const system = SYSTEM_PAGES.map((p) => ({
    slug: p.slug,
    title: p.title,
    path: p.path,
    system: true,
    draftOnly: false,
  }));
  const custom = Object.entries(site.pages)
    .filter(([slug]) => !systemPageBySlug[slug])
    .map(([slug, p]) => ({
      slug,
      title: p.title,
      path: `/${slug}`,
      system: false,
      draftOnly: !!p.draftOnly,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return [...system, ...custom];
}

/* ---------------------------------------------------------- pages & menu */

function navLabel(site: SiteDoc, item: NavItem) {
  if (item.labelKey) return site.texts[item.labelKey] ?? blockDefaults[item.labelKey] ?? item.href;
  return item.label ?? item.href;
}

function PageSeo({ slug }: { slug: string }) {
  const { site } = useRoot();
  const update = useSiteUpdater();
  const sys = systemPageBySlug[slug];
  const page = site.pages[slug];
  if (sys) {
    const tk = `${sys.seoPrefix}.seo.title`;
    const dk = `${sys.seoPrefix}.seo.description`;
    return (
      <div className="be-sub">
        <label className="be-field">
          <span>Title in Google &amp; browser tab</span>
          <BlurInput
            value={site.texts[tk] ?? blockDefaults[tk] ?? ""}
            onCommit={(v) => update((s) => setText(s, tk, v))}
            maxLength={120}
          />
        </label>
        <label className="be-field">
          <span>Description in Google</span>
          <BlurInput
            multiline
            value={site.texts[dk] ?? blockDefaults[dk] ?? ""}
            onCommit={(v) => update((s) => setText(s, dk, v))}
            maxLength={320}
          />
        </label>
      </div>
    );
  }
  const set = (patch: Partial<typeof page>) =>
    update((s) => ({ ...s, pages: { ...s.pages, [slug]: { ...s.pages[slug], ...patch } } }));
  return (
    <div className="be-sub">
      <label className="be-field">
        <span>Page name</span>
        <BlurInput
          value={page.title}
          onCommit={(v) => v.trim() && set({ title: v.trim().slice(0, 80) })}
          maxLength={80}
        />
      </label>
      <label className="be-field">
        <span>Title in Google &amp; browser tab</span>
        <BlurInput
          value={page.seoTitle ?? ""}
          onCommit={(v) => set({ seoTitle: v })}
          maxLength={120}
          placeholder={`${page.title} | Belmore Estates`}
        />
      </label>
      <label className="be-field">
        <span>Description in Google</span>
        <BlurInput
          multiline
          value={page.seoDescription ?? ""}
          onCommit={(v) => set({ seoDescription: v })}
          maxLength={320}
        />
      </label>
      <label className="be-check">
        <input
          type="checkbox"
          checked={!!page.draftOnly}
          onChange={(e) => set({ draftOnly: e.target.checked })}
        />{" "}
        Hide this page from visitors (work in progress)
      </label>
    </div>
  );
}

function NewPageForm({ onDone }: { onDone: () => void }) {
  const { site } = useRoot();
  const switchPage = useSwitchPage();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [addToMenu, setAddToMenu] = useState(true);
  const auto = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const finalSlug = touched ? slug : auto;
  const err = !title.trim()
    ? ""
    : !SLUG_RE.test(finalSlug)
      ? "Web address can only use lowercase letters, numbers and dashes."
      : RESERVED_SLUGS.has(finalSlug) || systemPageBySlug[finalSlug]
        ? "That web address is already used by the site. Pick another."
        : site.pages[finalSlug]
          ? "A page with that web address already exists."
          : "";
  const create = () => {
    if (!title.trim() || err) return;
    const id = uid("Hero");
    switchPage(finalSlug, (s) => ({
      ...s,
      pages: {
        ...s.pages,
        [finalSlug]: {
          title: title.trim().slice(0, 80),
          seoTitle: seoTitle.trim(),
          seoDescription: seoDescription.trim(),
          content: [
            {
              type: "Hero",
              props: {
                id,
                eyebrow: "Belmore Estates",
                heading: title.trim(),
                body: "[Intro text — TO COME]",
                image: { src: "", alt: "" },
                button1: { label: "Get in touch", href: "/contact" },
                button2: { label: "", href: "" },
                layout: "stacked",
                hidden: false,
                bg: "default",
                padTop: "none",
                padBottom: "none",
                anchor: "",
                bgImage: { src: "", alt: "" },
              },
            },
          ],
        },
      },
      nav: addToMenu
        ? [...navOf(s), { id: uid("nav"), href: `/${finalSlug}`, label: title.trim().slice(0, 40) }]
        : s.nav,
    }));
    toast(`Page “${title.trim()}” created${addToMenu ? " and added to the menu" : ""}`);
    onDone();
  };
  return (
    <div className="be-sub" data-new-page="">
      <label className="be-field">
        <span>Page name</span>
        <input
          className="be-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. Open House"
          autoFocus
        />
      </label>
      <label className="be-field">
        <span>Web address</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="be-help" style={{ margin: 0 }}>
            belmore…/
          </span>
          <input
            className="be-input"
            value={finalSlug}
            onChange={(e) => (setTouched(true), setSlug(e.target.value.toLowerCase()))}
            maxLength={60}
          />
        </div>
      </label>
      <label className="be-field">
        <span>Title in Google (optional)</span>
        <input
          className="be-input"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="be-field">
        <span>Description in Google (optional)</span>
        <textarea
          className="be-input"
          rows={2}
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          maxLength={320}
        />
      </label>
      <label className="be-check">
        <input
          type="checkbox"
          checked={addToMenu}
          onChange={(e) => setAddToMenu(e.target.checked)}
        />{" "}
        Add a link to the menu
      </label>
      {err ? <p className="be-err">{err}</p> : null}
      <div className="be-row-btns">
        <button type="button" className="be-btn" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="be-btn be-primary"
          disabled={!title.trim() || !!err}
          onClick={create}
        >
          Create page
        </button>
      </div>
    </div>
  );
}

function AddLinkForm({ onDone }: { onDone: () => void }) {
  const { site } = useRoot();
  const update = useSiteUpdater();
  const pages = pageList(site).filter((p) => !p.slug.startsWith("_"));
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"page" | "web">("page");
  const [page, setPage] = useState(pages[0]?.path ?? "/");
  const [url, setUrl] = useState("https://");
  const href = kind === "page" ? page : url.trim();
  const err =
    kind === "web" && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(href)
      ? "Enter a full web address starting with https://"
      : "";
  const add = () => {
    if (!label.trim() || err) return;
    update((s) => ({
      ...s,
      nav: [
        ...navOf(s),
        {
          id: uid("nav"),
          href,
          label: label.trim().slice(0, 40),
          external: kind === "web" || undefined,
        },
      ],
    }));
    toast("Menu link added");
    onDone();
  };
  return (
    <div className="be-sub" data-add-link="">
      <label className="be-field">
        <span>Link text</span>
        <input
          className="be-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          autoFocus
        />
      </label>
      <div className="be-seg" role="radiogroup" aria-label="Link to">
        <button type="button" aria-pressed={kind === "page"} onClick={() => setKind("page")}>
          A page on this site
        </button>
        <button type="button" aria-pressed={kind === "web"} onClick={() => setKind("web")}>
          Another website
        </button>
      </div>
      {kind === "page" ? (
        <select
          className="be-input"
          value={page}
          onChange={(e) => setPage(e.target.value)}
          aria-label="Page"
        >
          {pages.map((p) => (
            <option key={p.slug} value={p.path}>
              {p.title}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="be-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Web address"
        />
      )}
      {err && kind === "web" && url !== "https://" ? <p className="be-err">{err}</p> : null}
      <div className="be-row-btns">
        <button type="button" className="be-btn" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="be-btn be-primary"
          disabled={!label.trim() || !!err}
          onClick={add}
        >
          Add link
        </button>
      </div>
    </div>
  );
}

export function PagesPanel() {
  const { slug, site } = useRoot();
  const update = useSiteUpdater();
  const switchPage = useSwitchPage();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<"page" | "link" | null>(null);
  const pages = pageList(site);
  const nav = navOf(site);

  const setNav = (fn: (items: NavItem[]) => NavItem[]) =>
    update((s) => ({ ...s, nav: fn(navOf(s)) }));
  const move = (i: number, d: number) =>
    setNav((items) => {
      const next = [...items];
      const [it] = next.splice(i, 1);
      next.splice(i + d, 0, it);
      return next;
    });

  const deletePage = (p: { slug: string; title: string }) =>
    askConfirm({
      title: `Delete the page “${p.title}”?`,
      body: "The page and its menu links are removed from your draft. Visitors keep seeing it until you publish. You can undo, or restore an earlier version later.",
      confirmLabel: "Delete page",
      danger: true,
      onConfirm: () => {
        const strip = (s: SiteDoc): SiteDoc => {
          const { [p.slug]: _gone, ...rest } = s.pages;
          return {
            ...s,
            pages: rest,
            nav: s.nav ? s.nav.filter((n) => n.href !== `/${p.slug}`) : s.nav,
          };
        };
        if (slug === p.slug) switchPage("home", strip);
        else update(strip);
        toast("Page deleted");
      },
    });

  return (
    <div className="be-panel" data-panel="pages">
      <Section
        title="Pages"
        help="Click a page to edit it. ⚙ changes its name and how it shows in Google."
      >
        <ul className="be-list">
          {pages.map((p) => (
            <li key={p.slug}>
              <div className={`be-row ${p.slug === slug ? "be-current" : ""}`}>
                <button
                  type="button"
                  className="be-link"
                  onClick={() => switchPage(p.slug)}
                  title={`Edit ${p.title}`}
                >
                  <strong>{p.title}</strong>
                  <small>
                    {p.path}
                    {p.draftOnly ? " · hidden" : ""}
                  </small>
                </button>
                <button
                  type="button"
                  className="be-icon-btn"
                  aria-label={`Settings for ${p.title}`}
                  aria-expanded={open === p.slug}
                  onClick={() => setOpen(open === p.slug ? null : p.slug)}
                >
                  ⚙
                </button>
                {p.system ? null : (
                  <button
                    type="button"
                    className="be-icon-btn"
                    aria-label={`Delete ${p.title}`}
                    onClick={() => deletePage(p)}
                  >
                    🗑
                  </button>
                )}
              </div>
              {open === p.slug ? <PageSeo slug={p.slug} /> : null}
            </li>
          ))}
        </ul>
        {adding === "page" ? (
          <NewPageForm onDone={() => setAdding(null)} />
        ) : (
          <button
            type="button"
            className="be-btn be-primary be-wide"
            onClick={() => setAdding("page")}
            data-add-page=""
          >
            + New page
          </button>
        )}
      </Section>

      <Section
        title="Menu"
        help="The links at the top of every page. The Contact button and the footer stay as they are."
      >
        <ul className="be-list">
          {nav.map((item, i) => (
            <li key={item.id}>
              <div className={`be-row ${item.hidden ? "be-dim" : ""}`}>
                <BlurInput
                  value={navLabel(site, item)}
                  aria-label={`Menu link text for ${item.href}`}
                  maxLength={40}
                  onCommit={(v) =>
                    item.labelKey
                      ? update((s) => setText(s, item.labelKey as string, v))
                      : setNav((items) =>
                          items.map((n) =>
                            n.id === item.id ? { ...n, label: v.slice(0, 40) } : n,
                          ),
                        )
                  }
                />
                <button
                  type="button"
                  className="be-icon-btn"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="be-icon-btn"
                  aria-label="Move down"
                  disabled={i === nav.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="be-icon-btn"
                  aria-label={item.hidden ? "Show in menu" : "Hide from menu"}
                  title={item.hidden ? "Hidden — click to show" : "Hide from menu"}
                  onClick={() =>
                    setNav((items) =>
                      items.map((n) =>
                        n.id === item.id ? { ...n, hidden: !n.hidden || undefined } : n,
                      ),
                    )
                  }
                >
                  {item.hidden ? "◌" : "◉"}
                </button>
                <button
                  type="button"
                  className="be-icon-btn"
                  aria-label="Remove link"
                  onClick={() =>
                    askConfirm({
                      title: "Remove this menu link?",
                      body: `“${navLabel(site, item)}” will no longer appear in the menu. The page itself is not deleted.`,
                      confirmLabel: "Remove link",
                      danger: true,
                      onConfirm: () => setNav((items) => items.filter((n) => n.id !== item.id)),
                    })
                  }
                >
                  ✕
                </button>
              </div>
              <small className="be-help" style={{ display: "block", margin: "0 0 6px 4px" }}>
                → {item.href}
                {isExternalHref(item.href) ? " (opens another website)" : ""}
              </small>
            </li>
          ))}
        </ul>
        {adding === "link" ? (
          <AddLinkForm onDone={() => setAdding(null)} />
        ) : (
          <button
            type="button"
            className="be-btn be-wide"
            onClick={() => setAdding("link")}
            disabled={nav.length >= 16}
          >
            + Add a menu link
          </button>
        )}
        {site.nav ? (
          <button
            type="button"
            className="be-btn be-wide be-quiet"
            onClick={() =>
              askConfirm({
                title: "Reset the menu?",
                body: "The menu goes back to the original links.",
                confirmLabel: "Reset menu",
                onConfirm: () => update((s) => ({ ...s, nav: null })),
              })
            }
          >
            Reset menu to original
          </button>
        ) : null}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ theme */

function ColorRow({
  role,
  label,
  help,
  value,
  onChange,
}: {
  role: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const original = BELMORE_COLORS[role as keyof typeof BELMORE_COLORS];
  return (
    <li>
      <button
        type="button"
        className="be-row be-color-row"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="be-swatch" style={{ background: value }} aria-hidden />
        <span style={{ flex: 1, textAlign: "left" }}>
          <strong>{label}</strong>
          <small>{help}</small>
        </span>
        <code>{value}</code>
      </button>
      {open ? (
        <div className="be-sub">
          <div className="be-swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className="be-swatch"
                style={{ background: c }}
                aria-label={c}
                aria-pressed={c.toLowerCase() === value.toLowerCase()}
                onClick={() => onChange(c)}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-label={`${label} color picker`}
            />
            <input
              className="be-input"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onBlur={() => (HEX_RE.test(hex) ? onChange(hex.toLowerCase()) : setHex(value))}
              aria-label={`${label} hex code`}
              maxLength={7}
            />
            {value.toLowerCase() !== original ? (
              <button type="button" className="be-btn" onClick={() => onChange(undefined)}>
                Original
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Choices<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="be-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemePanel() {
  const { site } = useRoot();
  const update = useSiteUpdater();
  const theme = site.theme;
  const colors = { ...BELMORE_COLORS, ...theme.colors };
  const setTheme = (fn: (t: Theme) => Theme) => update((s) => ({ ...s, theme: fn(s.theme) }));
  const activePreset = COLOR_PRESETS.find((p) =>
    COLOR_ROLES.every(({ role }) => p.colors[role].toLowerCase() === colors[role].toLowerCase()),
  )?.id;
  const logo = theme.logo ?? {};
  return (
    <div className="be-panel" data-panel="theme">
      <p className="be-help">
        Changes apply to the whole site. Choices are limited on purpose so the design stays
        polished.
      </p>
      <Section title="Color sets">
        <div className="be-presets">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="be-preset"
              aria-pressed={activePreset === p.id}
              onClick={() =>
                setTheme((t) => ({
                  ...t,
                  colors: p.id === "belmore" ? undefined : { ...p.colors },
                }))
              }
            >
              <span className="be-chips">
                {(["pine", "copper", "paper", "ink"] as const).map((r) => (
                  <span key={r} style={{ background: p.colors[r] }} />
                ))}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Colors" help="Click a color to change it.">
        <ul className="be-list">
          {COLOR_ROLES.map(({ role, label, help }) => (
            <ColorRow
              key={role}
              role={role}
              label={label}
              help={help}
              value={colors[role]}
              onChange={(v) =>
                setTheme((t) => {
                  const next = { ...t.colors };
                  if (v === undefined) delete next[role];
                  else next[role] = v;
                  return { ...t, colors: Object.keys(next).length ? next : undefined };
                })
              }
            />
          ))}
        </ul>
      </Section>
      <Section title="Fonts">
        <label className="be-field">
          <span>Headings</span>
          <select
            className="be-input"
            value={theme.fonts?.display ?? DEFAULT_FONTS.display}
            onChange={(e) =>
              setTheme((t) => ({
                ...t,
                fonts: {
                  ...t.fonts,
                  display: e.target.value === DEFAULT_FONTS.display ? undefined : e.target.value,
                },
              }))
            }
          >
            {FONTS.filter((f) => f.kind !== "body").map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="be-field">
          <span>Body text</span>
          <select
            className="be-input"
            value={theme.fonts?.body ?? DEFAULT_FONTS.body}
            onChange={(e) =>
              setTheme((t) => ({
                ...t,
                fonts: {
                  ...t.fonts,
                  body: e.target.value === DEFAULT_FONTS.body ? undefined : e.target.value,
                },
              }))
            }
          >
            {FONTS.filter((f) => f.kind !== "display").map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </Section>
      <Section title="Buttons">
        <Choices
          label="Button corners"
          value={theme.buttons?.shape ?? "square"}
          options={[
            ["square", "Square (original)"],
            ["soft", "Rounded"],
            ["pill", "Pill"],
          ]}
          onChange={(v) =>
            setTheme((t) => ({ ...t, buttons: v === "square" ? undefined : { shape: v } }))
          }
        />
      </Section>
      <Section title="Spacing between sections">
        <Choices
          label="Spacing"
          value={theme.spacing ?? "normal"}
          options={[
            ["compact", "Compact"],
            ["normal", "Normal (original)"],
            ["roomy", "Roomy"],
          ]}
          onChange={(v) => setTheme((t) => ({ ...t, spacing: v === "normal" ? undefined : v }))}
        />
      </Section>
      <Section title="Logo">
        <Choices
          label="Logo type"
          value={logo.mode === "image" ? "image" : "text"}
          options={[
            ["text", "Text (original)"],
            ["image", "Image"],
          ]}
          onChange={(v) =>
            v === "text"
              ? setTheme((t) => ({ ...t, logo: undefined }))
              : openImageDialog({
                  title: "Logo image",
                  src: logo.src ?? "",
                  alt: logo.alt ?? "Belmore Estates",
                  onSave: (src, alt) =>
                    src &&
                    setTheme((t) => ({
                      ...t,
                      logo: {
                        mode: "image",
                        src,
                        alt: alt || "Belmore Estates",
                        height: t.logo?.height ?? 40,
                      },
                    })),
                })
          }
        />
        {logo.mode === "image" ? (
          <>
            {logo.src ? (
              <img
                src={logo.src}
                alt=""
                style={{ maxHeight: 60, margin: "8px 0", background: colors.paper }}
              />
            ) : null}
            <button
              type="button"
              className="be-btn"
              onClick={() =>
                openImageDialog({
                  title: "Logo image",
                  src: logo.src ?? "",
                  alt: logo.alt ?? "",
                  onSave: (src, alt) =>
                    setTheme((t) =>
                      src
                        ? {
                            ...t,
                            logo: { ...t.logo, mode: "image", src, alt: alt || "Belmore Estates" },
                          }
                        : { ...t, logo: undefined },
                    ),
                })
              }
            >
              Replace logo…
            </button>
            <label className="be-field">
              <span>Logo height: {logo.height ?? 40}px</span>
              <input
                type="range"
                min={24}
                max={96}
                step={2}
                value={logo.height ?? 40}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, logo: { ...t.logo, height: Number(e.target.value) } }))
                }
              />
            </label>
          </>
        ) : null}
      </Section>
      {Object.keys(theme).some((k) => theme[k as keyof Theme] !== undefined) ? (
        <button
          type="button"
          className="be-btn be-wide be-quiet"
          onClick={() =>
            askConfirm({
              title: "Go back to the original look?",
              body: "Colors, fonts, buttons, spacing and logo return to the original Belmore design.",
              confirmLabel: "Reset look",
              onConfirm: () => setTheme(() => ({})),
            })
          }
        >
          Reset to the original look
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- history */

const KIND: Record<VersionRow["kind"], string> = {
  original: "Original site",
  publish: "Published",
  "restore-point": "Saved draft",
};

export function HistoryPanel() {
  const session = useSession();
  const getPuck = useGetPuck();
  const [rows, setRows] = useState<VersionRow[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      listVersions()
        .then((r) => setRows(r as VersionRow[]))
        .catch((e) => setError(errorText(e))),
    [],
  );
  useEffect(() => void load(), [load, session.versionsTick]);

  const applyDoc = (doc: SiteDoc, revision: number, unpublished: boolean) => {
    const { appState, dispatch } = getPuck();
    const { slug } = rootOf(appState.data);
    const full = normalizeDoc(doc);
    const target = full.pages[slug] ? slug : "home";
    session.adopt(full, revision, unpublished);
    dispatch({
      type: "setData",
      data: { root: makeRoot(target, full), content: full.pages[target].content as never },
      recordHistory: true,
    } as never);
    dispatch({ type: "setUi", ui: { itemSelector: null } });
  };

  const restore = (row: VersionRow) =>
    askConfirm({
      title: "Restore this version to your draft?",
      body: `Your draft becomes the version from ${new Date(row.created_at).toLocaleString()}.\nVisitors won't see it until you publish. Your current draft is kept in this list, so you can switch back.`,
      confirmLabel: "Restore to draft",
      onConfirm: async () => {
        await session.flush();
        const res = await restoreVersion({ data: { id: row.id, revision: session.revision() } });
        applyDoc(res.doc as SiteDoc, res.revision, res.unpublished);
        toast("Version restored to your draft. Publish when you're ready.");
        void load();
      },
    });

  return (
    <div className="be-panel" data-panel="history">
      <p className="be-help">
        Every time you publish, a copy is saved here. Restoring puts that copy into your draft — it
        doesn't change the live site until you publish.
      </p>
      {session.unpublished ? (
        <button
          type="button"
          className="be-btn be-wide"
          onClick={() =>
            askConfirm({
              title: "Throw away unpublished changes?",
              body: "Your draft goes back to exactly what visitors see now. (A copy of the current draft is kept in this list.)",
              confirmLabel: "Discard changes",
              danger: true,
              onConfirm: async () => {
                await session.flush();
                const res = await discardDraft({ data: { revision: session.revision() } });
                applyDoc(res.doc as SiteDoc, res.revision, false);
                toast("Draft reset to the live site");
                void load();
              },
            })
          }
        >
          Discard unpublished changes
        </button>
      ) : null}
      {error ? <p className="be-err">{error}</p> : null}
      {rows === null ? (
        <p>Loading…</p>
      ) : (
        <ul className="be-list" data-versions="">
          {rows.map((row, i) => (
            <li key={row.id} className="be-row be-version">
              <span style={{ flex: 1 }}>
                <span className="be-badge" data-kind={row.kind}>
                  {KIND[row.kind]}
                </span>
                {i === 0 && row.kind === "publish" ? (
                  <span className="be-badge be-live">Live now</span>
                ) : null}
                <strong style={{ display: "block" }}>
                  {new Date(row.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
                <small>
                  {row.created_by ?? "Setup"}
                  {row.note ? ` · ${row.note}` : ""}
                </small>
              </span>
              <button type="button" className="be-btn" onClick={() => restore(row)}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- all text */

const AREA: Record<string, string> = {
  global: "Every page",
  forms: "Forms",
  login: "Sign-in page",
};
const areaOf = (key: string) => {
  const first = key.split(".")[0];
  return (
    AREA[first] ?? SYSTEM_PAGES.find((p) => p.seoPrefix.split(".")[0] === first)?.title ?? first
  );
};

export function TextsPanel() {
  const { site } = useRoot();
  const update = useSiteUpdater();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return blockDefs
      .filter((d) => d.key !== "homes.future.open")
      .filter((d) => {
        const v = site.texts[d.key] ?? d.value;
        return v.toLowerCase().includes(needle) || d.key.toLowerCase().includes(needle);
      })
      .slice(0, 40);
  }, [q, site.texts]);
  return (
    <div className="be-panel" data-panel="texts">
      <p className="be-help">
        Find any wording on the site — including form labels, messages and the text Google shows —
        and change it here. Most text can also be clicked directly on the page.
      </p>
      <input
        className="be-input"
        type="search"
        placeholder="Search words, e.g. “tour”"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search all text"
      />
      {q.trim().length >= 2 && matches.length === 0 ? <p>No text matches.</p> : null}
      <ul className="be-list">
        {matches.map((d) => {
          const value = site.texts[d.key] ?? d.value;
          const changed = site.texts[d.key] !== undefined && site.texts[d.key] !== d.value;
          return (
            <li key={d.key} className="be-text-row">
              <small>
                {areaOf(d.key)} · <code>{d.key}</code>
                {changed ? " · changed" : ""}
              </small>
              {d.image ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {value ? (
                    <img src={value} alt="" style={{ width: 64, height: 44, objectFit: "cover" }} />
                  ) : null}
                  <button
                    type="button"
                    className="be-btn"
                    onClick={() => {
                      const altKey = d.key.replace(/\.src$/, ".alt");
                      openImageDialog({
                        title: "Replace photo",
                        src: value,
                        alt: site.texts[altKey] ?? blockDefaults[altKey] ?? "",
                        onSave: (src, alt) =>
                          update((s) => setText(setText(s, d.key, src), altKey, alt)),
                      });
                    }}
                  >
                    Replace photo…
                  </button>
                </div>
              ) : (
                <BlurInput
                  multiline={d.multiline}
                  value={value}
                  onCommit={(v) => update((s) => setText(s, d.key, v))}
                  aria-label={d.key}
                />
              )}
              {changed ? (
                <button
                  type="button"
                  className="be-link-btn"
                  onClick={() => update((s) => setText(s, d.key, d.value))}
                >
                  Back to original wording
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {/{{|{[A-Z_]+}/.test(matches.map((m) => site.texts[m.key] ?? m.value).join("")) ? (
        <p className="be-help">
          Words in curly braces like {"{name}"} are filled in automatically — keep them as they are.
        </p>
      ) : null}
    </div>
  );
}
