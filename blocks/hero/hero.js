import { decorateBlock } from '../../scripts/lib-franklin.js';
import { createElement } from '../../scripts/scripts.js';

/**
 * decorate the hero
 * @param {Element} block the block
 */
export default function decorate(block) {
  const elementContainer = block.querySelector(':scope > div > div');

  const heroWrapper = createElement('div', { class: 'hero-inner' });
  const pic = elementContainer.querySelector('picture');
  if (pic) {
    const picParent = pic.parentElement;
    pic.classList.add('hero-bg');
    heroWrapper.append(pic);

    // prevent left behind empty p tag
    if (picParent.tagName === 'P') {
      picParent.remove();
    }
  }

  [...elementContainer.children].forEach((child) => {
    heroWrapper.append(child);
    if (child.tagName === 'DIV' && child.className !== '') {
      decorateBlock(child);
    }
  });

  elementContainer.parentElement.remove();
  block.append(heroWrapper);
}
