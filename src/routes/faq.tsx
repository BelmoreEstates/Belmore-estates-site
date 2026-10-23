import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/components/site/text";
import { PageView } from "@/site/page-view";

/** Sections come from the site doc (src/site/sections/* + editor blocks). */
export const Route = createFileRoute("/faq")({
  component: () => <PageView slug="faq" />,
  head: seoHead("faq"),
});
