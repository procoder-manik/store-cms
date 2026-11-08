/**
 * Section library: every block the page builder can place, its style variants, the fields shown in
 * Admin > Page builder and a tiny schematic used as the visual preview.
 * Thumb boxes are [x, y, w, h, kind] on a 120 x 72 canvas. Kinds: i image, t title, s text, b button, c card, d dark.
 */
export type FieldType = "code" | "text" | "textarea" | "image" | "url" | "number" | "select" | "switch" | "datetime" | "category" | "categories" | "products" | "items";
export interface Field { key: string; label: string; type: FieldType; options?: { value: string; label: string }[]; hint?: string; fields?: Field[]; max?: number; variants?: string[] }
export type Box = [number, number, number, number, "i" | "t" | "s" | "b" | "c" | "d"];
export interface Variant { id: string; label: string; thumb: Box[] }
export interface SectionDef { type: string; label: string; group: "Hero" | "Products" | "Promotion" | "Content" | "Social proof"; description: string; variants: Variant[]; fields: Field[]; defaults: Record<string, unknown> }

const source: Field[] = [
  { key: "source", label: "Products to show", type: "select", options: [
    { value: "newest", label: "Newest" }, { value: "best_selling", label: "Best selling" }, { value: "featured", label: "Featured" },
    { value: "on_sale", label: "On sale" }, { value: "category", label: "From a category" }, { value: "manual", label: "Pick products" }] },
  { key: "category_id", label: "Category", type: "category", hint: "Used when 'From a category' is chosen." },
  { key: "product_ids", label: "Products", type: "products", hint: "Used when 'Pick products' is chosen." },
  { key: "limit", label: "How many", type: "number" },
];
const cta: Field[] = [{ key: "cta_label", label: "Button text", type: "text" }, { key: "cta_url", label: "Button link", type: "url" }];
const cardStyle: Field = { key: "card", label: "Card style", type: "select", options: [
  { value: "", label: "Theme default" }, { value: "classic", label: "Classic" }, { value: "minimal", label: "Minimal" }, { value: "overlay", label: "Overlay" }, { value: "bordered", label: "Boxed" }] };
const slideFields: Field[] = [
  { key: "image", label: "Image (desktop)", type: "image" }, { key: "mobile_image", label: "Image (phone, optional)", type: "image" },
  { key: "title", label: "Headline", type: "text" }, { key: "subtitle", label: "Text", type: "textarea" },
  { key: "cta_label", label: "Button text", type: "text" }, { key: "cta_url", label: "Link", type: "url" },
  { key: "align", label: "Text position", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
  { key: "tone", label: "Text color", type: "select", options: [{ value: "light", label: "White (dark photo)" }, { value: "dark", label: "Black (light photo)" }] },
];

const THREE_D = ["tilt3d", "ring3d", "stack3d", "mesh", "orbit", "marquee"];

export const SECTIONS: SectionDef[] = [
  { type: "hero", label: "Hero", group: "Hero", description: "The first thing visitors see: banners, sliders or a product spotlight.",
    variants: [
      { id: "slider", label: "Banner slider", thumb: [[0, 0, 120, 72, "i"], [10, 24, 50, 7, "t"], [10, 35, 40, 4, "s"], [10, 45, 22, 8, "b"], [52, 64, 16, 3, "s"]] },
      { id: "split", label: "Split text and image", thumb: [[6, 20, 46, 8, "t"], [6, 32, 40, 4, "s"], [6, 42, 22, 8, "b"], [62, 6, 52, 60, "i"]] },
      { id: "product", label: "Product spotlight slider", thumb: [[0, 0, 120, 72, "c"], [8, 20, 44, 7, "t"], [8, 31, 30, 5, "s"], [8, 42, 24, 8, "b"], [66, 8, 46, 56, "i"]] },
      { id: "bento", label: "Bento promo grid", thumb: [[4, 4, 70, 64, "i"], [78, 4, 38, 31, "i"], [78, 37, 38, 31, "i"], [10, 48, 36, 6, "t"]] },
      { id: "video", label: "Video background", thumb: [[0, 0, 120, 72, "d"], [30, 26, 60, 8, "t"], [40, 38, 40, 4, "s"], [48, 48, 24, 8, "b"]] },
      { id: "centered", label: "Big headline with glow", thumb: [[20, 14, 80, 9, "t"], [30, 27, 60, 4, "s"], [46, 36, 28, 8, "b"], [10, 52, 22, 16, "i"], [36, 52, 22, 16, "i"], [62, 52, 22, 16, "i"], [88, 52, 22, 16, "i"]] },
      { id: "floating", label: "Floating products", thumb: [[30, 26, 60, 8, "t"], [38, 38, 44, 4, "s"], [6, 6, 22, 22, "i"], [92, 10, 22, 22, "i"], [10, 46, 20, 20, "i"], [90, 44, 22, 22, "i"]] },
      { id: "coverflow", label: "Card carousel", thumb: [[2, 10, 26, 52, "i"], [32, 4, 56, 64, "i"], [92, 10, 26, 52, "i"], [40, 50, 30, 6, "t"]] },
      { id: "tilt3d", label: "3D tilt product", thumb: [[0, 0, 120, 72, "c"], [8, 24, 44, 7, "t"], [8, 35, 34, 4, "s"], [8, 45, 22, 8, "b"], [70, 8, 40, 56, "i"], [62, 48, 26, 10, "c"], [100, 12, 14, 7, "c"]] },
      { id: "ring3d", label: "3D product ring", thumb: [[0, 0, 120, 72, "d"], [34, 8, 52, 7, "t"], [10, 34, 18, 26, "i"], [32, 30, 20, 32, "i"], [56, 28, 22, 36, "i"], [82, 30, 20, 32, "i"], [104, 34, 14, 26, "i"]] },
      { id: "stack3d", label: "3D card stack", thumb: [[8, 24, 44, 7, "t"], [8, 35, 34, 4, "s"], [8, 45, 22, 8, "b"], [82, 6, 30, 50, "i"], [76, 10, 30, 50, "i"], [70, 14, 30, 52, "i"]] },
      { id: "mesh", label: "Gradient mesh + glass", thumb: [[0, 0, 120, 72, "d"], [0, 0, 60, 40, "b"], [8, 26, 50, 8, "c"], [8, 38, 36, 4, "s"], [74, 10, 38, 50, "c"], [78, 14, 30, 34, "i"]] },
      { id: "orbit", label: "Orbiting products", thumb: [[8, 24, 40, 7, "t"], [8, 35, 30, 4, "s"], [8, 45, 20, 8, "b"], [76, 22, 26, 26, "i"], [64, 8, 10, 10, "i"], [104, 14, 10, 10, "i"], [108, 50, 10, 10, "i"], [62, 54, 10, 10, "i"]] },
      { id: "marquee", label: "Big type marquee", thumb: [[0, 0, 120, 72, "b"], [0, 14, 120, 14, "c"], [0, 34, 120, 14, "c"], [42, 12, 36, 40, "i"], [46, 58, 28, 7, "d"]] },
    ],
    fields: [
      { key: "slides", label: "Slides / tiles", type: "items", fields: slideFields, max: 8, variants: ["slider", "bento", "coverflow", "split"] },
      { key: "title", label: "Headline", type: "text", variants: ["split", "product", "video", "centered", "floating", ...THREE_D] },
      { key: "subtitle", label: "Text", type: "textarea", variants: ["split", "video", "centered", "floating", ...THREE_D] },
      ...cta.map((f) => ({ ...f, variants: ["split", "video", "centered", "floating", ...THREE_D] })),
      { key: "image", label: "Image", type: "image", variants: ["split"] },
      { key: "video_url", label: "Video URL (.mp4)", type: "url", hint: "Upload in Media and paste the link.", variants: ["video"] },
      ...source.map((f) => ({ ...f, variants: ["product", "centered", "floating", ...THREE_D] })),
      { key: "width", label: "Width", type: "select", options: [{ value: "boxed", label: "Boxed (rounded card)" }, { value: "full", label: "Full width (edge to edge)" }] },
      { key: "height", label: "Height", type: "select", options: [{ value: "medium", label: "Medium" }, { value: "large", label: "Large" }, { value: "full", label: "Full screen" }], variants: ["slider", "video"] },
      { key: "autoplay", label: "Auto-play slides", type: "switch", variants: ["slider", "product", "coverflow"] },
    ],
    defaults: { variant: "slider", height: "large", autoplay: true, limit: 6, source: "featured", slides: [], width: "boxed" } },

  { type: "categories", label: "Categories", group: "Products", description: "Help shoppers jump to a category.",
    variants: [
      { id: "tiles", label: "Tiles", thumb: [[4, 20, 26, 32, "c"], [33, 20, 26, 32, "c"], [62, 20, 26, 32, "c"], [91, 20, 26, 32, "c"], [4, 8, 40, 6, "t"]] },
      { id: "circles", label: "Circles", thumb: [[8, 22, 20, 20, "i"], [32, 22, 20, 20, "i"], [56, 22, 20, 20, "i"], [80, 22, 20, 20, "i"], [8, 46, 20, 3, "s"], [32, 46, 20, 3, "s"]] },
      { id: "carousel", label: "Scrolling chips", thumb: [[4, 28, 30, 14, "c"], [38, 28, 30, 14, "c"], [72, 28, 30, 14, "c"], [106, 28, 14, 14, "c"]] },
      { id: "bento", label: "Photo mosaic", thumb: [[4, 6, 56, 60, "i"], [64, 6, 26, 28, "i"], [92, 6, 24, 28, "i"], [64, 38, 52, 28, "i"]] },
    ],
    fields: [{ key: "subtitle", label: "Text", type: "text" }, { key: "categories", label: "Categories (empty = top categories)", type: "categories" }, { key: "limit", label: "How many", type: "number" }],
    defaults: { variant: "tiles", limit: 8 } },

  { type: "products", label: "Products", group: "Products", description: "A grid, carousel or tabbed list of products.",
    variants: [
      { id: "grid", label: "Grid", thumb: [[4, 14, 26, 30, "i"], [33, 14, 26, 30, "i"], [62, 14, 26, 30, "i"], [91, 14, 26, 30, "i"], [4, 48, 20, 3, "s"], [33, 48, 20, 3, "s"], [4, 4, 40, 6, "t"]] },
      { id: "carousel", label: "Carousel", thumb: [[4, 14, 30, 36, "i"], [38, 14, 30, 36, "i"], [72, 14, 30, 36, "i"], [106, 14, 14, 36, "i"], [4, 4, 40, 6, "t"]] },
      { id: "tabs", label: "Tabs", thumb: [[30, 4, 18, 6, "b"], [51, 4, 18, 6, "c"], [72, 4, 18, 6, "c"], [4, 16, 26, 30, "i"], [33, 16, 26, 30, "i"], [62, 16, 26, 30, "i"], [91, 16, 26, 30, "i"]] },
      { id: "spotlight", label: "Spotlight", thumb: [[4, 6, 54, 60, "i"], [62, 6, 26, 28, "i"], [91, 6, 26, 28, "i"], [62, 38, 26, 28, "i"], [91, 38, 26, 28, "i"]] },
    ],
    fields: [{ key: "subtitle", label: "Text", type: "text" }, ...source, cardStyle, { key: "view_all_url", label: "'View all' link", type: "url" }],
    defaults: { variant: "grid", source: "newest", limit: 8, card: "" } },

  { type: "flash_sale", label: "Flash sale", group: "Promotion", description: "Live sale with a countdown. Set it up in Marketing > Flash sales.",
    variants: [
      { id: "grid", label: "Grid", thumb: [[4, 4, 40, 6, "t"], [80, 4, 36, 6, "b"], [4, 16, 26, 34, "i"], [33, 16, 26, 34, "i"], [62, 16, 26, 34, "i"], [91, 16, 26, 34, "i"]] },
      { id: "carousel", label: "Carousel on color", thumb: [[0, 0, 120, 72, "b"], [6, 8, 40, 6, "d"], [6, 20, 32, 44, "c"], [42, 20, 32, 44, "c"], [78, 20, 32, 44, "c"]] },
    ],
    fields: [], defaults: { variant: "grid" } },

  { type: "banner", label: "Promo banners", group: "Promotion", description: "One, two or three clickable banners, or a slim strip.",
    variants: [
      { id: "single", label: "Single wide", thumb: [[4, 10, 112, 52, "i"], [12, 26, 40, 7, "t"], [12, 38, 20, 7, "b"]] },
      { id: "duo", label: "Two side by side", thumb: [[4, 10, 55, 52, "i"], [61, 10, 55, 52, "i"], [10, 48, 26, 6, "t"], [67, 48, 26, 6, "t"]] },
      { id: "trio", label: "Three", thumb: [[4, 14, 36, 44, "i"], [42, 14, 36, 44, "i"], [80, 14, 36, 44, "i"]] },
      { id: "strip", label: "Slim strip", thumb: [[0, 28, 120, 14, "b"], [30, 33, 60, 4, "d"]] },
    ],
    fields: [{ key: "items", label: "Banners", type: "items", max: 3, fields: [
      { key: "image", label: "Image", type: "image" }, { key: "title", label: "Headline", type: "text" }, { key: "subtitle", label: "Text", type: "text" },
      { key: "cta_label", label: "Button text", type: "text" }, { key: "url", label: "Link", type: "url" }] },
      { key: "ends_at", label: "Countdown end (strip, optional)", type: "datetime", variants: ["strip"] },
      { key: "width", label: "Width", type: "select", options: [{ value: "boxed", label: "Boxed" }, { value: "full", label: "Full width" }], variants: ["single"] }],
    defaults: { variant: "duo", items: [] } },

  { type: "countdown", label: "Countdown promo", group: "Promotion", description: "Big countdown to a sale or launch.",
    variants: [{ id: "default", label: "Countdown", thumb: [[0, 0, 120, 72, "d"], [20, 14, 80, 8, "t"], [26, 30, 14, 14, "c"], [44, 30, 14, 14, "c"], [62, 30, 14, 14, "c"], [80, 30, 14, 14, "c"], [46, 52, 28, 8, "b"]] }],
    fields: [{ key: "subtitle", label: "Text", type: "text" }, { key: "ends_at", label: "Ends at", type: "datetime" }, { key: "image", label: "Background image (optional)", type: "image" }, ...cta],
    defaults: { variant: "default" } },

  { type: "features", label: "Store promises", group: "Content", description: "Delivery, returns, payment and other reasons to buy.",
    variants: [
      { id: "row", label: "Glass row", thumb: [[4, 24, 36, 24, "c"], [42, 24, 36, 24, "c"], [80, 24, 36, 24, "c"]] },
      { id: "cards", label: "Icon cards", thumb: [[4, 14, 26, 44, "c"], [33, 14, 26, 44, "c"], [62, 14, 26, 44, "c"], [91, 14, 26, 44, "c"]] },
    ],
    fields: [{ key: "items", label: "Promises (empty = defaults)", type: "items", max: 4, fields: [
      { key: "icon", label: "Icon", type: "select", options: ["truck", "cash", "return", "shield", "clock", "gift", "chat", "star"].map((v) => ({ value: v, label: v })) },
      { key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "text" }] }],
    defaults: { variant: "row", items: [] } },

  { type: "image_text", label: "Image with text", group: "Content", description: "Tell a story next to a photo.",
    variants: [
      { id: "left", label: "Image left", thumb: [[4, 6, 54, 60, "i"], [66, 22, 46, 7, "t"], [66, 33, 40, 4, "s"], [66, 44, 22, 8, "b"]] },
      { id: "right", label: "Image right", thumb: [[62, 6, 54, 60, "i"], [8, 22, 46, 7, "t"], [8, 33, 40, 4, "s"], [8, 44, 22, 8, "b"]] },
    ],
    fields: [{ key: "image", label: "Image", type: "image" }, { key: "text", label: "Text", type: "textarea" }, ...cta], defaults: { variant: "left" } },

  { type: "testimonials", label: "Testimonials", group: "Social proof", description: "Customer quotes. Empty = latest 5-star reviews.",
    variants: [
      { id: "cards", label: "Cards", thumb: [[4, 14, 36, 44, "c"], [42, 14, 36, 44, "c"], [80, 14, 36, 44, "c"]] },
      { id: "quote", label: "Big quote", thumb: [[20, 18, 80, 8, "t"], [30, 30, 60, 4, "s"], [50, 44, 20, 4, "s"]] },
    ],
    fields: [{ key: "items", label: "Quotes (optional)", type: "items", max: 6, fields: [{ key: "name", label: "Name", type: "text" }, { key: "text", label: "Quote", type: "textarea" }, { key: "avatar", label: "Photo", type: "image" }] }],
    defaults: { variant: "cards", items: [] } },

  { type: "brands", label: "Brand logos", group: "Social proof", description: "Logos of brands you sell.",
    variants: [
      { id: "row", label: "Scrolling row", thumb: [[4, 30, 20, 12, "s"], [28, 30, 20, 12, "s"], [52, 30, 20, 12, "s"], [76, 30, 20, 12, "s"], [100, 30, 20, 12, "s"]] },
      { id: "grid", label: "Grid", thumb: [[4, 14, 26, 20, "c"], [33, 14, 26, 20, "c"], [62, 14, 26, 20, "c"], [91, 14, 26, 20, "c"], [4, 38, 26, 20, "c"], [33, 38, 26, 20, "c"]] },
    ],
    fields: [{ key: "items", label: "Logos", type: "items", max: 16, fields: [{ key: "image", label: "Logo", type: "image" }, { key: "url", label: "Link", type: "url" }] }],
    defaults: { variant: "row", items: [] } },

  { type: "gallery", label: "Photo gallery", group: "Social proof", description: "Instagram-style photo grid.",
    variants: [{ id: "grid", label: "Grid", thumb: [[4, 6, 36, 28, "i"], [42, 6, 36, 28, "i"], [80, 6, 36, 28, "i"], [4, 38, 36, 28, "i"], [42, 38, 36, 28, "i"], [80, 38, 36, 28, "i"]] }],
    fields: [{ key: "items", label: "Photos (empty = product photos)", type: "items", max: 12, fields: [{ key: "image", label: "Photo", type: "image" }, { key: "url", label: "Link", type: "url" }] }],
    defaults: { variant: "grid", items: [] } },

  { type: "newsletter", label: "Newsletter", group: "Content", description: "Collect emails for offers.",
    variants: [
      { id: "card", label: "Glow card", thumb: [[4, 10, 112, 52, "c"], [12, 22, 50, 7, "t"], [12, 40, 60, 9, "s"], [76, 40, 26, 9, "b"]] },
      { id: "split", label: "Split with photo", thumb: [[4, 6, 54, 60, "i"], [64, 22, 46, 7, "t"], [64, 40, 30, 8, "s"], [96, 40, 18, 8, "b"]] },
      { id: "minimal", label: "Minimal", thumb: [[30, 22, 60, 7, "t"], [26, 38, 46, 8, "s"], [74, 38, 20, 8, "b"]] },
    ],
    fields: [{ key: "subtitle", label: "Text", type: "text" }, { key: "image", label: "Image (split)", type: "image", variants: ["split"] }],
    defaults: { variant: "card" } },

  { type: "video", label: "Video", group: "Content", description: "A product or brand video.",
    variants: [{ id: "default", label: "Video", thumb: [[10, 8, 100, 56, "d"], [54, 30, 12, 12, "b"]] }],
    fields: [{ key: "video_url", label: "Video URL (.mp4)", type: "url" }, { key: "poster", label: "Cover image", type: "image" }, { key: "subtitle", label: "Text", type: "text" }],
    defaults: { variant: "default" } },

  { type: "faq", label: "FAQ", group: "Content", description: "Questions from Content > FAQ.",
    variants: [{ id: "default", label: "Accordion", thumb: [[10, 10, 100, 10, "c"], [10, 24, 100, 10, "c"], [10, 38, 100, 10, "c"], [10, 52, 100, 10, "c"]] }],
    fields: [{ key: "limit", label: "How many", type: "number" }], defaults: { variant: "default", limit: 6 } },

  { type: "html", label: "HTML code", group: "Content", description: "Build any section with your own HTML and CSS. Scripts are removed for safety.",
    variants: [{ id: "default", label: "Code", thumb: [[10, 10, 100, 52, "d"], [16, 18, 30, 4, "b"], [16, 26, 60, 4, "s"], [16, 34, 46, 4, "s"], [16, 42, 70, 4, "s"]] }],
    fields: [{ key: "html", label: "HTML", type: "code", hint: "Tip: add a <style> block for custom CSS. Use classes like container-x for page width." },
      { key: "width", label: "Width", type: "select", options: [{ value: "boxed", label: "Page width" }, { value: "full", label: "Full width" }] }],
    defaults: { variant: "default", width: "boxed", html: "<div style=\"padding:48px;text-align:center\"><h2>Your section</h2><p>Write HTML here.</p></div>" } },

  { type: "rich_text", label: "Text block", group: "Content", description: "Free text (HTML allowed).",
    variants: [{ id: "default", label: "Text", thumb: [[20, 14, 80, 8, "t"], [20, 28, 80, 4, "s"], [20, 36, 76, 4, "s"], [20, 44, 70, 4, "s"]] }],
    fields: [{ key: "html", label: "Text", type: "textarea", hint: "Basic HTML like <p>, <b>, <a> is allowed." }], defaults: { variant: "default" } },
];

export const sectionDef = (type: string) => SECTIONS.find((s) => s.type === type || (type === "perks" && s.type === "features"));

export interface SectionRow { id: string; type: string; title: string | null; config: Record<string, unknown>; is_active: boolean }
