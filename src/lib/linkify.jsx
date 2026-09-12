import React from "react";

// Matches http(s):// URLs and bare "www." URLs. Kept intentionally simple —
// good enough to catch the common cases in freeform bio/caption text
// without pulling in a markdown/link-parsing dependency.
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,!?'")\]]/gi;

/**
 * Renders freeform text with any URLs turned into clickable links that open
 * in a new tab. Returns an array of strings/React nodes suitable for use
 * as JSX children — safe to render directly (no dangerouslySetInnerHTML).
 */
export function linkifyText(text, linkClassName = "text-cyan-400 hover:text-cyan-300 underline underline-offset-2") {
  if (!text) return text;
  const str = String(text);
  const nodes = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(URL_REGEX);

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(str.slice(lastIndex, match.index));
    }
    const url = match[0];
    const href = url.startsWith("www.") ? `https://${url}` : url;
    nodes.push(
      <a
        key={`${match.index}-${url}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={linkClassName}
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < str.length) {
    nodes.push(str.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

export default linkifyText;
