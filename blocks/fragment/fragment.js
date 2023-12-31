/*
 * Fragment Block
 * Include content from one Helix page in another.
 * https://www.hlx.live/developer/block-collection/fragment
 */

import { decorateMain } from '../../scripts/scripts.js';
import { loadBlocks } from '../../scripts/lib-franklin.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement>} The root element of the fragment
 */
async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();
      await decorateMain(main, true);
      await loadBlocks(main);
      return main;
    }
  }
  return null;
}

/**
 * decorate the fragment block
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section').classList.add(...fragmentSection.classList);
      const fragmentWrapper = block.closest('.fragment-wrapper');
      if (fragmentWrapper) {
        const containingBlock = block.parentElement.closest('.block');
        if (!containingBlock) {
          fragmentWrapper.replaceWith(...fragmentSection.childNodes);
        } else {
          // to avoid disrupting block dom structure
          fragmentWrapper.replaceChildren(...fragmentSection.childNodes);
        }
      } else {
        block.replaceChildren(...fragmentSection.childNodes);
      }
    }
  }
}
