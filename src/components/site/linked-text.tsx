import { Link } from "@tanstack/react-router";
import { RichText, T, textOf, useEditApi, useSiteData } from "@/components/site/text";

/**
 * Keyed text with one phrase turned into an internal link, e.g. Quill's
 * contact.next "…on our process page." → "process page" links to /process.
 * In the editor the whole string stays editable; when the phrase is missing
 * the text renders unchanged.
 */
export function PhraseLink({ k, phrase, to }: { k: string; phrase: string; to: "/process" }) {
  const edit = useEditApi();
  const { blocks } = useSiteData();
  if (edit) return <T k={k} />;
  const text = textOf(blocks, k);
  const at = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (at < 0) return <RichText text={text} />;
  return (
    <>
      <RichText text={text.slice(0, at)} />
      <Link to={to} className="underline underline-offset-2">
        {text.slice(at, at + phrase.length)}
      </Link>
      <RichText text={text.slice(at + phrase.length)} />
    </>
  );
}
