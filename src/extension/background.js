// The toolbar icon opens the mini version as a floating panel in the current tab (panel.js): rounded corners and a
// shadow outside, which an action popup can't have (its frame is the browser's). Where extensions can't run
// (edge:// and chrome:// pages, the stores…), the classic popup instead. See specs/mini.md.
chrome.action.onClicked.addListener(async tab => {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['panel.js'] });
  } catch (e) {
    // shown by the popup (and kept for diagnosis): why this page can't have the panel
    await chrome.storage.local.set({ panelError: { at: Date.now(), message: e?.message ?? String(e), url: tab.url ?? '' } });
    await chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });   // the next clicks on this page too
    try { await chrome.action.openPopup(); }
    catch { chrome.windows.create({ url: 'popup.html', type: 'popup', width: 436, height: 600 }); }
  }
});

// a page left for another one gets the panel again
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') chrome.action.setPopup({ tabId, popup: '' }).catch(() => {});
});
