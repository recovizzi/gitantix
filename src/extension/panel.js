// The mini version as a floating panel in the current tab (injected by background.js on a click on the icon; a
// second click closes it). It frames popup.html?embed (the same mini page, with the extension's APIs) in a rounded
// card with an outer shadow, resizable by its bottom corners (size kept in chrome.storage.local.miniSize, shared with
// the classic popup). See specs/mini.md.
(() => {
  const old = document.querySelector('gitantix-panel');
  if (old) { old.remove(); return; }

  const MIN = { w: 340, h: 360 }, GAP = 12;
  // the page's viewport without its scrollbars
  const vw = () => document.documentElement.clientWidth || innerWidth, vh = () => innerHeight;
  const host = document.createElement('gitantix-panel');
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    .card { position: absolute; inset: 0; border-radius: 12px; overflow: hidden; background: Canvas;
      box-shadow: 0 0 0 1px rgb(128 128 128 / .3), 0 2px 6px rgb(0 0 0 / .12), 0 12px 36px rgb(0 0 0 / .24); }
    iframe { display: block; width: 100%; height: 100%; border: 0; }
    .grip { position: absolute; bottom: 0; width: 16px; height: 16px; cursor: nesw-resize; left: 0; z-index: 1; }
    .grip::after { content: ""; position: absolute; inset: 2px; opacity: .5;
      background: linear-gradient(45deg, transparent 0 45%, #8c959f 45% 52%, transparent 52% 65%, #8c959f 65% 72%, transparent 72%); }
    .grip:hover::after { opacity: 1; }
    .grip-r { left: auto; right: 0; cursor: nwse-resize; }
    .grip-r::after { transform: scaleX(-1); }
    .busy iframe { pointer-events: none; }
  </style>
  <div class="card"><iframe allow="clipboard-write" title="Gitantix"></iframe></div>
  <div class="grip" data-dir="-1" title="Drag to resize"></div><div class="grip grip-r" data-dir="1" title="Drag to resize"></div>`;
  const card = shadow.querySelector('.card'), frame = shadow.querySelector('iframe');

  // fixed, above everything; inline !important so the page's own styles can't move it
  let box = { w: 420, h: 560, x: vw() - 420 - GAP, y: GAP };
  const place = () => {
    box.w = Math.max(MIN.w, Math.min(box.w, vw() - 2 * GAP));
    box.h = Math.max(MIN.h, Math.min(box.h, vh() - 2 * GAP));
    box.x = Math.max(GAP, Math.min(box.x, vw() - box.w - GAP));
    host.style.cssText = `all: initial !important; position: fixed !important; z-index: 2147483647 !important; display: block !important;
      left: ${box.x}px !important; top: ${box.y}px !important; width: ${box.w}px !important; height: ${box.h}px !important;`;
  };
  chrome.storage.local.get({ miniSize: null }, ({ miniSize }) => {
    if (miniSize) { box.x += box.w - miniSize.w; box.w = miniSize.w; box.h = miniSize.h; }
    place();
  });
  place();
  addEventListener('resize', place);

  for (const grip of shadow.querySelectorAll('.grip')) {
    grip.addEventListener('pointerdown', e => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      card.classList.add('busy');   // the frame would swallow the pointer
      const dir = +grip.dataset.dir, x0 = e.clientX, y0 = e.clientY, start = { ...box };
      const move = ev => {
        const dx = ev.clientX - x0;
        box.w = dir < 0 ? Math.min(start.w - dx, start.x + start.w - GAP) : start.w + dx;
        box.h = start.h + ev.clientY - y0;
        box.w = Math.max(MIN.w, Math.min(box.w, vw() - 2 * GAP));
        box.x = dir < 0 ? start.x + start.w - box.w : start.x;   // the left grip moves the left edge
        place();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', () => {
        grip.removeEventListener('pointermove', move);
        card.classList.remove('busy');
        chrome.storage.local.set({ miniSize: { w: box.w, h: box.h } });
      }, { once: true });
    });
  }

  // the mini page asks to close (✕, Esc, "open the full page")
  const onMessage = e => {
    if (e.source !== frame.contentWindow || e.data?.gitantix !== 'close') return;
    host.remove();
  };
  addEventListener('message', onMessage);
  new MutationObserver((_, mo) => { if (!host.isConnected) { removeEventListener('message', onMessage); removeEventListener('resize', place); mo.disconnect(); } })
    .observe(document.documentElement, { childList: true });

  frame.addEventListener('load', () => frame.focus(), { once: true });
  frame.src = chrome.runtime.getURL('popup.html?embed');
  document.documentElement.append(host);
})();
