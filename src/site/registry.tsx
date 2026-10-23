/**
 * Section registry: every block type the site can render.
 *  - Original sections: the hand-built design, one per slot, bound to keyed
 *    texts (src/data/content.ts). They can be hidden, moved, re-coloured and
 *    deleted (and re-added from "Original sections" in the editor).
 *  - Library blocks (src/site/blocks.tsx): addable anywhere, any number of times.
 */
import type { ComponentType, ReactNode } from "react";
import * as about from "./sections/about";
import * as community from "./sections/community";
import * as contact from "./sections/contact";
import * as studio from "./sections/design-studio";
import * as faq from "./sections/faq";
import * as home from "./sections/home";
import * as homes from "./sections/homes";
import * as lotDetail from "./sections/lot-detail";
import * as planDetail from "./sections/plan-detail";
import * as plans from "./sections/plans";
import * as privacy from "./sections/privacy";
import * as process from "./sections/process";
import * as legal from "@/components/site/social-legal";
import { Frame, LIBRARY, type SectionStyle } from "./blocks";
import { isLibraryType, type Block } from "./doc";

export const ORIGINAL_SECTIONS: Record<string, { label: string; Component: ComponentType }> = {
  HomeHero: { label: "Welcome (top of page)", Component: home.HomeHero },
  HomeOffer: { label: "What we offer", Component: home.HomeOffer },
  HomePlans: { label: "Model home & featured plans", Component: home.HomePlans },
  HomeSiteModel: { label: "Interactive site map", Component: home.HomeSiteModel },
  HomePhase1: { label: "Phase 1 lots", Component: home.HomePhase1 },
  HomeStudio: { label: "Design studio teaser", Component: home.HomeStudio },
  HomeProcess: { label: "How it works", Component: home.HomeProcess },
  HomeTrust: { label: "Why Belmore Estates (trust band)", Component: legal.HomeTrust },
  HomeTestimonial: {
    label: "Buyer story (hidden until a real quote)",
    Component: legal.HomeTestimonial,
  },
  HomeFairHousing: { label: "Fair Housing Notice line", Component: legal.HomeFairHousing },
  CommunityIntro: { label: "Community intro", Component: community.CommunityIntro },
  CommunityPlat: { label: "Plat & lots", Component: community.CommunityPlat },
  CommunityModel: { label: "Site map", Component: community.CommunityModel },
  CommunityGround: { label: "On the ground", Component: community.CommunityGround },
  PlansIntro: { label: "Floor plans intro", Component: plans.PlansIntro },
  PlansModel: { label: "Model home", Component: plans.PlansModel },
  PlansCollection: { label: "Plan collection", Component: plans.PlansCollection },
  PlansHow: { label: "How plans work", Component: plans.PlansHow },
  PlansCustomize: { label: "Customize a plan", Component: plans.PlansCustomize },
  PlansAgent: { label: "For agents", Component: plans.PlansAgent },
  HomesLots: { label: "Lot list & map", Component: homes.HomesLots },
  StudioIntro: { label: "Design studio intro", Component: studio.StudioIntro },
  StudioSteps: { label: "Studio steps", Component: studio.StudioSteps },
  StudioPicks: { label: "Finish picks", Component: studio.StudioPicks },
  StudioCta: { label: "Studio call to action", Component: studio.StudioCta },
  ProcessIntro: { label: "Process intro", Component: process.ProcessIntro },
  ProcessSteps: { label: "Process steps", Component: process.ProcessSteps },
  ProcessPhases: { label: "Process phases & stages", Component: process.ProcessPhases },
  ProcessWarranty: { label: "Process warranty note", Component: process.ProcessWarranty },
  ProcessCta: { label: "Process call to action", Component: process.ProcessCta },
  AboutIntro: { label: "About intro", Component: about.AboutIntro },
  AboutStory: { label: "Our story", Component: about.AboutStory },
  AboutTeam: { label: "Team", Component: about.AboutTeam },
  AboutHistory: { label: "History timeline", Component: about.AboutHistory },
  AboutLand: { label: "The land", Component: about.AboutLand },
  AboutVision: { label: "What it will be", Component: about.AboutVision },
  AboutCta: { label: "About call to action", Component: about.AboutCta },
  FaqList: { label: "Questions & answers", Component: faq.FaqList },
  PrivacyPolicy: { label: "Privacy policy", Component: privacy.PrivacyPolicy },
  LegalNotices: { label: "Fair housing & legal notices", Component: legal.LegalPage },
  ContactMain: { label: "Contact form & details", Component: contact.ContactMain },
  PlanDetailHero: {
    label: "Plan photos & facts (from Plans)",
    Component: planDetail.PlanDetailHero,
  },
  PlanDetailGallery: {
    label: "Plan gallery (from Plans)",
    Component: planDetail.PlanDetailGallery,
  },
  PlanDetailForm: { label: "Plan inquiry form", Component: planDetail.PlanDetailForm },
  PlanDetailOthers: { label: "Other plans", Component: planDetail.PlanDetailOthers },
  LotDetailHero: { label: "Lot facts (from Lots)", Component: lotDetail.LotDetailHero },
  LotDetailForm: { label: "Lot inquiry form", Component: lotDetail.LotDetailForm },
};

/** Render one block (public pages and the editor canvas). */
export function renderBlock(block: Block): ReactNode {
  const props = block.props as SectionStyle & { id: string };
  if (props.hidden) return null;
  if (isLibraryType(block.type)) {
    const C = LIBRARY[block.type];
    return <C {...props} />;
  }
  const original = ORIGINAL_SECTIONS[block.type];
  if (!original) return null;
  const C = original.Component;
  return (
    <Frame style={props}>
      <C />
    </Frame>
  );
}
