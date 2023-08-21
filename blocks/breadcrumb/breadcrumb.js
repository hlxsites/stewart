import { getMetadata, toClassName } from '../../scripts/lib-franklin.js';
import { createElement, fetchMetadataJson } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const breadcrumb = createElement('nav', {
    'aria-label': 'Breadcrumb',
  });
  block.innerHTML = '';

  const path = window.location.pathname;
  const pathSegments = path.split('/');
  setTimeout(async () => {
    for (let i = pathSegments.length; i > 0; i -= 1) {
      const curPath = pathSegments.slice(0, i).join('/');
      if (curPath === path) {
        const title = getMetadata('navigation-title') || document.querySelector('title').innerText;
        const el = createElement('span', { 'aria-current': 'page' }, title);
        breadcrumb.prepend(el);
      } else {
        // eslint-disable-next-line no-await-in-loop
        const pageMeta = await fetchMetadataJson(curPath);
        breadcrumb.prepend(createElement('span', { class: 'breadcrumb-separator' }, '>'));
        breadcrumb.prepend(createElement('a', { href: curPath }, pageMeta['navigation-title'] || pageMeta['og:title']));
        const template = toClassName(pageMeta.template);
        if (template === 'section-landing-page' || template === 'home-page') {
          break;
        }
      }
    }

    // breadcrumb.innerHTML = breadcrumbLinks.join('<span class="breadcrumb-separator">/</span>');
    block.append(breadcrumb);
    block.classList.add('appear');
  }, 1000);
}
