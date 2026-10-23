/**
 * Tiny UI store for the editor's dialogs (image picker, confirms, toasts).
 * Dialogs are triggered from inside the canvas iframe but rendered in the main
 * editor window, so they share this module-level store.
 */
import { useSyncExternalStore } from "react";

export type ImageRequest = {
  title: string;
  src: string;
  alt: string;
  /** Hide the alt-text box (e.g. section backgrounds, which are decorative). */
  noAlt?: boolean;
  onSave: (src: string, alt: string) => void;
};

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

type UiState = {
  image: ImageRequest | null;
  confirm: ConfirmRequest | null;
  toast: { id: number; text: string; tone: "ok" | "error" } | null;
};

let state: UiState = { image: null, confirm: null, toast: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setUi(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  emit();
}

export function useUi(): UiState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const openImageDialog = (req: ImageRequest) => setUi({ image: req });
export const askConfirm = (req: ConfirmRequest) => setUi({ confirm: req });

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, tone: "ok" | "error" = "ok") {
  setUi({ toast: { id: Date.now(), text, tone } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setUi({ toast: null }), tone === "error" ? 7000 : 3500);
}
