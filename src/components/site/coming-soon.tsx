/**
 * Temporary public landing (SITE_MODE=coming-soon).
 * Copy, hero, lead form, and fair-housing / brokerage notices come from the
 * existing site. Nothing here names a person who is not already in that copy.
 */
import { InquiryForm } from "@/components/site/inquiry-form";
import { FooterLegal, HomeFairHousing, LegalPage } from "@/components/site/social-legal";
import { Img, T, Tx, contactEmailOf, useSiteData } from "@/components/site/text";
import { SOCIAL_PATHS } from "@/site/social-icons";
import { PrivacyPolicy } from "@/site/sections/privacy";

const INSTAGRAM_URL = "https://www.instagram.com/belmoreestates/";
const INSTAGRAM_HANDLE = "@belmoreestates";

const LEDE =
  "A 24-lot semi-custom home community in North Greece, NY, within Legends West. Phase 1 is lots 801–807, on Belmore Way and Shelby Circle.";

export function ComingSoonPage() {
  const { blocks } = useSiteData();
  const email = contactEmailOf(blocks);

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
          <ul className="cs-contacts">
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <InstagramGlyph />
                Instagram {INSTAGRAM_HANDLE}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
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
            <p className="cs-eyebrow cs-eyebrow-dark">
              <Tx k="home.hero.subeyebrow" />
            </p>
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
        <div className="cs-dark-contacts">
          <a href={`mailto:${email}`}>{email}</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            Instagram {INSTAGRAM_HANDLE}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <FooterLegal force />
        <p className="cs-copyright">
          <T k="global.footer.copyright" />
        </p>
      </footer>
    </div>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d={SOCIAL_PATHS.instagram} />
    </svg>
  );
}
