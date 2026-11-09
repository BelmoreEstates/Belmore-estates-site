/**
 * Temporary public landing (SITE_MODE=coming-soon).
 *
 * Sections, in order:
 *   1. Hero — logo, eyebrow, heading, description, two buttons, conceptual rendering
 *   2. Inquiry — one panel at a time (waitlist or info request), only after a button
 *   3. Footer — Equal Housing statement, brokerage line, copyright
 *
 * The draft legal page and privacy policy are not rendered.
 */
import { useEffect, useState } from "react";
import { InquiryForm } from "@/components/site/inquiry-form";
import { FooterLegal } from "@/components/site/social-legal";
import { Img, T, Tx } from "@/components/site/text";

const LEDE =
  "Twenty-Four custom built homes completing the final section of the well-established Legends West subdivision in the Town of Greece, NY.";

/** Neutral check. The server still accepts 7 or "seven"; the question does not name lots or streets. */
const HUMAN_CHECK = {
  humanCheckLabel: "Quick human check: what is 3 + 4?",
  humanCheckHelper: "Enter the number.",
  humanCheckError: "Not quite. Try again.",
} as const;

type Panel = "waitlist" | "info";

export function ComingSoonPage() {
  const [panel, setPanel] = useState<Panel | null>(null);

  useEffect(() => {
    if (!panel) return;
    document.getElementById("inquiry")?.scrollIntoView({ block: "start" });
  }, [panel]);

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="coming-soon" data-page="coming-soon">
      <a className="cs-skip" href="#content">
        Skip to content
      </a>
      <section className="cs-hero" id="top" data-section="hero">
        <div className="cs-copy" id="content" tabIndex={-1}>
          <img
            className="cs-logo"
            src="/brand/belmore-mark-white.png"
            alt="Belmore Estates"
            width={1000}
            height={1000}
          />
          <p className="cs-eyebrow">
            <Tx k="home.hero.eyebrow" />
          </p>
          <h1>Coming Soon</h1>
          <p className="cs-lede">{LEDE}</p>
          <div className="cs-actions">
            <button
              type="button"
              className="cs-cta"
              aria-expanded={panel === "waitlist"}
              aria-controls="inquiry"
              onClick={() => toggle("waitlist")}
            >
              Join the Waitlist
            </button>
            <button
              type="button"
              className="cs-cta cs-cta-quiet"
              aria-expanded={panel === "info"}
              aria-controls="inquiry"
              onClick={() => toggle("info")}
            >
              Request Additional Info
            </button>
          </div>
        </div>
        <figure className="cs-photo">
          <Img srcKey="home.hero.image.src" altKey="home.hero.image.alt" className="cs-photo-img" />
          <figcaption>Conceptual rendering</figcaption>
        </figure>
      </section>

      {panel ? (
        <section
          className="cs-light"
          id="inquiry"
          data-section="inquiry"
          data-inquiry={panel}
          aria-labelledby="inquiry-heading"
        >
          <div className="cs-interest">
            <div className="cs-interest-inner">
              {panel === "waitlist" ? (
                <>
                  <h2 id="inquiry-heading">
                    <Tx k="forms.waitlist.title" />
                  </h2>
                  <p className="cs-interest-intro">
                    Leave your name and we'll be in touch about Belmore Estates.
                  </p>
                  <InquiryForm
                    initialType="waitlist"
                    showTypes={false}
                    showIntro={false}
                    submitLabel="Join the Waitlist"
                    {...HUMAN_CHECK}
                  />
                </>
              ) : (
                <>
                  <h2 id="inquiry-heading">Request additional info</h2>
                  <p className="cs-interest-intro">
                    Send a note and we'll reply about Belmore Estates.
                  </p>
                  <InquiryForm
                    initialType="contact"
                    interest="info request"
                    showTypes={false}
                    showIntro={false}
                    hideInterest
                    hideRealtor
                    noteLabel="Message"
                    submitLabel="Send Request"
                    {...HUMAN_CHECK}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div id="inquiry" hidden />
      )}

      <footer className="cs-dark" data-section="footer">
        <FooterLegal force externalNoticesOnly />
        <p className="cs-copyright">
          <T k="global.footer.copyright" />
        </p>
      </footer>
    </div>
  );
}
