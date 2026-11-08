/**
 * Theme system. A theme = neutral surfaces + brand palette + fonts + shape + header/footer/card styles
 * + a demo home page. Everything can be mixed and changed from Admin > Appearance.
 */

export type Mode = { background: string; surface: string; surface2: string; glass: string; text: string; text2: string; text3: string; border: string; fill: string };
export interface Neutral { id: string; label: string; light: Mode; dark: Mode }
export interface Palette { id: string; label: string; accent: string; accentDark: string; contrast?: string; contrastDark?: string; sale?: string }

export const NEUTRALS: Neutral[] = [
  { id: "cool", label: "Cool white",
    light: { background: "#f5f5f7", surface: "#ffffff", surface2: "#fbfbfd", glass: "rgba(255,255,255,0.72)", text: "#1d1d1f", text2: "#6e6e73", text3: "#86868b", border: "rgba(0,0,0,0.08)", fill: "rgba(120,120,128,0.12)" },
    dark: { background: "#000000", surface: "#1c1c1e", surface2: "#161617", glass: "rgba(28,28,30,0.72)", text: "#f5f5f7", text2: "#a1a1a6", text3: "#6e6e73", border: "rgba(255,255,255,0.10)", fill: "rgba(120,120,128,0.24)" } },
  { id: "warm", label: "Warm linen",
    light: { background: "#f4f1ec", surface: "#fffdf9", surface2: "#faf7f2", glass: "rgba(255,253,249,0.78)", text: "#2a241e", text2: "#6f655b", text3: "#9a8f84", border: "rgba(60,40,20,0.10)", fill: "rgba(120,100,80,0.12)" },
    dark: { background: "#14110e", surface: "#1f1b17", surface2: "#191612", glass: "rgba(31,27,23,0.75)", text: "#f3ede6", text2: "#b4a99d", text3: "#7d7368", border: "rgba(255,240,220,0.10)", fill: "rgba(160,140,120,0.20)" } },
  { id: "noir", label: "Noir",
    light: { background: "#f2f2f0", surface: "#ffffff", surface2: "#f8f8f6", glass: "rgba(255,255,255,0.8)", text: "#0b0b0b", text2: "#5c5c5c", text3: "#8a8a8a", border: "rgba(0,0,0,0.12)", fill: "rgba(0,0,0,0.06)" },
    dark: { background: "#070707", surface: "#121212", surface2: "#0d0d0d", glass: "rgba(18,18,18,0.78)", text: "#f2f2f2", text2: "#a3a3a3", text3: "#6b6b6b", border: "rgba(255,255,255,0.12)", fill: "rgba(255,255,255,0.08)" } },
  { id: "mint", label: "Fresh mint",
    light: { background: "#f3f8f3", surface: "#ffffff", surface2: "#f8fbf8", glass: "rgba(255,255,255,0.78)", text: "#14261a", text2: "#55685b", text3: "#829487", border: "rgba(20,60,30,0.10)", fill: "rgba(60,120,80,0.10)" },
    dark: { background: "#07120b", surface: "#0f1d14", surface2: "#0b1710", glass: "rgba(15,29,20,0.78)", text: "#e8f3ea", text2: "#9fb5a5", text3: "#6c8273", border: "rgba(200,255,220,0.10)", fill: "rgba(120,200,150,0.14)" } },
  { id: "blush", label: "Soft blush",
    light: { background: "#fbf3f4", surface: "#ffffff", surface2: "#fdf8f8", glass: "rgba(255,255,255,0.78)", text: "#2b1a1f", text2: "#76606a", text3: "#a08c95", border: "rgba(90,30,50,0.09)", fill: "rgba(180,100,130,0.10)" },
    dark: { background: "#120a0d", surface: "#1e1216", surface2: "#180e12", glass: "rgba(30,18,22,0.78)", text: "#f7e9ee", text2: "#bba3ad", text3: "#86707a", border: "rgba(255,210,225,0.10)", fill: "rgba(220,150,180,0.14)" } },
  { id: "midnight", label: "Midnight",
    light: { background: "#f1f3f9", surface: "#ffffff", surface2: "#f7f8fc", glass: "rgba(255,255,255,0.78)", text: "#111527", text2: "#5a6078", text3: "#8a90a6", border: "rgba(20,30,80,0.09)", fill: "rgba(80,90,160,0.10)" },
    dark: { background: "#05060d", surface: "#0e1120", surface2: "#0a0c18", glass: "rgba(14,17,32,0.75)", text: "#eef0fb", text2: "#a2a8c4", text3: "#6b7190", border: "rgba(180,190,255,0.12)", fill: "rgba(140,150,255,0.14)" } },
];

/** Brand color templates. Any palette works with any theme. */
export const PALETTES: Palette[] = [
  { id: "ocean", label: "Ocean blue", accent: "#0071e3", accentDark: "#2997ff" },
  { id: "violet", label: "Violet", accent: "#6d28d9", accentDark: "#a78bfa" },
  { id: "rose", label: "Rose", accent: "#e11d63", accentDark: "#fb7199" },
  { id: "emerald", label: "Emerald", accent: "#059669", accentDark: "#34d399" },
  { id: "amber", label: "Amber", accent: "#d97706", accentDark: "#fbbf24", contrastDark: "#1a1206" },
  { id: "crimson", label: "Crimson", accent: "#c81e1e", accentDark: "#f87171" },
  { id: "teal", label: "Teal", accent: "#0f766e", accentDark: "#2dd4bf", contrastDark: "#04201d" },
  { id: "graphite", label: "Graphite", accent: "#18181b", accentDark: "#fafafa", contrastDark: "#09090b" },
  { id: "gold", label: "Gold luxe", accent: "#9a7b3f", accentDark: "#d6b56d", contrastDark: "#1a1406" },
  { id: "coral", label: "Coral", accent: "#ea580c", accentDark: "#fb923c", contrastDark: "#1f0d03" },
  { id: "indigo", label: "Indigo", accent: "#4338ca", accentDark: "#818cf8" },
  { id: "lime", label: "Lime pop", accent: "#4d7c0f", accentDark: "#a3e635", contrastDark: "#132003" },
];

export const FONTS = [
  { id: "inter", label: "Inter", css: "var(--font-inter)" },
  { id: "manrope", label: "Manrope", css: "var(--font-manrope)" },
  { id: "dmsans", label: "DM Sans", css: "var(--font-dmsans)" },
  { id: "poppins", label: "Poppins", css: "var(--font-poppins)" },
  { id: "grotesk", label: "Space Grotesk", css: "var(--font-grotesk)" },
  { id: "playfair", label: "Playfair Display", css: "var(--font-playfair)" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export const RADII = {
  sharp: { label: "Sharp", card: "6px", sheet: "10px", btn: "6px", input: "6px" },
  soft: { label: "Soft", card: "16px", sheet: "22px", btn: "12px", input: "10px" },
  round: { label: "Round", card: "22px", sheet: "28px", btn: "999px", input: "12px" },
} as const;
export type RadiusId = keyof typeof RADII;

export const HEADERS = [
  { id: "glass", label: "Glass", hint: "Transparent, frosts on scroll" },
  { id: "centered", label: "Centered logo", hint: "Logo in the middle, menu below" },
  { id: "bold", label: "Market", hint: "Top bar, big search, category bar" },
  { id: "minimal", label: "Minimal", hint: "Logo and icons, menu in a drawer" },
] as const;
export const FOOTERS = [
  { id: "columns", label: "Columns", hint: "Logo, links, contact" },
  { id: "dark", label: "Dark", hint: "Inverted with newsletter band" },
  { id: "brand", label: "Brand color", hint: "Accent background, big wordmark" },
  { id: "minimal", label: "Minimal", hint: "One clean row" },
] as const;
export const CARDS = [
  { id: "classic", label: "Classic", hint: "Photo, details, buttons on hover" },
  { id: "minimal", label: "Minimal", hint: "Photo first, quick add icon" },
  { id: "overlay", label: "Overlay", hint: "Text on the photo" },
  { id: "bordered", label: "Boxed", hint: "Framed card, full-width button" },
] as const;
export const BUTTONS = [
  { id: "solid", label: "Solid" }, { id: "gradient", label: "Gradient" }, { id: "outline", label: "Outline" }, { id: "soft", label: "Soft tint" },
  { id: "raised", label: "Raised 3D" }, { id: "glow", label: "Glow" }, { id: "glass", label: "Glass" },
] as const;
export type ButtonId = (typeof BUTTONS)[number]["id"];
export type HeaderId = (typeof HEADERS)[number]["id"];
export type FooterId = (typeof FOOTERS)[number]["id"];
export type CardId = (typeof CARDS)[number]["id"];

export interface Appearance {
  theme: string; neutral: string; palette: string; accent?: string; accentDark?: string;
  fontBody: FontId; fontDisplay: FontId; radius: RadiusId; header: HeaderId; footer: FooterId; card: CardId; button: ButtonId;
  defaultMode: "system" | "light" | "dark";
  /** Brand color sets saved by the store owner. */
  colorSets?: { name: string; accent: string; accentDark: string }[];
}

export interface ThemePreset extends Omit<Appearance, "theme" | "accent" | "accentDark" | "colorSets"> {
  id: string; name: string; tag: string; description: string;
  /** Demo home page loaded when the theme is applied with "load demo". */
  demo: { type: string; title?: string; config: Record<string, unknown> }[];
}

const img = (q: string) => `https://images.unsplash.com/${q}?auto=format&fit=crop&w=1600&q=70`;

export const THEMES: ThemePreset[] = [
  { id: "lumen", button: "solid", name: "Lumen", tag: "All-round", description: "Apple-style glass, calm and premium.", neutral: "cool", palette: "ocean",
    fontBody: "inter", fontDisplay: "inter", radius: "round", header: "glass", footer: "columns", card: "classic", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "centered", title: "Things you'll love. Delivered across Bangladesh.", subtitle: "Handpicked products at fair prices, with cash on delivery in all 64 districts.", cta_label: "Shop now", cta_url: "/shop", source: "featured", limit: 6 } },
      { type: "features", config: { variant: "row" } },
      { type: "categories", title: "Shop by category", config: { variant: "tiles", limit: 8 } },
      { type: "flash_sale", title: "Flash sale", config: { variant: "carousel" } },
      { type: "products", title: "New arrivals", config: { variant: "grid", source: "newest", limit: 8 } },
      { type: "products", title: "Best sellers", config: { variant: "carousel", source: "best_selling", limit: 10 } },
      { type: "newsletter", title: "Get offers first", config: { variant: "card" } },
    ] },
  { id: "noir", button: "outline", name: "Noir", tag: "Fashion", description: "Editorial black and gold for fashion and luxury.", neutral: "noir", palette: "gold",
    fontBody: "inter", fontDisplay: "playfair", radius: "sharp", header: "centered", footer: "dark", card: "minimal", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "slider", height: "full", autoplay: true, slides: [
        { image: img("photo-1490481651871-ab68de25d43d"), title: "The new season", subtitle: "Quiet pieces, made to last.", cta_label: "Shop the edit", cta_url: "/shop", align: "left", tone: "light" },
        { image: img("photo-1483985988355-763728e1935b"), title: "Up to 40% off", subtitle: "Selected styles, this week only.", cta_label: "See deals", cta_url: "/deals", align: "center", tone: "light" } ] } },
      { type: "categories", title: "Collections", config: { variant: "bento", limit: 5 } },
      { type: "products", title: "New in", config: { variant: "grid", source: "newest", limit: 8, card: "minimal" } },
      { type: "banner", config: { variant: "duo", items: [
        { image: img("photo-1445205170230-053b83016050"), title: "Women", cta_label: "Discover", url: "/shop" },
        { image: img("photo-1490114538077-0a7f8cb49891"), title: "Men", cta_label: "Discover", url: "/shop" } ] } },
      { type: "testimonials", title: "Loved by our customers", config: { variant: "quote" } },
      { type: "newsletter", title: "Join the list", config: { variant: "split" } },
    ] },
  { id: "bloom", button: "soft", name: "Bloom", tag: "Beauty", description: "Soft blush tones for beauty and lifestyle.", neutral: "blush", palette: "rose",
    fontBody: "dmsans", fontDisplay: "playfair", radius: "round", header: "centered", footer: "brand", card: "overlay", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "split", title: "Glow, naturally", subtitle: "Clean skincare and makeup picked for Bangladeshi weather.", cta_label: "Shop skincare", cta_url: "/shop", image: img("photo-1596462502278-27bfdc403348") } },
      { type: "categories", title: "Shop by concern", config: { variant: "circles", limit: 8 } },
      { type: "products", title: "Bestsellers", config: { variant: "tabs", source: "best_selling", limit: 8 } },
      { type: "image_text", config: { variant: "left", title: "Made for humid days", text: "Lightweight textures that stay put from morning to night.", image: img("photo-1570172619644-dfd03ed5d881"), cta_label: "Find yours", cta_url: "/shop" } },
      { type: "testimonials", title: "Real reviews", config: { variant: "cards" } },
      { type: "newsletter", title: "10% off your first order", config: { variant: "card" } },
    ] },
  { id: "fresh", button: "raised", name: "Fresh", tag: "Grocery", description: "Bright market look for grocery and daily needs.", neutral: "mint", palette: "emerald",
    fontBody: "poppins", fontDisplay: "poppins", radius: "soft", header: "bold", footer: "columns", card: "bordered", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "bento", slides: [
        { image: img("photo-1542838132-92c53300491e"), title: "Fresh to your door", subtitle: "Same-day delivery in Dhaka", cta_label: "Order now", cta_url: "/shop", tone: "light" },
        { image: img("photo-1610832958506-aa56368176cf"), title: "Fruits", cta_url: "/shop", tone: "light" },
        { image: img("photo-1488459716781-31db52582fe9"), title: "Vegetables", cta_url: "/shop", tone: "light" } ] } },
      { type: "features", config: { variant: "cards" } },
      { type: "categories", title: "Aisles", config: { variant: "carousel", limit: 12 } },
      { type: "flash_sale", title: "Today's deals", config: { variant: "grid" } },
      { type: "products", title: "Popular now", config: { variant: "grid", source: "best_selling", limit: 10, card: "bordered" } },
      { type: "banner", config: { variant: "trio", items: [
        { image: img("photo-1506617420156-8e4536971650"), title: "Organic picks", url: "/shop" },
        { image: img("photo-1509440159596-0249088772ff"), title: "Bakery", url: "/shop" },
        { image: img("photo-1563636619-e9143da7973b"), title: "Dairy", url: "/shop" } ] } },
    ] },
  { id: "volt", button: "glow", name: "Volt", tag: "Electronics", description: "Dark tech look with neon accents for gadgets.", neutral: "midnight", palette: "violet",
    fontBody: "grotesk", fontDisplay: "grotesk", radius: "soft", header: "minimal", footer: "dark", card: "bordered", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "product", source: "featured", limit: 5, autoplay: true, title: "Next-level gear" } },
      { type: "categories", title: "Browse", config: { variant: "tiles", limit: 8 } },
      { type: "countdown", config: { title: "Mega tech week", subtitle: "Prices drop every day until Friday.", cta_label: "Shop deals", cta_url: "/deals" } },
      { type: "products", title: "Trending", config: { variant: "carousel", source: "best_selling", limit: 10 } },
      { type: "brands", title: "Top brands", config: { variant: "row" } },
      { type: "products", title: "Just landed", config: { variant: "spotlight", source: "newest", limit: 5 } },
    ] },
  { id: "nordic", button: "solid", name: "Nordic", tag: "Home", description: "Warm minimal for furniture and decor.", neutral: "warm", palette: "graphite",
    fontBody: "manrope", fontDisplay: "manrope", radius: "soft", header: "glass", footer: "minimal", card: "minimal", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "floating", title: "Calm homes start here", subtitle: "Lighting, textiles and decor with a quiet touch.", cta_label: "Explore", cta_url: "/shop", source: "featured", limit: 6 } },
      { type: "categories", title: "Rooms", config: { variant: "bento", limit: 5 } },
      { type: "products", title: "Living room", config: { variant: "grid", source: "newest", limit: 8 } },
      { type: "image_text", config: { variant: "right", title: "Light that feels like evening", text: "Warm, dimmable lights for every corner.", image: img("photo-1513694203232-719a280e022f"), cta_label: "Shop lighting", cta_url: "/shop" } },
      { type: "gallery", title: "In real homes", config: { variant: "grid" } },
    ] },
  { id: "street", button: "raised", name: "Street", tag: "Streetwear", description: "Loud, high-contrast drops for youth brands.", neutral: "noir", palette: "coral",
    fontBody: "grotesk", fontDisplay: "grotesk", radius: "sharp", header: "bold", footer: "brand", card: "overlay", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "video", title: "DROP 07", subtitle: "Limited run. When it's gone, it's gone.", cta_label: "Cop now", cta_url: "/shop", video_url: "" } },
      { type: "banner", config: { variant: "strip", items: [{ title: "Free delivery inside Dhaka over ৳3,000", url: "/shop" }] } },
      { type: "products", title: "The drop", config: { variant: "grid", source: "newest", limit: 8, card: "overlay" } },
      { type: "hero", config: { variant: "coverflow", slides: [
        { image: img("photo-1523398002811-999ca8dec234"), title: "Hoodies", cta_url: "/shop", tone: "light" },
        { image: img("photo-1556905055-8f358a7a47b2"), title: "Tees", cta_url: "/shop", tone: "light" },
        { image: img("photo-1542291026-7eec264c27ff"), title: "Sneakers", cta_url: "/shop", tone: "light" } ] } },
      { type: "newsletter", title: "Get drop alerts", config: { variant: "minimal" } },
    ] },
  { id: "playful", button: "raised", name: "Playful", tag: "Kids & toys", description: "Round, cheerful and colorful for kids' stores.", neutral: "cool", palette: "amber",
    fontBody: "poppins", fontDisplay: "poppins", radius: "round", header: "glass", footer: "brand", card: "bordered", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "floating", title: "Toys that spark big smiles", subtitle: "Safe, fun and delivered fast.", cta_label: "Shop toys", cta_url: "/shop", source: "featured", limit: 6 } },
      { type: "categories", title: "Shop by age", config: { variant: "circles", limit: 8 } },
      { type: "products", title: "Kids love these", config: { variant: "carousel", source: "best_selling", limit: 10 } },
      { type: "features", config: { variant: "cards" } },
      { type: "newsletter", title: "Parents' club", config: { variant: "card" } },
    ] },
];

THEMES.push(
  { id: "aurora", button: "gradient", name: "Aurora", tag: "3D gradient", description: "Glowing gradients, 3D product ring and glass cards.", neutral: "midnight", palette: "violet",
    fontBody: "grotesk", fontDisplay: "grotesk", radius: "round", header: "glass", footer: "dark", card: "overlay", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "ring3d", title: "Shop the future", subtitle: "Drag the ring or tap any product.", cta_label: "Explore", cta_url: "/shop", source: "featured", limit: 8, width: "full" } },
      { type: "features", config: { variant: "row" } },
      { type: "products", title: "Trending now", config: { variant: "carousel", source: "best_selling", limit: 10 } },
      { type: "hero", config: { variant: "mesh", title: "Limited drop", subtitle: "Only while stock lasts.", cta_label: "Get it", cta_url: "/deals", source: "on_sale", limit: 1 } },
      { type: "categories", title: "Categories", config: { variant: "bento", limit: 5 } },
      { type: "newsletter", title: "Be first to know", config: { variant: "card" } },
    ] },
  { id: "luxe", button: "raised", name: "Luxe", tag: "Premium 3D", description: "Premium look with a 3D tilting product hero and a card stack.", neutral: "warm", palette: "gold",
    fontBody: "manrope", fontDisplay: "playfair", radius: "soft", header: "centered", footer: "columns", card: "minimal", defaultMode: "light",
    demo: [
      { type: "hero", config: { variant: "tilt3d", title: "Crafted to be noticed", subtitle: "Premium picks, delivered with care across Bangladesh.", cta_label: "Shop the collection", cta_url: "/shop", source: "featured", limit: 1 } },
      { type: "categories", title: "Collections", config: { variant: "circles", limit: 8 } },
      { type: "hero", config: { variant: "stack3d", title: "New this week", subtitle: "Fresh arrivals, hand-checked.", cta_label: "See what's new", cta_url: "/shop", source: "newest", limit: 5 } },
      { type: "products", title: "Best sellers", config: { variant: "grid", source: "best_selling", limit: 8 } },
      { type: "testimonials", title: "What customers say", config: { variant: "quote" } },
      { type: "newsletter", title: "Private offers", config: { variant: "split" } },
    ] },
);

export const DEFAULT_APPEARANCE: Appearance = { theme: "lumen", neutral: "cool", palette: "ocean", fontBody: "inter", fontDisplay: "inter", radius: "round", header: "glass", footer: "columns", card: "classic", button: "solid", defaultMode: "light" };

/** Merges saved settings with the chosen theme's defaults. */
export function resolveAppearance(saved: Partial<Appearance> | null | undefined): Appearance {
  const t = THEMES.find((x) => x.id === saved?.theme) ?? THEMES[0]!;
  const base: Appearance = { theme: t.id, neutral: t.neutral, palette: t.palette, fontBody: t.fontBody, fontDisplay: t.fontDisplay, radius: t.radius, header: t.header, footer: t.footer, card: t.card, button: t.button, defaultMode: t.defaultMode };
  const out = { ...base, ...Object.fromEntries(Object.entries(saved ?? {}).filter(([, v]) => v !== "" && v != null)) } as Appearance;
  out.theme = t.id;
  if (!NEUTRALS.some((n) => n.id === out.neutral)) out.neutral = base.neutral;
  if (!FONTS.some((f) => f.id === out.fontBody)) out.fontBody = base.fontBody;
  if (!FONTS.some((f) => f.id === out.fontDisplay)) out.fontDisplay = base.fontDisplay;
  if (!HEADERS.some((h) => h.id === out.header)) out.header = base.header;
  if (!FOOTERS.some((f) => f.id === out.footer)) out.footer = base.footer;
  if (!CARDS.some((c) => c.id === out.card)) out.card = base.card;
  if (!BUTTONS.some((b) => b.id === out.button)) out.button = base.button;
  if (!Array.isArray(out.colorSets)) out.colorSets = [];
  if (!PALETTES.some((p) => p.id === out.palette) && !out.accent) out.palette = base.palette;
  if (!(out.radius in RADII)) out.radius = base.radius;
  return out;
}
