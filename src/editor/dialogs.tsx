/** Dialogs rendered in the editor window: photo picker, confirm, toast. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { listEditorMedia, uploadEditorImage } from "@/server/editor";
import { ACCEPTED, prepareImage } from "./image";
import { setUi, toast, useUi, type ConfirmRequest, type ImageRequest } from "./store";

export function errorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/conflict|409|changed in another/i.test(msg))
    return "This draft was changed in another window. Reload the page to get the latest version.";
  if (/401|403|sign in|not an admin|forbidden|unauthor/i.test(msg))
    return "You've been signed out. Please sign in again.";
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) return String(parsed[0].message);
  } catch {
    /* not JSON */
  }
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

export function Dialog({
  title,
  children,
  footer,
  onClose,
  labelId,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  labelId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,button,textarea,select")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="be-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="be-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        ref={ref}
        data-editor-dialog={labelId}
      >
        <header>
          <h2 id={labelId}>{title}</h2>
        </header>
        <div className="be-body">{children}</div>
        <footer>{footer}</footer>
      </div>
    </div>
  );
}

function ConfirmDialog({ req }: { req: ConfirmRequest }) {
  const [busy, setBusy] = useState(false);
  const close = () => !busy && setUi({ confirm: null });
  return (
    <Dialog
      title={req.title}
      labelId="be-confirm-title"
      onClose={close}
      footer={
        <>
          <button type="button" className="be-btn" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`be-btn ${req.danger ? "be-danger" : "be-primary"}`}
            data-confirm-yes=""
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await req.onConfirm();
                setUi({ confirm: null });
              } catch (err) {
                toast(errorText(err), "error");
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : req.confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ whiteSpace: "pre-line", margin: 0 }}>{req.body}</p>
    </Dialog>
  );
}

type Media = { id: number; name: string };

function ImageDialog({ req }: { req: ImageRequest }) {
  const [tab, setTab] = useState<"upload" | "library" | "url">("upload");
  const [src, setSrc] = useState(req.src);
  const [alt, setAlt] = useState(req.alt);
  const [url, setUrl] = useState(/^https:\/\//.test(req.src) ? req.src : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [media, setMedia] = useState<Media[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const close = () => !busy && setUi({ image: null });

  useEffect(() => {
    if (tab === "library" && media === null)
      listEditorMedia()
        .then((rows) => setMedia(rows as Media[]))
        .catch((err) => setError(errorText(err)));
  }, [tab, media]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      const res = await uploadEditorImage({
        data: { name: prepared.name, mime: prepared.mime, dataBase64: prepared.dataBase64 },
      });
      setSrc(res.url);
      setMedia(null);
      toast("Photo uploaded");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const finalSrc = tab === "url" ? url.trim() : src;
    if (tab === "url" && finalSrc && !/^https:\/\/[^\s]+$/.test(finalSrc)) {
      setError("Web addresses must start with https://");
      return;
    }
    req.onSave(finalSrc, alt.trim());
    setUi({ image: null });
  };
  const shown = tab === "url" ? url.trim() : src;

  return (
    <Dialog
      title={req.title}
      labelId="be-image-title"
      onClose={close}
      footer={
        <>
          {req.src ? (
            <button
              type="button"
              className="be-btn"
              style={{ marginRight: "auto" }}
              onClick={() => (setSrc(""), setUrl(""))}
              disabled={busy}
            >
              Remove photo
            </button>
          ) : null}
          <button type="button" className="be-btn" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="be-btn be-primary"
            onClick={save}
            disabled={busy}
            data-image-save=""
          >
            Use this photo
          </button>
        </>
      }
    >
      <div className="be-tabs" role="tablist">
        {(
          [
            ["upload", "Upload a photo"],
            ["library", "Your photos"],
            ["url", "Web address"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => (setTab(id), setError(""))}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "upload" ? (
        <div
          className={`be-drop ${over ? "be-over" : ""}`}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void upload(e.dataTransfer.files[0]);
          }}
        >
          <p style={{ margin: "0 0 10px" }}>Drag a photo here, or</p>
          <button
            type="button"
            className="be-btn be-primary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Uploading…" : "Choose a photo from your computer"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(",")}
            hidden
            data-image-file=""
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p style={{ margin: "10px 0 0", fontSize: 13 }}>
            JPG, PNG or WebP, up to 8 MB. Large photos are resized automatically, and hidden
            camera/location data is removed.
          </p>
        </div>
      ) : tab === "library" ? (
        media === null ? (
          <p>Loading your photos…</p>
        ) : media.length === 0 ? (
          <p>No photos uploaded yet. Use “Upload a photo”.</p>
        ) : (
          <div className="be-thumbs">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={src === `/media/${m.id}`}
                title={m.name}
                onClick={() => setSrc(`/media/${m.id}`)}
              >
                <img src={`/media/${m.id}`} alt={m.name} loading="lazy" />
              </button>
            ))}
          </div>
        )
      ) : (
        <label className="be-field">
          <span>Photo web address</span>
          <input
            className="be-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
          <small>
            Only use photos you have the rights to. Uploading is usually better (it's faster for
            visitors).
          </small>
        </label>
      )}
      {error ? (
        <p className="be-err" role="alert">
          {error}
        </p>
      ) : null}
      {shown ? (
        <img src={shown} alt="" className="be-preview-img" />
      ) : (
        <p className="be-help" style={{ color: "#5c655e" }}>
          No photo chosen.
        </p>
      )}
      {req.noAlt ? null : (
        <label className="be-field">
          <span>Describe the photo (alt text)</span>
          <input
            className="be-input"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={200}
            data-image-alt=""
          />
          <small>
            Read aloud to people who can't see the photo, and used by Google. For example: “Kitchen
            with white cabinets and a wood island”.
          </small>
        </label>
      )}
    </Dialog>
  );
}

export function EditorDialogs() {
  const { image, confirm, toast: t } = useUi();
  return (
    <>
      {image ? <ImageDialog key={image.title + image.src} req={image} /> : null}
      {confirm ? <ConfirmDialog req={confirm} /> : null}
      {t ? (
        <div
          key={t.id}
          className={`be-toast ${t.tone === "error" ? "be-error" : ""}`}
          role="status"
        >
          {t.text}
        </div>
      ) : null}
    </>
  );
}
