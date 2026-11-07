// Full-screen view of a postcard scan, with Front/Back buttons when the card
// has both sides. Uses a <dialog>, so Esc and clicking outside close it.

import { t } from './i18n.js';

export function createViewer() {
  const dialog = document.createElement('dialog');
  dialog.className = 'scan-viewer';
  dialog.innerHTML = `
    <img alt="">
    <div class="scan-viewer-bar">
      <div class="scan-sides" role="group"></div>
      <button type="button" class="scan-viewer-close"></button>
    </div>`;
  document.body.append(dialog);

  const img = dialog.querySelector('img');
  const sidesBar = dialog.querySelector('.scan-sides');
  const closeButton = dialog.querySelector('.scan-viewer-close');
  let current = null; // { card, sides }

  closeButton.addEventListener('click', () => dialog.close());
  // A click on the dark backdrop lands on the dialog itself.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  sidesBar.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) show(button.dataset.side);
  });

  // `sides` lists the sides whose scans actually loaded, e.g. ['front', 'back'].
  function open(card, side, sides) {
    current = { card, sides };
    closeButton.textContent = t('close');
    show(side);
    dialog.showModal();
  }

  function show(side) {
    const { card, sides } = current;
    img.src = card.scans[side];
    img.alt = t('scanAlt', card.id, side);
    sidesBar.innerHTML = sides.length > 1 ? sides.map((s) => `
      <button type="button" class="chip small" data-side="${s}" aria-pressed="${s === side}">${t(s)}</button>`).join('') : '';
  }

  return { open };
}
