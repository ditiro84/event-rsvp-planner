import { Fragment, type ReactNode } from "react";

// Small, dependency-free renderer for the subset of markdown article bodies
// actually need (per the agreed scope: "simple posts that can have images
// if need be", not a full rich-text editor): #/##/### headings, **bold**,
// [text](url) links, ![alt](url) images, "- " bullet lists, and blank-line
// paragraphs. Builds React elements directly (never dangerouslySetInnerHTML)
// so there's no HTML-injection surface even though the only author is an
// admin.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Order matters: images before links (both use brackets+parens, but
  // images have a leading "!"), then bold.
  const tokenPattern = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  const parts = text.split(tokenPattern);
  return parts
    .map((part, i) => {
      const key = `${keyPrefix}-${i}`;
      if (!part) return null;
      const imageMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        return <img key={key} src={imageMatch[2]} alt={imageMatch[1]} className="my-4 rounded-lg" />;
      }
      const linkMatch = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-700">
            {linkMatch[1]}
          </a>
        );
      }
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return <strong key={key}>{boldMatch[1]}</strong>;
      }
      return <Fragment key={key}>{part}</Fragment>;
    })
    .filter(Boolean);
}

export function renderMarkdownLite(body: string): ReactNode {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph(key: string) {
    if (paragraphLines.length === 0) return;
    blocks.push(
      <p key={key} className="mb-4 leading-relaxed text-slate-700">
        {renderInline(paragraphLines.join(" "), key)}
      </p>
    );
    paragraphLines = [];
  }

  function flushList(key: string) {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="mb-4 list-disc space-y-1 pl-5 text-slate-700">
        {listItems.map((item, i) => (
          <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const key = `b-${index}`;

    if (line === "") {
      flushParagraph(key);
      flushList(key);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph(key);
      flushList(key);
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const className =
        level === 1
          ? "mb-4 mt-8 font-display text-2xl font-bold text-slate-950 first:mt-0"
          : level === 2
            ? "mb-3 mt-6 font-display text-xl font-bold text-slate-950 first:mt-0"
            : "mb-2 mt-4 font-display text-lg font-semibold text-slate-950 first:mt-0";
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      blocks.push(
        <Tag key={key} className={className}>
          {renderInline(text, key)}
        </Tag>
      );
      return;
    }

    if (line.startsWith("- ")) {
      flushParagraph(key);
      listItems.push(line.slice(2));
      return;
    }

    // Standalone image line
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) {
      flushParagraph(key);
      flushList(key);
      blocks.push(<Fragment key={key}>{renderInline(line, key)}</Fragment>);
      return;
    }

    flushList(key);
    paragraphLines.push(line);
  });

  flushParagraph("end-p");
  flushList("end-list");

  return <>{blocks}</>;
}
