import "server-only";
import sanitizeHtml from "sanitize-html";

/** Rich-text allowlist for product descriptions, pages and blog posts. Strips scripts, handlers and unknown tags. */
export function sanitizeRich(html: string | null | undefined) {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote",
      "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "hr", "span", "div", "video", "source",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      video: ["src", "controls", "poster", "muted", "playsinline", "loop"],
      source: ["src", "type"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
}

export function stripTags(html: string | null | undefined) {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

/**
 * Wider allowlist for the HTML code widget and landing pages: layout tags, inline styles, <style>, SVG and forms
 * are allowed so whole sections can be built in HTML. Scripts, event handlers and javascript: links are always removed.
 */
export function sanitizeLoose(html: string | null | undefined) {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags, "img", "video", "source", "audio", "picture", "figure", "figcaption", "section", "header", "footer", "main", "article", "aside",
      "nav", "details", "summary", "button", "span", "div", "style", "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "defs",
      "linearGradient", "radialGradient", "stop", "text", "iframe", "h1", "h2", "h3", "h4", "h5", "h6", "mark", "small", "sup", "sub", "del", "ins",
    ],
    allowVulnerableTags: true,
    allowedAttributes: {
      "*": ["class", "id", "style", "title", "role", "aria-*", "data-*", "lang", "dir"],
      a: ["href", "target", "rel"], img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"], source: ["src", "srcset", "type", "media"],
      video: ["src", "controls", "poster", "muted", "playsinline", "loop", "autoplay", "width", "height"], audio: ["src", "controls"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "loading", "title"],
      svg: ["viewBox", "width", "height", "fill", "stroke", "xmlns", "preserveAspectRatio"], path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule"],
      circle: ["cx", "cy", "r", "fill", "stroke"], rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke"], line: ["x1", "y1", "x2", "y2", "stroke"],
      polygon: ["points", "fill", "stroke"], polyline: ["points", "fill", "stroke"], ellipse: ["cx", "cy", "rx", "ry", "fill"], g: ["fill", "stroke", "transform"],
      stop: ["offset", "stop-color", "stop-opacity"], linearGradient: ["id", "x1", "y1", "x2", "y2"], radialGradient: ["id", "cx", "cy", "r"], text: ["x", "y", "fill", "font-size"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], button: ["type"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http", "data"] },
    // Only well-known video hosts may be embedded
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.facebook.com", "www.google.com"],
    transformTags: { a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, rel: attribs.target === "_blank" ? "noopener noreferrer" : attribs.rel ?? "" } }) },
  });
}

/** Strips anything that could break out of a <style> tag. */
export function sanitizeCss(css: string | null | undefined) {
  return (css ?? "").replace(/<\/?\s*style/gi, "").replace(/@import[^;]+;/gi, "").replace(/expression\s*\(/gi, "").replace(/javascript:/gi, "").slice(0, 20000);
}
