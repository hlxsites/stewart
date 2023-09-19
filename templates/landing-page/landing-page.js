import { buildBlock } from '../../scripts/lib-franklin.js';
import { buildAutoBlocks } from '../../scripts/scripts.js';

const buildLandingPageFooter = (main) => {
  const lastSection = main.querySelector(':scope > div:last-child');
  const footerBlock = buildBlock('footer', [
    ['footer', '/en/fragments/landing-page-footer'],
  ]);
  lastSection.append(footerBlock);
};

export default async function buildTemplateAutoBlocks(main) {
  buildAutoBlocks(main);
  buildLandingPageFooter(main);
}
