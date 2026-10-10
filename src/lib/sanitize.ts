import sanitizeHtml from "sanitize-html";

/** Product/blog HTML is admin-authored; still strip scripts and handlers. */
export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "iframe"]),
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "width", "height", "allowfullscreen", "frameborder"],
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
  });
}
