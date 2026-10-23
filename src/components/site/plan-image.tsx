import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { Plan } from "@/data/site";
import { PLAN_PLACEHOLDER } from "@/data/site-config";
import { cn } from "@/lib/cn";

/**
 * A plan image slot (rendering or floor plan). Until GLA grants permission
 * (`imagesPending`) or while the slot still points at the shared placeholder,
 * this shows the neutral placeholder with a caption. GLA images are never
 * stored in this repo.
 */
export function PlanImage({
  plan,
  slot = "rendering",
  alt,
  caption,
  className,
}: {
  plan: Plan;
  slot?: "rendering" | "floorPlan";
  alt: string;
  caption?: string;
  className?: string;
}) {
  const src = slot === "rendering" ? plan.renderingImage : plan.floorPlanImage;
  const pending = plan.imagesPending || !src || src === PLAN_PLACEHOLDER;
  // The floor-plan slot's placeholder repeats the rendering slot's placeholder
  // on the same page: decorative (alt=""), so screen readers don't hear it twice.
  // A real floor plan uses `alt`; only the rendering uses plan.renderingAlt.
  const altText =
    slot === "floorPlan" ? (pending ? "" : alt) : pending ? alt : plan.renderingAlt || alt;
  return (
    <div
      className={cn("relative overflow-hidden bg-cream", className)}
      data-plan-image={pending ? "placeholder" : "image"}
    >
      <img
        src={pending ? PLAN_PLACEHOLDER : src}
        alt={altText}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {pending && caption ? (
        <p className="absolute inset-x-0 bottom-0 px-4 py-3 text-center text-xs uppercase tracking-widest text-muted">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/** Outbound link to GLA Architecture's site: always a new tab with rel=noopener. */
export function GlaLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title || undefined}
      data-gla-link
      className={cn("inline-flex items-center gap-2", className)}
    >
      {children}
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only">(opens GLA Architecture's site in a new tab)</span>
    </a>
  );
}
