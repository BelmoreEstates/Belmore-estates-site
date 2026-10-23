import { createFileRoute } from "@tanstack/react-router";
import { contactEmailOf, seoHead, socialDefaults, textOf } from "@/components/site/text";
import { organizationLd } from "@/lib/jsonld";
import { SOCIAL_NETWORKS, socialKey } from "@/site/social-icons";
import { PageView } from "@/site/page-view";

/** Sections come from the site doc (src/site/sections/* + editor blocks). */
export const Route = createFileRoute("/")({
  component: () => <PageView slug="home" />,
  head: seoHead("home", undefined, (_params, data) =>
    organizationLd({
      name: socialDefaults(data.blocks).siteName,
      email: contactEmailOf(data.blocks),
      // Only the https profile links the owner set in Settings.
      sameAs: SOCIAL_NETWORKS.map((n) => textOf(data.blocks, socialKey(n.id)).trim()).filter((u) =>
        /^https:\/\//.test(u),
      ),
    }),
  ),
});
