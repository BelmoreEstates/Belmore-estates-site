import { createFileRoute } from "@tanstack/react-router";
import { seoHead } from "@/components/site/text";
import { PageView } from "@/site/page-view";

/** Sections come from the site doc (src/site/sections/* + editor blocks). */
export const Route = createFileRoute("/community")({
  component: () => <PageView slug="community" />,
  head: seoHead("community"),
});
