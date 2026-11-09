/**
 * Temporary public landing (SITE_MODE=coming-soon).
 * Copy, hero, lead form, and fair-housing / brokerage notices come from the
 * existing site. Nothing here names a person who is not already in that copy.
 */
import { InquiryForm } from "@/components/site/inquiry-form";
import { FooterLegal, HomeFairHousing, LegalPage } from "@/components/site/social-legal";
import { Img, T, Tx } from "@/components/site/text";
import { PrivacyPolicy } from "@/site/sections/privacy";

const LEDE =
  "Twenty-Four custom built homes completing the final section of the well-established Legends West subdivision in the Town of Greece, NY.";

export function ComingSoonPage() {
  return (
    <div className="coming-soon" data-page="coming-soon">
      <a className="cs-skip" href="#content">
        Skip to content
      </a>
      <section className="cs-hero" id="top">
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
          <a className="cs-cta" href="#interest">
            <Tx k="global.cta.waitlist" />
          </a>
        </div>
        <figure className="cs-photo">
          <Img srcKey="home.hero.image.src" altKey="home.hero.image.alt" className="cs-photo-img" />
          <figcaption>Conceptual rendering</figcaption>
        </figure>
      </section>

      <div className="cs-light">
        <HomeFairHousing force />
        <section className="cs-interest" id="interest" aria-labelledby="interest-heading">
          <div className="cs-interest-inner">
            <h2 id="interest-heading">
              <Tx k="forms.waitlist.title" />
            </h2>
            <p className="cs-interest-intro">
              Leave your name and we'll be in touch about Belmore Estates.
            </p>
            <InquiryForm initialType="waitlist" showTypes={false} showIntro={false} />
          </div>
        </section>
        <div id="legal">
          <LegalPage />
        </div>
        <div id="privacy">
          <PrivacyPolicy />
        </div>
      </div>

      <footer className="cs-dark">
        <FooterLegal force />
        <p className="cs-copyright">
          <T k="global.footer.copyright" />
        </p>
      </footer>
    </div>
  );
}
