/**
 * Edit-mode bridge between the site's components and Puck. The public
 * components (T / Tx / Img in src/components/site/text.tsx, Photo in
 * src/site/blocks.tsx) render these when EditContext is provided — only here.
 */
import { createUsePuck, registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { blockDefByKey, blockDefaults, fill } from "@/data/content";
import { RichText, textOf, useSiteData, type EditApi, type Vars } from "@/components/site/text";
import type { SiteDoc } from "@/site/doc";
import { openImageDialog } from "./store";

export const usePuck = createUsePuck();

/**
 * Root props hold the current page slug and the whole site doc as a JSON
 * string. (Puck flattens object props into dot paths, which would break text
 * keys like "home.hero.h1"; a string survives untouched.)
 */
export type RootProps = { slug: string; siteJson: string };

const parsed = new Map<string, SiteDoc>();
export function parseSite(json: string): SiteDoc {
  let doc = parsed.get(json);
  if (!doc) {
    doc = JSON.parse(json) as SiteDoc;
    parsed.set(json, doc);
    if (parsed.size > 12) parsed.delete(parsed.keys().next().value as string);
  }
  return doc;
}
export const rootProps = (data: { root: unknown }) => (data.root as { props: RootProps }).props;
export const rootOf = (data: { root: unknown }) => {
  const p = rootProps(data);
  return { slug: p.slug, site: parseSite(p.siteJson) };
};
export const makeRoot = (slug: string, site: SiteDoc) => ({
  props: { slug, siteJson: JSON.stringify(site) },
});
/** Current slug + site doc (re-renders when either changes). */
export function useRoot() {
  const p = usePuck((s) => rootProps(s.appState.data));
  return { slug: p.slug, site: parseSite(p.siteJson) };
}

/** Change the whole-site doc held in Puck's root props (recorded for undo). */
export function useSiteUpdater() {
  const getPuck = useGetPuck();
  return useCallback(
    (fn: (site: SiteDoc) => SiteDoc) => {
      const { appState, dispatch } = getPuck();
      const { slug, site } = rootOf(appState.data);
      dispatch({ type: "replaceRoot", root: makeRoot(slug, fn(site)) as never });
    },
    [getPuck],
  );
}

export const setText = (site: SiteDoc, key: string, value: string): SiteDoc => ({
  ...site,
  texts: { ...site.texts, [key]: value },
});

/** Change one section's props (by id) on the current page. */
export function useBlockUpdater() {
  const getPuck = useGetPuck();
  return useCallback(
    (id: string, fn: (props: Record<string, unknown>) => Record<string, unknown>) => {
      const { getSelectorForId, getItemById, dispatch } = getPuck();
      const sel = getSelectorForId(id);
      const item = getItemById(id);
      if (!sel || !item) return;
      dispatch({
        type: "replace",
        destinationIndex: sel.index,
        destinationZone: sel.zone,
        data: { ...item, props: fn(item.props) as typeof item.props },
      });
    },
    [getPuck],
  );
}

function useOverlayPortal<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => registerOverlayPortal(ref.current) ?? undefined, [dep]);
  return ref;
}

/* ------------------------------------------------------------- inline text */

function EditableText({
  k,
  vars,
  rich,
  emailClassName,
}: {
  k: string;
  vars?: Vars;
  rich?: boolean;
  emailClassName?: string;
}) {
  const { blocks } = useSiteData();
  const update = useSiteUpdater();
  const [editing, setEditing] = useState(false);
  const ref = useOverlayPortal<HTMLSpanElement>(editing);
  const raw = blocks[k] ?? blockDefaults[k] ?? "";
  const multiline = !!blockDefByKey[k]?.multiline;
  const cancelled = useRef(false);

  useEffect(() => {
    if (!editing || !ref.current) return;
    const el = ref.current;
    el.focus();
    const sel = el.ownerDocument.getSelection();
    const range = el.ownerDocument.createRange();
    range.selectNodeContents(el);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, ref]);

  const commit = () => {
    const el = ref.current;
    setEditing(false);
    if (!el || cancelled.current) {
      cancelled.current = false;
      return;
    }
    let value = el.innerText.replace(/\u00a0/g, " ");
    value = multiline
      ? value.replace(/\n{3,}/g, "\n\n").replace(/\n$/, "")
      : value.replace(/\s*\n\s*/g, " ");
    if (value !== raw) update((site) => setText(site, k, value));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    e.stopPropagation(); // keep Puck's shortcuts (undo, delete) out of typing
    if (e.key === "Escape") {
      cancelled.current = true;
      ref.current?.blur();
    } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  if (editing) {
    const shared = vars && Object.keys(vars).length > 0;
    const hasTokens = /\{\w+\}|\{\{CONTACT_EMAIL\}\}/.test(raw);
    return (
      <>
        <span
          key="editing"
          ref={ref}
          data-edit-text={k}
          className="be-text be-editing"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck
          onBlur={commit}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {raw}
        </span>
        {ref.current
          ? createPortal(
              <div className="be-hint" role="status">
                {multiline
                  ? "Enter = new line · Ctrl+Enter = done · Esc = cancel"
                  : "Enter = done · Esc = cancel"}
                {hasTokens
                  ? " · Words in {curly braces} are filled in automatically — keep them as they are."
                  : ""}
                {shared ? " · This wording is shared by every card of this kind." : ""}
              </div>,
              ref.current.ownerDocument.body,
            )
          : null}
      </>
    );
  }
  return (
    <span
      key="view"
      ref={ref}
      data-edit-text={k}
      className="be-text"
      title="Click to edit this text"
      onClick={(e) => {
        e.preventDefault();
        setEditing(true);
      }}
    >
      {rich ? (
        <RichText text={fill(raw, vars ?? {})} emailClassName={emailClassName} />
      ) : (
        textOf(blocks, k, vars) || "\u00a0"
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ photos */

function PhotoButton({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick: () => void;
}) {
  const ref = useOverlayPortal<HTMLElement>(src);
  const props = {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    },
    title: "Click to replace this photo",
    "data-edit-image": "",
  };
  if (!src)
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        {...props}
        className={`be-img-empty ${className ?? ""}`}
      >
        + Add a photo
      </span>
    );
  return (
    <img
      ref={ref as React.Ref<HTMLImageElement>}
      src={src}
      alt={alt}
      className={`be-img ${className ?? ""}`}
      {...props}
    />
  );
}

function EditableImage({
  srcKey,
  altKey,
  altVars,
  className,
}: {
  srcKey: string;
  altKey: string;
  altVars?: Vars;
  className?: string;
}) {
  const { blocks } = useSiteData();
  const update = useSiteUpdater();
  const src = textOf(blocks, srcKey);
  const alt = textOf(blocks, altKey, altVars);
  return (
    <PhotoButton
      src={src}
      alt={alt}
      className={className}
      onClick={() =>
        openImageDialog({
          title: "Replace photo",
          src,
          alt: blocks[altKey] ?? blockDefaults[altKey] ?? "",
          onSave: (newSrc, newAlt) =>
            update((site) => setText(setText(site, srcKey, newSrc), altKey, newAlt)),
        })
      }
    />
  );
}

function EditableBlockImage({
  blockId,
  field,
  index,
  src,
  alt,
  className,
}: {
  blockId: string;
  field: string;
  index?: number;
  src: string;
  alt: string;
  className?: string;
}) {
  const updateBlock = useBlockUpdater();
  return (
    <PhotoButton
      src={src}
      alt={alt}
      className={className}
      onClick={() =>
        openImageDialog({
          title: src ? "Replace photo" : "Add a photo",
          src,
          alt,
          onSave: (newSrc, newAlt) =>
            updateBlock(blockId, (props) => {
              if (index === undefined)
                return {
                  ...props,
                  [field]: { ...((props[field] as object) ?? {}), src: newSrc, alt: newAlt },
                };
              const list = [...((props[field] as Record<string, unknown>[]) ?? [])];
              list[index] = { ...(list[index] ?? {}), src: newSrc, alt: newAlt };
              return { ...props, [field]: list };
            }),
        })
      }
    />
  );
}

export const editApi: EditApi = {
  Text: EditableText,
  Image: EditableImage,
  BlockImage: EditableBlockImage,
};
