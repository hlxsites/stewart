import { getSearchConfig } from '../../scripts/search-utils.js';
import { fetchResults } from '../search-results/search-results.js';
import {
  buildBlock,
  decorateBlock,
  loadBlock,
} from '../../scripts/lib-franklin.js';

import { createElement } from '../../scripts/scripts.js';

const buildTeaserListFromResults = async (results, block) => {
  const teasers = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of results) {
    const { path } = entry;

    const teaserLinkElement = createElement('a', { href: path }, path);
    teasers.push([teaserLinkElement]);
  }

  const teaserListBlock = buildBlock('teaser-list', teasers);

  block.appendChild(teaserListBlock);
  decorateBlock(teaserListBlock);
  await loadBlock(teaserListBlock);
};

export default async function decorate(block) {
  const config = getSearchConfig(block);
  block.innerHTML = '';
  const { count } = config;
  const results = fetchResults(config, '', '', -1).limit(Number(count || 4));

  buildTeaserListFromResults(results, block);
}
