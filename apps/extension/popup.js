const $ = (id) => document.getElementById(id);
let product = null;
let debugText = '';

$("opts").onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

async function read() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) {
    $("content").textContent = "Open a product page on any online store, then click this button.";
    return;
  }
  // Make sure the extractor is present (e.g. pages opened before the extension was installed)
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["extract.js"] }); } catch (_) {}
  chrome.tabs.sendMessage(tab.id, { type: "lumen:extract" }, (res) => {
    if (chrome.runtime.lastError || !res) { $("content").textContent = "Could not read the page. Reload it and try again."; return; }
    if (!res.ok) { $("content").textContent = "Could not read this product: " + res.error; return; }
    product = res.product;
    debugText = JSON.stringify(product.debug || {}, null, 1);
    const p = product;
    $("content").className = "card";
    $("content").innerHTML = `
      <div class="row">
        ${p.images[0] ? `<img class="thumb" src="${esc(p.images[0])}" referrerpolicy="no-referrer">` : `<div class="thumb"></div>`}
        <div><div class="title">${esc(p.title)}</div><div class="muted">${esc(p.currency)} ${esc(p.price)} · ${esc(p.site || p.source)}</div></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${p.images.length}</b><span class="muted">images</span></div>
        <div class="stat"><b>${p.videos.length}</b><span class="muted">video</span></div>
        <div class="stat"><b>${p.options.length}</b><span class="muted">options</span></div>
        <div class="stat"><b>${p.variants.length}</b><span class="muted">variants</span></div>
      </div>`;
    const needPrice = !(p.price > 0);
    $("priceRow").style.display = needPrice ? "block" : "none";
    if (needPrice) $("msg").innerHTML = '<span class="err">Price not found automatically. Type the price you see on the page (in ' + esc(p.currency) + ') below.</span>';
    const ok = () => p.title && p.images.length && (p.price > 0 || Number($("manualPrice").value) > 0);
    $("send").disabled = !ok();
    $("manualPrice").oninput = () => { $("send").disabled = !ok(); };
    if (!p.title || !p.images.length) $("msg").innerHTML = '<span class="err">Missing title or images. Scroll the page once so it loads, then reopen this.</span>';
  });
}

$("send").onclick = () => {
  if (!product) return;
  $("send").disabled = true;
  $("msg").textContent = "Sending…";
  const manual = Number($("manualPrice").value);
  const toSend = { ...product };
  delete toSend.debug;
  if (!(toSend.price > 0) && manual > 0) toSend.price = manual;
  chrome.runtime.sendMessage({ type: "lumen:send", product: toSend }, (res) => {
    if (res?.ok) {
      $("msg").innerHTML = `<span class="ok">Sent.</span> <a href="${esc(res.reviewUrl)}" target="_blank">Review and import</a>`;
    } else {
      $("send").disabled = false;
      $("msg").innerHTML = `<span class="err">${esc(res?.error || "Failed")}</span>`;
    }
  });
};

read();

$("copyDebug").onclick = async (e) => {
  e.preventDefault();
  try { await navigator.clipboard.writeText(debugText || "{}"); $("msg").innerHTML = '<span class="ok">Debug info copied. Paste it in the chat.</span>'; }
  catch (_) { $("msg").textContent = "Could not copy."; }
};
