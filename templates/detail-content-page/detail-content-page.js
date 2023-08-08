import { buildAutoBlocks, createElement } from '../../scripts/scripts.js';
import { buildBlock } from '../../scripts/lib-franklin.js';

/**
 * build the section nav and place it after the hero
 * @param {Element} main the main element
 */
export function buildSectionNav(main) {
  const navSection = createElement('div');
  const block = buildBlock('section-nav', [
    ['level', 'grand-parent'],
  ]);
  navSection.append(block);
  const heroSection = main.querySelector('div');
  heroSection.insertAdjacentElement('afterend', navSection);
}

export default async function buildTemplateAutoBlocks(main) {
  buildAutoBlocks(main);
  buildSectionNav(main);
}
