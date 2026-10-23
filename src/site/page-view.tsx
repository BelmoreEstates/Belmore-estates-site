import { Fragment } from "react";
import { useSiteData } from "@/components/site/text";
import { defaultPage } from "./doc";
import { renderBlock } from "./registry";

/** Visitor rendering of a page from the (published, or admin-preview draft) site doc. */
export function PageView({ slug }: { slug: string }) {
  const { site } = useSiteData();
  const page = site.pages[slug] ?? defaultPage(slug);
  if (!page) return null;
  return (
    <>
      {page.content.map((block) => (
        <Fragment key={block.props.id}>{renderBlock(block)}</Fragment>
      ))}
    </>
  );
}
