const $ = (id) => document.getElementById(id);
chrome.storage.sync.get(["storeUrl", "token"], (v) => { $("storeUrl").value = v.storeUrl || ""; $("token").value = v.token || ""; });
$("save").onclick = () => {
  const storeUrl = $("storeUrl").value.trim().replace(/\/$/, "");
  const token = $("token").value.trim();
  if (!/^https?:\/\//.test(storeUrl)) { $("status").textContent = "Enter the full store URL starting with https://"; return; }
  chrome.storage.sync.set({ storeUrl, token }, () => { $("status").textContent = "Saved."; });
};
