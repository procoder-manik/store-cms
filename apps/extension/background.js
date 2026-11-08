// Sends the captured product to the store from the extension's own context (no page CORS limits).
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== "lumen:send") return;
  (async () => {
    const { storeUrl, token } = await chrome.storage.sync.get(["storeUrl", "token"]);
    if (!storeUrl || !token) return reply({ ok: false, error: "Open the extension settings and add your store URL and import key." });
    try {
      const res = await fetch(`${storeUrl.replace(/\/$/, "")}/api/import/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product: msg.product }),
      });
      const data = await res.json().catch(() => ({}));
      reply(res.ok ? { ok: true, ...data } : { ok: false, error: data.error || `Store replied ${res.status}` });
    } catch (e) {
      reply({ ok: false, error: "Could not reach your store. Check the store URL." });
    }
  })();
  return true;
});
