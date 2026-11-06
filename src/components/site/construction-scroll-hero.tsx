/**
 * Pinned, scroll-scrubbed construction hero for the preview route only.
 *
 * Scroll down moves the clip forward, scroll up rewinds, and stopping
 * leaves the current frame held. The page scroll is native (nothing is
 * hijacked), so touch and keyboard scrolling keep working.
 *
 * This seeks one continuous video. It does not dissolve between stills.
 * The clip stays muted and is never started with sound.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { buttonStyles } from "@/components/site/chrome";
import { T, Tx } from "@/components/site/text";
import { CONSTRUCTION_HERO_MEDIA, scrollProgress, timeForProgress } from "@/site/construction-hero";

const FRAME_SEC = 1 / 30;

type HeroState = "loading" | "ready" | "error" | "still";

export function ConstructionScrollHero() {
  const trackRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<HeroState>("loading");

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let raf = 0;
    let seeking = false;
    let pending = false;
    let unlocked = false;
    let seekTimer = 0;
    let progress = 0;

    const reduced = () => motion.matches;

    const measure = () => {
      const header = document.querySelector("header");
      const pin = header?.getBoundingClientRect().height ?? 0;
      track.style.setProperty("--construction-pin", `${pin}px`);
      const sticky = track.querySelector<HTMLElement>("[data-construction-pin]");
      const stickyH =
        sticky?.getBoundingClientRect().height ?? track.getBoundingClientRect().height;
      const start = track.getBoundingClientRect().top + window.scrollY - pin;
      const range = track.offsetHeight - stickyH;
      return { start, range };
    };

    const paintProgress = (next: number) => {
      progress = next;
      track.dataset.progress = next.toFixed(4);
    };

    const finishSeek = () => {
      seeking = false;
      window.clearTimeout(seekTimer);
      if (pending) {
        pending = false;
        applySeek();
      }
    };

    const applySeek = () => {
      if (cancelled || reduced() || video.readyState < 2) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const target = timeForProgress(progress, duration);
      if (Math.abs(video.currentTime - target) < FRAME_SEC * 0.45) {
        if (track.dataset.state === "loading") {
          track.dataset.state = "ready";
          setState("ready");
        }
        return;
      }
      if (seeking) {
        pending = true;
        return;
      }
      seeking = true;
      window.clearTimeout(seekTimer);
      seekTimer = window.setTimeout(finishSeek, 400);
      try {
        video.currentTime = target;
      } catch {
        finishSeek();
      }
    };

    const tick = () => {
      raf = 0;
      if (cancelled) return;
      const { start, range } = measure();
      paintProgress(reduced() ? 0 : scrollProgress(window.scrollY, start, range));
      if (!reduced()) applySeek();
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    const onSeeked = () => {
      finishSeek();
      if (!cancelled && track.dataset.state !== "error" && !reduced()) {
        track.dataset.state = "ready";
        setState("ready");
      }
    };

    const unlock = async () => {
      if (unlocked || cancelled || reduced()) return;
      unlocked = true;
      video.muted = true;
      video.volume = 0;
      try {
        await video.play();
        video.pause();
      } catch {
        // Seeking still paints frames in current desktop browsers if play is blocked.
      }
      if (!cancelled) schedule();
    };

    const arm = () => {
      if (cancelled) return;
      if (reduced()) {
        video.removeAttribute("src");
        video.load();
        track.dataset.state = "still";
        setState("still");
        return;
      }
      track.dataset.state = "loading";
      setState("loading");
      if (video.getAttribute("src") !== CONSTRUCTION_HERO_MEDIA.videoSrc) {
        video.src = CONSTRUCTION_HERO_MEDIA.videoSrc;
        video.preload = "auto";
        video.load();
      }
      if (video.readyState >= 2) void unlock();
    };

    const onReady = () => {
      void unlock();
    };

    const onError = () => {
      if (cancelled || reduced()) return;
      track.dataset.state = "error";
      setState("error");
    };

    video.muted = true;
    video.volume = 0;
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", arm);
    arm();
    schedule();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(seekTimer);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", arm);
    };
  }, []);

  return (
    <section
      ref={trackRef}
      className="construction-hero-track border-b border-line bg-paper"
      data-construction-hero=""
      data-state={state}
      aria-label="Conceptual construction visualization"
    >
      <div className="construction-hero-pin flex flex-col bg-paper" data-construction-pin="">
        <div className="construction-hero-stage relative min-h-0 bg-paper-deep">
          <img
            src={CONSTRUCTION_HERO_MEDIA.posterSrc}
            alt="Conceptual finished front of a white board-and-batten home with a stone entry and two garage bays. A visualization, not a photograph of a house on this site."
            width={CONSTRUCTION_HERO_MEDIA.width}
            height={CONSTRUCTION_HERO_MEDIA.height}
            className="absolute inset-0 h-full w-full object-contain"
            decoding="async"
          />
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            poster={CONSTRUCTION_HERO_MEDIA.posterSrc}
            width={CONSTRUCTION_HERO_MEDIA.width}
            height={CONSTRUCTION_HERO_MEDIA.height}
            tabIndex={-1}
            aria-hidden="true"
            disablePictureInPicture
            className={
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-200 motion-reduce:transition-none " +
              (state === "ready" ? "opacity-100" : "opacity-0")
            }
          />
          <p
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4"
            data-construction-status=""
          >
            {state === "loading" ? (
              <span className="bg-paper/95 px-3 py-1 text-xs text-muted">
                Loading visualization…
              </span>
            ) : null}
            {state === "error" ? (
              <span className="max-w-md bg-paper/95 px-3 py-1 text-center text-xs text-muted">
                The motion clip didn’t load. This still is the finished concept.
              </span>
            ) : null}
            {state === "ready" ? (
              <span className="bg-paper/95 px-3 py-1 text-center text-xs text-ink">
                Scroll down to advance. Scroll up to rewind. Stop to hold the frame.
              </span>
            ) : null}
          </p>
        </div>

        <div className="shrink-0 border-t border-line bg-paper px-5 py-4 sm:px-8 sm:py-5">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-xs uppercase tracking-widest text-copper">
                <Tx k="home.hero.eyebrow" />
                <span className="text-muted"> · Review prototype</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                <Tx k="home.hero.subeyebrow" />
              </p>
              <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">
                <Tx k="home.hero.h1" />
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                <T k="home.hero.body" />
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="flex flex-wrap gap-3">
                <Link to="/contact" search={{ form: "tour" }} className={buttonStyles("primary")}>
                  <Tx k="home.hero.button1" />
                </Link>
                <Link to="/lots" className={buttonStyles("quiet")}>
                  <Tx k="home.hero.button2" />
                </Link>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n}>
                    <dt className="text-xs uppercase tracking-widest text-muted">
                      <Tx k={`home.hero.stat${n}.label`} />
                    </dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums">
                      <Tx k={`home.hero.stat${n}.value`} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-6xl text-xs leading-relaxed text-muted">
            Conceptual visualization for review. Not a photograph of construction on this site, and
            not a schedule. The motion clip is a prototype, not an approved animation.
            {state === "still" ? " Motion is off, so the finished concept still is shown." : null}
          </p>
        </div>
      </div>
    </section>
  );
}
