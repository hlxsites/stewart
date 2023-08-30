import { createOptimizedPicture } from '../../scripts/lib-franklin.js';
import { createElement, fetchMetadataJson, updatePlaceholders } from '../../scripts/scripts.js';

const blockName = 'teaser-list';

const classNames = {
  teaser: `${blockName}-item`,
  teaserImage: `${blockName}-item-image`,
  teaserContent: `${blockName}-item-content`,
  teaserTitle: `${blockName}-item-title`,
  teaserLink: `${blockName}-item-link`,
  teaserSubhead: `${blockName}-item-subhead`,
};

const assignContainerClasses = (teaser) => {
  const selectors = ['img', 'h3'];
  const classes = {
    img: classNames.teaserImage,
    h3: classNames.teaserContent,
  };

  [...teaser.children].forEach((child) => {
    const selector = selectors.find((className) => child.querySelector(className));
    child.classList.add(classes[selector]);
  });
};

const assignContentClasses = (teaser) => {
  const title = teaser.querySelector('h3');
  title.classList.add(classNames.teaserTitle);

  const teaserContent = teaser.querySelector(`.${classNames.teaserContent}`);
  const cta = teaserContent.querySelector(':scope a:not(h3 *)');
  cta.classList.add(classNames.teaserLink);
  cta.classList.remove('button');

  const subhead = teaserContent.querySelector('p:first-child');

  if (subhead) {
    subhead.classList.add(classNames.teaserSubhead);
  }
};

/**
 * decorate the teaser list
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  const teaserPromises = [...block.children].map(async (teaser) => {
    teaser.classList.add(classNames.teaser);

    const pic = teaser.querySelector('picture');
    const link = teaser.querySelector('a');
    if (link && !pic) {
      const teaserPageMeta = await fetchMetadataJson(new URL(link.href).pathname);
      if (teaserPageMeta['og:image']) {
        const imageDiv = createElement('div', {}, [
          createOptimizedPicture(teaserPageMeta['og:image']),
        ]);
        const contentDiv = createElement('div', {}, [
          createElement('h3', {}, createElement('a', { href: link.href }, teaserPageMeta['navigation-title'] || teaserPageMeta['og:title'])),
          createElement('p', {}, teaserPageMeta.description),
          createElement('p', {}, createElement('a', { href: link.href }, createElement('span', { 'data-placeholder': 'readMore' }, 'Read More'))),
        ]);

        if (teaserPageMeta['publication-date']) {
          contentDiv.prepend(createElement('p', {}, teaserPageMeta['publication-date']));
        }

        teaser.replaceChildren(imageDiv, contentDiv);
        assignContainerClasses(teaser);
        assignContentClasses(teaser);
      } else {
        teaser.remove();
      }
    }
  });

  await Promise.all(teaserPromises);
  await updatePlaceholders(block);
}
