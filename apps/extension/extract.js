/*
 * Reads the product on the current page. Order of trust:
 *   1. JSON-LD Product data (title, price, currency, images)
 *   2. The page's embedded state JSON (variants, sizes, colors, video, gallery)
 *   3. DOM and meta tags as fallback
 * Marketplaces change their pages often; every step is defensive and the parser
 * lives in this one file so it is easy to update.
 */
(() => {
  if (window.__lumenExtractor) return;
  window.__lumenExtractor = true;

  const host = location.hostname;
  const source = host.includes("temu") ? "temu" : host.includes("alibaba") ? "alibaba" : host.includes("aliexpress") ? "aliexpress" : "other";
  const site = host.replace(/^www\./, "");

  const abs = (u) => {
    if (!u || typeof u !== "string") return null;
    let url = u.trim();
    if (url.startsWith("//")) url = "https:" + url;
    if (!/^https?:\/\//.test(url)) return null;
    // Strip resize suffixes so we get the original image
    return url.replace(/(\.(jpe?g|png|webp))_[^/?]*$/i, "$1").replace(/\?imageView2.*$/, "").split("#")[0];
  };
  const num = (v) => {
    if (typeof v === "number") return v;
    if (typeof v !== "string") return NaN;
    const m = v.replace(/,/g, "").match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const uniq = (a) => [...new Set(a.filter(Boolean))];

  function jsonLd() {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(s.textContent);
        const list = Array.isArray(data) ? data : data["@graph"] || [data];
        const p = list.find((x) => x && (x["@type"] === "Product" || (Array.isArray(x["@type"]) && x["@type"].includes("Product"))));
        if (p) return p;
      } catch (_) {}
    }
    return null;
  }

  /** Parses every inline script that looks like page state and returns the parsed objects. */
  function pageStates() {
    const out = [];
    const patterns = [
      /window\.rawData\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|<\/script>|$)/,
      /window\.runParams\s*=\s*(\{[\s\S]*?\});\s*(?:var|window\.|$)/,
      /window\.detailData\s*=\s*(\{[\s\S]*?\});\s*(?:window\.|$)/,
      /window\.__INIT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|$)/,
    ];
    for (const s of document.querySelectorAll("script:not([src])")) {
      const t = s.textContent || "";
      if (t.length < 200) continue;
      if (s.type === "application/json" || s.id === "__NEXT_DATA__") { try { out.push(JSON.parse(t)); } catch (_) {} continue; }
      for (const re of patterns) {
        const m = t.match(re);
        if (m) { try { out.push(JSON.parse(m[1])); } catch (_) {} }
      }
    }
    return out;
  }

  /** Depth-first search for objects that satisfy a test. */
  function findAll(root, test, limit = 50) {
    const found = [];
    const seen = new WeakSet();
    const stack = [root];
    while (stack.length && found.length < limit) {
      const n = stack.pop();
      if (!n || typeof n !== "object" || seen.has(n)) continue;
      seen.add(n);
      if (test(n)) found.push(n);
      for (const k in n) if (n[k] && typeof n[k] === "object") stack.push(n[k]);
    }
    return found;
  }
  const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k]; return undefined; };


  /** Largest visible, non struck-through price text on the page (handles "CA$" and digits split across spans). */
  function domPrice() {
    const re = /^(?:CA\$|C\$|US\$|\$|৳|£|€)\s?(\d{1,6}(?:[.,]\d{1,2})?)$/;
    let best = null;
    for (const el of document.querySelectorAll("span,div,p,b,strong,h1,h2")) {
      if (el.children.length > 6) continue;
      const t = (el.textContent || "").replace(/\s+/g, "").trim();
      if (!t || t.length > 14) continue;
      const m = t.match(re);
      if (!m) continue;
      const cs = getComputedStyle(el);
      if (String(cs.textDecorationLine || cs.textDecoration).includes("line-through")) continue;
      if (el.closest("s,del,strike")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const size = parseFloat(cs.fontSize) || 0;
      if (!best || size > best.size) best = { value: parseFloat(m[1].replace(",", ".")), size };
    }
    return best ? best.value : NaN;
  }

  /** Price strings inside inline scripts, e.g. "salePriceStr":"CA$11.49". */
  function scriptPrices() {
    const txt = [...document.querySelectorAll("script:not([src])")].map((s) => s.textContent || "").join("\n");
    const out = [];
    for (const m of txt.matchAll(/"(?:salePriceStr|minOnSalePriceStr|priceStr|retailPriceStr|actPriceStr|goodsPriceStr)"\s*:\s*"([^"]{1,24})"/g)) out.push(m[1]);
    return out;
  }

  /** Compact description of the page's data, for troubleshooting. Contains no personal data. */
  function debugInfo(states) {
    const arrays = [];
    for (const st of states) {
      for (const a of findAll(st, (o) => Array.isArray(o) && o.length > 1 && o.length < 400 && o.every((x) => x && typeof x === "object" && !Array.isArray(x)), 14)) {
        arrays.push({ length: a.length, keys: Object.keys(a[0]).slice(0, 18) });
      }
    }
    const labels = [...document.querySelectorAll("div,span,p,label")]
      .filter((e) => e.children.length < 4 && /^(Style|Color|Colour|Size|Length|Model|Specification|Option)s?\s*:/i.test((e.textContent || "").trim()))
      .slice(0, 8).map((e) => (e.textContent || "").trim().slice(0, 80));
    return {
      url: location.href.split("?")[0], scripts: document.querySelectorAll("script:not([src])").length, stateObjects: states.length,
      topKeys: states.map((s) => Object.keys(s).slice(0, 20)), arraysOfObjects: arrays.slice(0, 16),
      priceFromScripts: scriptPrices().slice(0, 6), priceFromPage: domPrice(), optionLabels: labels,
    };
  }

  function extract() {
    const ld = jsonLd();
    const states = pageStates();
    const offers = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
    const meta = (p) => document.querySelector(`meta[property="${p}"],meta[name="${p}"]`)?.content;

    let title = (ld && ld.name) || meta("og:title") || document.title;
    let currency = (offers && offers.priceCurrency) || meta("product:price:currency") || "";
    let price = num(offers && (offers.price ?? offers.lowPrice)) || num(meta("product:price:amount"));
    let compareAtPrice;

    let images = [];
    if (ld && ld.image) images = (Array.isArray(ld.image) ? ld.image : [ld.image]).map((i) => (typeof i === "string" ? i : i.url));

    // Gallery and video from page state
    const videos = [];
    const variants = [];
    const optionMap = new Map();
    const specs = [];

    for (const st of states) {
      // Gallery: arrays of objects with url fields, or arrays of image url strings
      for (const g of findAll(st, (o) => Array.isArray(o) && o.length > 1 && o.every((x) => typeof x === "string" ? /\.(jpe?g|png|webp)/i.test(x) : x && typeof x === "object" && /\.(jpe?g|png|webp)/i.test(pick(x, ["url", "imgUrl", "imageUrl", "src", "fullPathImageURI"]) || "")), 6)) {
        images.push(...g.map((x) => (typeof x === "string" ? x : pick(x, ["url", "imgUrl", "imageUrl", "src", "fullPathImageURI"]))));
      }
      // Video
      for (const v of findAll(st, (o) => typeof pick(o, ["videoUrl", "video_url", "videoURL", "url"]) === "string" && /\.(mp4|m3u8)(\?|$)/i.test(pick(o, ["videoUrl", "video_url", "videoURL", "url"])), 3)) {
        const u = pick(v, ["videoUrl", "video_url", "videoURL", "url"]);
        if (/\.mp4/i.test(u)) videos.push({ url: abs(u), poster: abs(pick(v, ["coverUrl", "cover", "poster", "coverImage"])) || undefined });
      }
      // Variants (SKUs): objects with a price and a list of spec/property pairs
      const skuLists = findAll(st, (o) => Array.isArray(o) && o.length > 0 && o.length < 500 && o.every((x) => x && typeof x === "object" && (x.specs || x.skuAttr || x.skuPropIds || x.saleProps || x.skuVal || x.properties)), 3);
      const list = skuLists.sort((a, b) => b.length - a.length)[0] || [];
      for (const sku of list) {
        const options = {};
        const specsArr = sku.specs || sku.saleProps || sku.properties || [];
        if (Array.isArray(specsArr)) {
          for (const s of specsArr) {
            const name = pick(s, ["specKey", "parentSpecName", "propName", "name", "attrName"]);
            const value = pick(s, ["specValue", "specName", "valueName", "value", "attrValue"]);
            if (name && value && typeof value === "string") options[String(name)] = value;
          }
        }
        const p = sku.skuVal || sku;
        let vp = num(pick(p, ["salePriceStr", "priceStr", "actSkuCalPrice", "skuCalPrice", "normalPriceStr", "skuAmountLocal"]));
        if (isNaN(vp)) {
          const raw = pick(p, ["salePrice", "price", "normalPrice", "skuAmount"]);
          vp = typeof raw === "object" ? num(pick(raw, ["value", "amount", "formatedAmount"])) : num(raw);
          if (source === "temu" && vp > 0 && Number.isInteger(vp) && price && vp > price * 20) vp = vp / 100;
        }
        const cmp = num(pick(p, ["marketPriceStr", "linePriceStr", "skuAmountLocal", "originalPrice", "normalPriceStr"]));
        const stock = num(pick(p, ["stock", "stockQuantity", "availQuantity", "inventory", "skuStock"]));
        const img = abs(pick(sku, ["thumbUrl", "skuImage", "image", "imgUrl", "skuPropImage"]));
        if (!Object.keys(options).length || !(vp > 0)) continue;
        Object.entries(options).forEach(([n, v], idx) => {
          if (!optionMap.has(n)) optionMap.set(n, new Map());
          // SKU photos belong to the first option (usually color or style)
          if (!optionMap.get(n).has(v)) optionMap.get(n).set(v, idx === 0 ? img || undefined : undefined);
        });
        variants.push({ options, price: vp, compareAtPrice: cmp > vp ? cmp : undefined, stock: isNaN(stock) ? 50 : stock, image: img || undefined });
      }
      // Specifications
      for (const arr of findAll(st, (o) => Array.isArray(o) && o.length > 1 && o.length < 80 && o.every((x) => x && typeof x === "object" && pick(x, ["key", "attrName", "name", "propertyName"]) && pick(x, ["value", "values", "attrValue", "propertyValue"])), 2)) {
        for (const x of arr) {
          const v = pick(x, ["value", "values", "attrValue", "propertyValue"]);
          specs.push({ label: String(pick(x, ["key", "attrName", "name", "propertyName"])).slice(0, 80), value: (Array.isArray(v) ? v.join(", ") : String(v)).slice(0, 300) });
        }
      }
      if (!title || title.length < 5) title = pick(findAll(st, (o) => typeof o.goodsName === "string" || typeof o.subject === "string", 1)[0] || {}, ["goodsName", "subject"]) || title;
    }

    // Microdata (itemprop) used by many small stores
    if (!title || title === document.title) title = document.querySelector('[itemprop="name"]')?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim() || title;
    if (!(price > 0)) price = num(document.querySelector('[itemprop="price"]')?.getAttribute("content") || document.querySelector('[itemprop="price"]')?.textContent || "");
    if (!currency) currency = document.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content") || "";
    if (!images.length && meta("og:image")) images.push(meta("og:image"));
    // DOM fallbacks
    if (images.length < 2) {
      images.push(...[...document.querySelectorAll("img")].filter((i) => (i.naturalWidth || i.width) >= 300).map((i) => i.currentSrc || i.src));
    }
    if (!videos.length) {
      const v = document.querySelector("video[src], video source[src]");
      const src = v && (v.src || v.getAttribute("src"));
      if (src && /^https?:/.test(src) && !src.startsWith("blob:")) videos.push({ url: src, poster: document.querySelector("video")?.poster || undefined });
    }
    if (!(price > 0)) { const sp = scriptPrices().map((t) => num(t)).filter((n) => n > 0); if (sp.length) price = sp[0]; }
    if (!(price > 0)) price = domPrice();
    if (!(price > 0)) price = num(document.querySelector('[class*="price" i]')?.textContent || "");
    if (!currency) {
      const t = (document.body.innerText || document.body.textContent || "").slice(0, 20000);
      currency = /\/ca\//.test(location.pathname) || host.endsWith(".ca") ? "CAD" : host.endsWith(".bd") || /৳|Tk\.?\s?\d/.test(t) ? "BDT" : host.endsWith(".in") || /₹/.test(t) ? "INR" : /£/.test(t) ? "GBP" : /€/.test(t) ? "EUR" : "USD";
    }
    if (variants.length && !(price > 0)) price = Math.min(...variants.map((v) => v.price));
    if (variants.length) compareAtPrice = variants.find((v) => v.compareAtPrice)?.compareAtPrice;

    // Description: keep text paragraphs and description images
    const descImgs = uniq(states.flatMap((st) => findAll(st, (o) => Array.isArray(o.descImgs || o.detailImages || o.goodsDetailImages), 2)
      .flatMap((o) => o.descImgs || o.detailImages || o.goodsDetailImages))).map((x) => abs(typeof x === "string" ? x : x.url)).filter(Boolean).slice(0, 20);
    const descText = (ld && ld.description) || meta("og:description") || "";
    const descriptionHtml = (descText ? `<p>${descText.replace(/[<>]/g, "")}</p>` : "") + descImgs.map((u) => `<p><img src="${u}" alt=""></p>`).join("");

    const sourceId = (location.pathname.match(/(\d{8,})/) || [])[1] || "";
    return {
      source, site, sourceUrl: location.href.split("?")[0], sourceId,
      title: cleanTitle(title),
      descriptionHtml, price: Math.round(price * 100) / 100, compareAtPrice, currency: String(currency).toUpperCase(),
      images: uniq(images.map(abs)).filter((u) => !/(icon|logo|avatar|sprite|placeholder)/i.test(u)).slice(0, 40),
      videos: videos.filter((v) => v.url).slice(0, 2),
      options: [...optionMap.entries()].slice(0, 3).map(([name, vals]) => ({ name, values: [...vals.entries()].map(([value, image]) => ({ value, image })) })),
      variants: variants.slice(0, 400),
      specs: specs.filter((s) => s.label && s.value).slice(0, 60),
      debug: debugInfo(states),
    };
  }

  /** Removes store names and marketplace boilerplate from page titles. */
  function cleanTitle(t) {
    const brand = (document.querySelector('meta[property="og:site_name"]')?.content || "").trim();
    let out = String(t || "");
    if (brand) out = out.replace(new RegExp(`\\s*[-|\\u2013\\u2014:]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "");
    return out
      .replace(/\s*[-|:]\s*(Buy\s+)?.*?\s+on\s+(Alibaba|AliExpress|Amazon|Daraz)[\w.]*$/i, "")
      .replace(/\s*[|–-]\s*(Temu|Alibaba(\.com)?|AliExpress|Amazon(\.\w+)?|Daraz(\.\w+)?|eBay|Etsy|Walmart|Shein|Banggood|DHgate)\b.*$/i, "")
      .replace(/^Amazon\.\w+\s*:\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 300);
  }
  const money = (cents, minor = 2) => Math.round(Number(cents)) / 10 ** minor;
  const shopName = () => document.querySelector('meta[property="og:site_name"]')?.content || site;

  /** Shopify stores: the product JSON endpoint has every variant, option, image and video. */
  async function shopify() {
    const isShopify = !!document.querySelector('link[href*="cdn.shopify.com"],script[src*="cdn.shopify.com"],meta[name="shopify-digital-wallet"]');
    const m = location.pathname.match(/\/products\/([^/?#]+)/);
    if (!isShopify || !m) return null;
    const res = await fetch(`${location.origin}/products/${m[1]}.js`, { credentials: "omit" });
    if (!res.ok) return null;
    const p = await res.json();
    const currency = document.querySelector('meta[property="og:price:currency"],meta[property="product:price:currency"]')?.content || "USD";
    const options = (p.options || []).map((o) => ({ name: o.name, values: (o.values || []).map((v) => ({ value: String(v) })) })).filter((o) => !(o.values.length === 1 && /default/i.test(o.values[0].value)));
    const variants = options.length ? (p.variants || []).map((v) => {
      const opts = {};
      options.forEach((o, i) => { if (v[`option${i + 1}`]) opts[o.name] = v[`option${i + 1}`]; });
      return { options: opts, price: money(v.price), compareAtPrice: v.compare_at_price ? money(v.compare_at_price) : undefined, stock: v.available ? 50 : 0, image: abs(v.featured_image?.src) || undefined, sku: v.sku || undefined };
    }) : [];
    const videos = (p.media || []).filter((x) => x.media_type === "video").map((x) => ({ url: (x.sources || []).filter((s) => s.mime_type === "video/mp4").sort((a, b) => (b.height || 0) - (a.height || 0))[0]?.url, poster: abs(x.preview_image?.src) })).filter((v) => v.url);
    return {
      source: "other", site: shopName(), sourceUrl: location.href.split("?")[0], sourceId: String(p.id || ""), title: cleanTitle(p.title), descriptionHtml: p.description || "",
      price: money(p.price), compareAtPrice: p.compare_at_price ? money(p.compare_at_price) : undefined, currency: currency.toUpperCase(),
      images: uniq((p.images || []).map(abs)).slice(0, 40), videos: videos.slice(0, 2), options: options.slice(0, 3), variants: variants.slice(0, 400),
      specs: [p.vendor && { label: "Brand", value: p.vendor }, p.type && { label: "Type", value: p.type }].filter(Boolean),
    };
  }

  /** WooCommerce stores: the public Store API returns prices, images, attributes and variations. */
  async function woocommerce() {
    const isWoo = document.body.classList.contains("woocommerce") || document.body.classList.contains("single-product") || !!document.querySelector('meta[name="generator"][content*="WooCommerce"]');
    if (!isWoo) return null;
    const slug = location.pathname.split("/").filter(Boolean).pop();
    const res = await fetch(`${location.origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`, { credentials: "omit" });
    if (!res.ok) return null;
    const p = (await res.json())[0];
    if (!p) return null;
    const minor = p.prices?.currency_minor_unit ?? 2;
    const options = (p.attributes || []).filter((a) => a.has_variations).map((a) => ({ name: a.name, values: (a.terms || []).map((t) => ({ value: t.name })) }));
    const variants = [];
    for (const v of (p.variations || []).slice(0, 30)) {
      try {
        const vr = await (await fetch(`${location.origin}/wp-json/wc/store/v1/products/${v.id}`, { credentials: "omit" })).json();
        const opts = {};
        (v.attributes || []).forEach((a) => { const o = options.find((x) => x.name.toLowerCase() === String(a.name).toLowerCase()); if (o) opts[o.name] = o.values.find((t) => t.value.toLowerCase() === String(a.value).toLowerCase())?.value || a.value; });
        variants.push({ options: opts, price: money(vr.prices.price, minor), compareAtPrice: vr.prices.regular_price !== vr.prices.price ? money(vr.prices.regular_price, minor) : undefined, stock: vr.is_in_stock ? 50 : 0, image: abs(vr.images?.[0]?.src) || undefined, sku: vr.sku || undefined });
      } catch (_) { /* skip variation */ }
    }
    return {
      source: "other", site: shopName(), sourceUrl: location.href.split("?")[0], sourceId: String(p.id), title: cleanTitle(p.name), descriptionHtml: p.description || p.short_description || "",
      price: money(p.prices.price, minor), compareAtPrice: p.prices.regular_price !== p.prices.price ? money(p.prices.regular_price, minor) : undefined, currency: p.prices.currency_code,
      images: uniq((p.images || []).map((i) => abs(i.src))).slice(0, 40), videos: [], options: options.slice(0, 3), variants,
      specs: (p.attributes || []).filter((a) => !a.has_variations).map((a) => ({ label: a.name, value: (a.terms || []).map((t) => t.name).join(", ") })).filter((x) => x.value),
    };
  }

  /** Amazon: title, price, high resolution gallery, feature bullets and technical details. */
  function amazon() {
    if (!/amazon\./.test(host) || !document.getElementById("productTitle")) return null;
    const txt = [...document.querySelectorAll("script:not([src])")].map((x) => x.textContent || "").join("\n");
    const imgs = [...txt.matchAll(/"hiRes":"(https:[^"]+)"/g)].map((m) => m[1]);
    const large = [...txt.matchAll(/"large":"(https:[^"]+)"/g)].map((m) => m[1]);
    const priceEl = document.querySelector("#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, .a-price .a-offscreen");
    const wasEl = document.querySelector("#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen, .basisPrice .a-offscreen");
    const priceText = priceEl?.textContent || "";
    const currency = /₹/.test(priceText) ? "INR" : /£/.test(priceText) ? "GBP" : /€/.test(priceText) ? "EUR" : /CDN|C\$/.test(priceText) ? "CAD" : /AED/.test(priceText) ? "AED" : "USD";
    const bullets = [...document.querySelectorAll("#feature-bullets li span.a-list-item")].map((li) => li.textContent.trim()).filter(Boolean).slice(0, 10);
    const specs = [...document.querySelectorAll("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #prodDetails tr")].map((tr) => ({ label: tr.querySelector("th")?.textContent.trim(), value: tr.querySelector("td")?.textContent.trim().replace(/\s+/g, " ") })).filter((x) => x.label && x.value).slice(0, 40);
    const videos = [...txt.matchAll(/"url":"(https:[^"]+\.mp4)"/g)].map((m) => ({ url: m[1] })).slice(0, 1);
    return {
      source: "other", site, sourceUrl: location.href.split("?")[0], sourceId: (location.pathname.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || "",
      title: cleanTitle(document.getElementById("productTitle").textContent), descriptionHtml: bullets.length ? `<ul>${bullets.map((b) => `<li>${b.replace(/[<>]/g, "")}</li>`).join("")}</ul>` : "",
      price: num(priceText), compareAtPrice: num(wasEl?.textContent || "") || undefined, currency,
      images: uniq((imgs.length ? imgs : large).map(abs)).slice(0, 40), videos, options: [], variants: [], specs,
    };
  }

  async function read() {
    for (const adapter of [shopify, woocommerce, amazon]) {
      try { const r = await adapter(); if (r && r.title && r.images.length) return { ...r, debug: { adapter: adapter.name, url: location.href.split("?")[0] } }; } catch (_) { /* fall through */ }
    }
    const p = extract();
    return { ...p, site: source === "other" ? shopName() : site };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === "lumen:extract") {
      read().then((product) => reply({ ok: true, product }), (e) => reply({ ok: false, error: String((e && e.message) || e) }));
      return true;
    }
    return false;
  });
})();
