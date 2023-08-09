import { getSearchConfig } from '../../scripts/search-utils.js';
import { fetchResults } from '../search-results/search-results.js';
import {
  buildBlock,
  decorateBlock,
  loadBlock,
  fetchPlaceholders,
} from '../../scripts/lib-franklin.js';

import { createElement } from '../../scripts/scripts.js';

const buildTeaserListFromResults = async (results, block) => {
  const { recentArticlesCta } = await fetchPlaceholders();
  const cta = recentArticlesCta || 'Read more';

  const teasers = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of results) {
    const teaserElements = [];
    const {
      date,
      path,
      image,
      title,
      description,
    } = entry;

    const teaserImageElement = createElement('div', {}, createElement('img', { src: image, alt: title }));
    const teaserDateElement = createElement('p', {}, new Date(date * 1000).toDateString());
    const teaserContentElement = createElement('div');
    const teaserTitleElement = createElement('h3', {}, `<a href="${path}" title="${title}">${title}</a>`);
    const teaserDescriptionElement = createElement('p', {}, description);
    const teaserLinkElement = createElement('a', {}, `<a href="${path}" title="${cta}">${cta}</a>`);

    teaserContentElement.append(
      teaserDateElement,
      teaserTitleElement,
      teaserDescriptionElement,
      teaserLinkElement,
    );

    if (image && !image.includes('default-meta-image')) {
      teaserElements.push(teaserImageElement);
    }

    teaserElements.push(teaserContentElement);
    teasers.push(teaserElements);
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
  const results = fetchResults(config, '', '', -1).limit(Number(count));

  buildTeaserListFromResults(results, block);
}
