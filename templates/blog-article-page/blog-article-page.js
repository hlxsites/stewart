import { fetchPlaceholders, getMetadata } from '../../scripts/lib-franklin.js';
import { buildLinkAutoBlocks } from '../../scripts/scripts.js';

async function addBlogPostInfo(main) {
  const h1 = main.querySelector('h1');
  if (h1) {
    const placeholders = await fetchPlaceholders();
    const pubDate = getMetadata('publication-date');
    const author = getMetadata('author');
    if (author) {
      h1.insertAdjacentHTML('afterend', `
      <p>${placeholders.by || 'By'} ${author}</p>
    `);
    }

    if (pubDate) {
      try {
        const pubDateDate = new Date(Date.parse(pubDate));
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const pubDateStr = pubDateDate.toLocaleString(undefined, options);
        h1.insertAdjacentHTML('afterend', `
        <p>${placeholders.publishedOn || 'Publish on'}: ${pubDateStr}</p>
        `);
      } catch {
        // no op, just to catch any weird date format stuff
      }
    }
  }
}

export default async function buildTemplateAutoBlocks(main) {
  buildLinkAutoBlocks(main);
  await addBlogPostInfo(main);
}
