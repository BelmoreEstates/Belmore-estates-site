/**
 * Puck configuration: every section type the editor can place, with the
 * settings shown in the right-hand panel. Rendering is the same public code
 * (src/site/blocks.tsx, src/site/registry.tsx); only the fields live here.
 */
import type { ComponentConfig, Config, Field, Fields } from "@puckeditor/core";
import type { ReactNode } from "react";
import { SiteFrame } from "@/components/site/chrome";
import { EditContext, SiteDataOverride, contactEmailOf } from "@/components/site/text";
import { blockDefaults } from "@/data/content";
import { CONTACT_EMAIL_KEY } from "@/data/site-config";
import { Frame, LIBRARY, type SectionStyle } from "@/site/blocks";
import {
  LIBRARY_TYPES,
  ORIGINAL_PAGE,
  systemPageBySlug,
  themeCss,
  themeFontHref,
  type LibraryType,
  type SiteDoc,
} from "@/site/doc";
import { DetailContext } from "@/site/detail";
import { ORIGINAL_SECTIONS } from "@/site/registry";
import type { PublicData } from "@/server/public";
import { editApi, parseSite, type RootProps } from "./context";
import { openImageDialog } from "./store";

/* ----------------------------------------------------------- field kinds */

const text = (label: string, inline = true): Field => ({
  type: "text",
  label,
  contentEditable: inline,
});
const area = (label: string, inline = true): Field => ({
  type: "textarea",
  label,
  contentEditable: inline,
});
const rich = (label: string): Field => ({
  type: "richtext",
  label,
  contentEditable: true,
  options: { code: false, codeBlock: false, textAlign: false, heading: { levels: [2, 3] } },
});
const choice = (
  label: string,
  options: [string, string | boolean][],
  kind: "select" | "radio" = "radio",
): Field => ({
  type: kind,
  label,
  options: options.map(([l, value]) => ({ label: l, value })),
});
const link = (label: string): Field => ({
  type: "text",
  label: `${label} — link (e.g. /contact or https://…)`,
});

function ImageField({
  value,
  onChange,
  label,
  noAlt,
}: {
  value?: { src?: string; alt?: string };
  onChange: (v: { src: string; alt: string }) => void;
  label: string;
  noAlt?: boolean;
}) {
  const src = value?.src ?? "";
  return (
    <div className="be-panel" style={{ padding: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {src ? (
        <img src={src} alt="" className="be-preview-img" style={{ maxHeight: 110 }} />
      ) : (
        <p className="be-help">No photo yet.</p>
      )}
      <button
        type="button"
        className="be-btn"
        onClick={() =>
          openImageDialog({
            title: src ? "Replace photo" : "Add a photo",
            src,
            alt: value?.alt ?? "",
            noAlt,
            onSave: (s, a) => onChange({ src: s, alt: a }),
          })
        }
      >
        {src ? "Replace photo…" : "Add a photo…"}
      </button>
    </div>
  );
}
const image = (label: string, noAlt = false): Field => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <ImageField value={value} onChange={onChange} label={label} noAlt={noAlt} />
  ),
});
const button = (label: string): Field => ({
  type: "object",
  label,
  objectFields: { label: text("Button text"), href: link("Button") },
});

/** Look settings every section has. */
function styleFields(library: boolean): Fields {
  return {
    hidden: choice("Visible to visitors?", [
      ["Show", false],
      ["Hide", true],
    ]),
    bg: choice(
      library ? "Background" : "Background band (behind the section)",
      [
        ["Normal", "default"],
        ["Light", "paper"],
        ["Cream", "cream"],
        ["Soft", "deep"],
        ["Dark (main color)", "pine"],
        ["Photo", "image"],
      ],
      "select",
    ),
    bgImage: image("Background photo (when Background = Photo)", true),
    ...(library
      ? {
          padTop: choice("Space above", [
            ["None", "none"],
            ["S", "s"],
            ["M", "m"],
            ["L", "l"],
          ]),
          padBottom: choice("Space below", [
            ["None", "none"],
            ["S", "s"],
            ["M", "m"],
            ["L", "l"],
          ]),
        }
      : {}),
    anchor: { type: "text", label: "Jump-link name (optional, e.g. pricing → /page#pricing)" },
  };
}

/** Shown in the canvas for sections hidden from visitors. */
function HiddenWrap({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  if (!hidden) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <span className="be-hidden-flag">Hidden from visitors</span>
      <div className="be-hidden-section">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------- library blocks */

const lib: Record<
  LibraryType,
  { label: string; fields: Fields; defaultProps: Record<string, unknown> }
> = {
  Hero: {
    label: "Hero (big heading + photo)",
    fields: {
      eyebrow: text("Small label above"),
      heading: text("Heading"),
      body: area("Intro text"),
      image: image("Photo"),
      button1: button("Main button"),
      button2: button("Second button"),
      layout: choice("Layout", [
        ["Side by side", "split"],
        ["Stacked", "stacked"],
      ]),
    },
    defaultProps: {
      eyebrow: "Belmore Estates",
      heading: "[Heading — TO COME]",
      body: "[Intro text — TO COME]",
      image: { src: "", alt: "" },
      button1: { label: "Get in touch", href: "/contact" },
      button2: { label: "", href: "" },
      layout: "split",
      padTop: "none",
      padBottom: "none",
    },
  },
  TextImage: {
    label: "Text + photo",
    fields: {
      eyebrow: text("Small label above"),
      heading: text("Heading"),
      bodyHtml: rich("Text"),
      image: image("Photo"),
      side: choice("Photo side", [
        ["Right", "right"],
        ["Left", "left"],
      ]),
      button: button("Button"),
    },
    defaultProps: {
      eyebrow: "",
      heading: "[Heading — TO COME]",
      bodyHtml: "<p>[Text — TO COME]</p>",
      image: { src: "", alt: "" },
      side: "right",
      button: { label: "", href: "" },
    },
  },
  Gallery: {
    label: "Photo gallery",
    fields: {
      heading: text("Heading"),
      images: {
        type: "array",
        label: "Photos",
        max: 24,
        getItemSummary: (it: { alt?: string; caption?: string }, i?: number) =>
          it.caption || it.alt || `Photo ${(i ?? 0) + 1}`,
        defaultItemProps: { src: "", alt: "", caption: "" },
        arrayFields: {
          src: { type: "text", label: "Photo (click the photo on the page to upload)" },
          alt: { type: "text", label: "Describe the photo (alt text)" },
          caption: { type: "text", label: "Caption (optional)" },
        },
      },
      columns: choice("Photos per row", [
        ["2", "2"],
        ["3", "3"],
        ["4", "4"],
      ]),
    },
    defaultProps: {
      heading: "[Gallery heading — TO COME]",
      images: [
        { src: "", alt: "", caption: "" },
        { src: "", alt: "", caption: "" },
        { src: "", alt: "", caption: "" },
      ],
      columns: "3",
    },
  },
  PlanCards: {
    label: "Floor plan cards (from Plans)",
    fields: {
      heading: text("Heading"),
      intro: area("Intro"),
      which: choice(
        "Which plans",
        [
          ["Featured plans", "featured"],
          ["All plans", "all"],
          ["Model home only", "model"],
        ],
        "select",
      ),
    },
    defaultProps: { heading: "Floor plans", intro: "", which: "featured" },
  },
  LotList: {
    label: "Lots (list or map, from Lots)",
    fields: {
      heading: text("Heading"),
      intro: area("Intro"),
      view: choice("Show as", [
        ["List", "list"],
        ["Map", "map"],
      ]),
    },
    defaultProps: { heading: "Phase 1 lots", intro: "", view: "list" },
  },
  CtaBanner: {
    label: "Call-to-action banner",
    fields: {
      heading: text("Heading"),
      body: area("Text"),
      button1: button("Main button"),
      button2: button("Second button"),
    },
    defaultProps: {
      heading: "[Heading — TO COME]",
      body: "",
      button1: { label: "Contact us", href: "/contact" },
      button2: { label: "", href: "" },
      bg: "pine",
    },
  },
  Faq: {
    label: "Questions & answers",
    fields: {
      heading: text("Heading"),
      items: {
        type: "array",
        label: "Questions",
        max: 40,
        getItemSummary: (it: { q?: string }, i?: number) => it.q || `Question ${(i ?? 0) + 1}`,
        defaultItemProps: { q: "[Question — TO COME]", a: "[Answer — TO COME]" },
        arrayFields: {
          q: { type: "text", label: "Question" },
          a: { type: "textarea", label: "Answer" },
        },
      },
    },
    defaultProps: {
      heading: "Questions",
      items: [{ q: "[Question — TO COME]", a: "[Answer — TO COME]" }],
    },
  },
  Testimonials: {
    label: "Testimonials (real quotes only)",
    fields: {
      heading: text("Heading"),
      items: {
        type: "array",
        label: "Quotes — only real ones, with the person's permission",
        max: 12,
        getItemSummary: (it: { name?: string }, i?: number) => it.name || `Quote ${(i ?? 0) + 1}`,
        defaultItemProps: { quote: "", name: "", detail: "" },
        arrayFields: {
          quote: { type: "textarea", label: "Quote" },
          name: { type: "text", label: "Name" },
          detail: { type: "text", label: "Detail (e.g. town)" },
        },
      },
    },
    defaultProps: { heading: "What people say", items: [] },
  },
  LeadForm: {
    label: "Form (contact / tour / waitlist / reservation)",
    fields: {
      heading: text("Heading"),
      intro: area("Intro"),
      formType: choice(
        "Form",
        [
          ["Contact", "contact"],
          ["Book a tour", "tour"],
          ["Join the waitlist", "waitlist"],
          ["Reserve a lot", "reservation"],
        ],
        "select",
      ),
      showTypes: choice("Let visitors switch form type?", [
        ["No", false],
        ["Yes", true],
      ]),
    },
    defaultProps: { heading: "Get in touch", intro: "", formType: "contact", showTypes: false },
  },
  MapEmbed: {
    label: "Google map",
    fields: {
      heading: text("Heading"),
      address: { type: "text", label: "Address or place to show" },
      height: choice("Height", [
        ["Small", "s"],
        ["Medium", "m"],
        ["Large", "l"],
      ]),
    },
    defaultProps: { heading: "", address: "", height: "m" },
  },
  Video: {
    label: "Video (YouTube / Vimeo)",
    fields: {
      heading: text("Heading"),
      url: { type: "text", label: "YouTube or Vimeo link" },
      caption: text("Caption"),
    },
    defaultProps: { heading: "", url: "", caption: "" },
  },
  Spacer: {
    label: "Spacer / divider line",
    fields: {
      size: choice("Size", [
        ["Small", "s"],
        ["Medium", "m"],
        ["Large", "l"],
      ]),
      line: choice("Divider line", [
        ["No", false],
        ["Yes", true],
      ]),
    },
    defaultProps: { size: "m", line: true },
  },
  RichTextBlock: {
    label: "Text (headings, lists, links)",
    fields: {
      html: rich("Text"),
      width: choice("Width", [
        ["Narrow", "narrow"],
        ["Wide", "wide"],
      ]),
    },
    defaultProps: { html: "<h2>[Heading — TO COME]</h2><p>[Text — TO COME]</p>", width: "narrow" },
  },
  Highlights: {
    label: "Key facts strip (real facts only)",
    fields: {
      heading: text("Heading (optional)"),
      items: {
        type: "array",
        label: "Facts — only confirmed ones (no made-up numbers)",
        max: 8,
        getItemSummary: (it: { value?: string; label?: string }, i?: number) =>
          [it.value, it.label].filter(Boolean).join(" · ") || `Fact ${(i ?? 0) + 1}`,
        defaultItemProps: { value: "[PLACEHOLDER]", label: "[PLACEHOLDER]" },
        arrayFields: {
          value: { type: "text", label: "Big text (e.g. 24)" },
          label: { type: "text", label: "Small text below (e.g. homesites)" },
        },
      },
    },
    defaultProps: {
      heading: "",
      items: [
        { value: "[PLACEHOLDER]", label: "[PLACEHOLDER]" },
        { value: "[PLACEHOLDER]", label: "[PLACEHOLDER]" },
        { value: "[PLACEHOLDER]", label: "[PLACEHOLDER]" },
      ],
      bg: "deep",
      padTop: "s",
      padBottom: "s",
    },
  },
  LinkTiles: {
    label: "Photo link tiles (explore the site)",
    fields: {
      eyebrow: text("Small label above"),
      heading: text("Heading"),
      items: {
        type: "array",
        label: "Tiles (click a photo on the page to change it)",
        max: 9,
        getItemSummary: (it: { title?: string }, i?: number) => it.title || `Tile ${(i ?? 0) + 1}`,
        defaultItemProps: { title: "[PLACEHOLDER]", href: "/", src: "", alt: "" },
        arrayFields: {
          title: { type: "text", label: "Tile name" },
          href: link("Tile"),
          src: { type: "text", label: "Photo (click the photo on the page to upload)" },
        },
      },
    },
    defaultProps: {
      eyebrow: "",
      heading: "[PLACEHOLDER]",
      items: [
        { title: "Community", href: "/community", src: "/images/street.jpg", alt: "" },
        { title: "Floor plans", href: "/plans", src: "/images/living.jpg", alt: "" },
        { title: "Contact", href: "/contact", src: "/images/porch.jpg", alt: "" },
      ],
    },
  },
  Statement: {
    label: "Centered intro (e.g. about the builder)",
    fields: {
      eyebrow: text("Small label above"),
      heading: text("Heading"),
      body: area("Text"),
      button: button("Button"),
    },
    defaultProps: {
      eyebrow: "",
      heading: "[PLACEHOLDER]",
      body: "[PLACEHOLDER]",
      button: { label: "", href: "" },
    },
  },
};

function libraryComponent(type: LibraryType): ComponentConfig {
  const C = LIBRARY[type];
  const def = lib[type];
  return {
    label: def.label,
    fields: { ...def.fields, ...styleFields(true) },
    defaultProps: {
      hidden: false,
      bg: "default",
      padTop: "m",
      padBottom: "m",
      anchor: "",
      bgImage: { src: "", alt: "" },
      ...def.defaultProps,
    },
    render: (props) => (
      <HiddenWrap hidden={props.hidden}>
        <C {...props} hidden={false} />
      </HiddenWrap>
    ),
  };
}

function originalComponent(type: string): ComponentConfig {
  const { label, Component } = ORIGINAL_SECTIONS[type];
  const page = systemPageBySlug[ORIGINAL_PAGE[type]];
  return {
    label: `${label}${page ? ` (${page.title})` : ""}`,
    fields: styleFields(false),
    defaultProps: { hidden: false, bg: "default", anchor: "", bgImage: { src: "", alt: "" } },
    permissions: { duplicate: false },
    render: (props) => (
      <HiddenWrap hidden={props.hidden}>
        <Frame style={props as SectionStyle}>
          <Component />
        </Frame>
      </HiddenWrap>
    ),
  };
}

/* ------------------------------------------------------------------ root */

function draftData(base: PublicData, site: SiteDoc): PublicData {
  return {
    ...base,
    blocks: { ...blockDefaults, ...site.texts, [CONTACT_EMAIL_KEY]: contactEmailOf(base.blocks) },
    site: { pages: site.pages, nav: site.nav, theme: site.theme },
    preview: false,
  };
}

function CanvasRoot({
  base,
  slug,
  site,
  children,
}: {
  base: PublicData;
  slug: string;
  site: SiteDoc;
  children: ReactNode;
}) {
  const data = draftData(base, site);
  const css = themeCss(site.theme);
  const tpl = systemPageBySlug[slug]?.template;
  const detail =
    tpl === "plan" ? { plan: base.plans[0] } : tpl === "lot" ? { lot: base.lots[0] } : {};
  return (
    <SiteDataOverride.Provider value={data}>
      <EditContext.Provider value={editApi}>
        <DetailContext.Provider value={detail}>
          <link rel="stylesheet" href={themeFontHref(site.theme)} />
          {css ? <style>{css}</style> : null}
          {/* Links and forms don't navigate or submit while editing. */}
          <div
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.preventDefault();
            }}
            onSubmitCapture={(e) => e.preventDefault()}
          >
            <SiteFrame>{children}</SiteFrame>
          </div>
        </DetailContext.Provider>
      </EditContext.Provider>
    </SiteDataOverride.Provider>
  );
}

export type EditorConfig = Config;

export function buildConfig(base: PublicData, slug: string, pageSections: string[]): Config {
  const components: Record<string, ComponentConfig> = {};
  for (const type of LIBRARY_TYPES) components[type] = libraryComponent(type);
  for (const type of Object.keys(ORIGINAL_SECTIONS)) components[type] = originalComponent(type);
  const sys = systemPageBySlug[slug];
  const missing = [...(sys?.sections ?? []), ...(sys?.optional ?? [])].filter(
    (t) => !pageSections.includes(t),
  );
  const rest = Object.keys(ORIGINAL_SECTIONS).filter((t) => !missing.includes(t));
  return {
    components,
    categories: {
      library: { title: "Add a section", components: [...LIBRARY_TYPES], defaultExpanded: true },
      originals: {
        title: "Original sections of this page (put back)",
        components: missing,
        visible: missing.length > 0,
        defaultExpanded: true,
      },
      unused: { title: "Unused", components: rest, visible: false },
      other: { visible: false },
    },
    root: {
      fields: {},
      render: ({ children, slug: s, siteJson }: { children: ReactNode } & Partial<RootProps>) =>
        siteJson ? (
          <CanvasRoot base={base} slug={s ?? "home"} site={parseSite(siteJson)}>
            {children}
          </CanvasRoot>
        ) : (
          <>{children}</>
        ),
    },
  } as Config;
}
