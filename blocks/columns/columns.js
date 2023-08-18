import {
  buildBlock,
  decorateBlock,
  loadBlock,
} from '../../scripts/lib-franklin.js';

async function autoblockCarousel(block) {
  let carouselCol;
  let maxPics = 1;
  block.querySelectorAll('.column').forEach((col) => {
    const pics = col.querySelectorAll('picture').length;
    if (pics > maxPics) {
      maxPics = pics;
      carouselCol = col;
    }
  });
  if (carouselCol) {
    const carouselBlock = buildBlock('carousel', {
      elems: carouselCol.querySelectorAll('picture'),
    });
    carouselCol.appendChild(carouselBlock);
    decorateBlock(carouselBlock);
    await loadBlock(carouselBlock);
  }
}

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];

  block.classList.add(`columns-${cols.length}-cols`);
  const cards = block.classList.contains('card');
  if (cards) {
    // replace class name to avoid block class conflict for css
    block.classList.remove('card');
    block.classList.remove('with-cards');
  }
  const loadPromises = [];
  [...block.children].forEach((row, rdx) => {
    row.classList.add('row', `row-${rdx + 1}`);
    [...row.children].forEach((col, cdx) => {
      col.classList.add('column', `column-${cdx + 1}`);

      if (cards) {
        col.classList.add('card-col');
        const cardBlock = buildBlock('card', { elems: [...col.children] });
        col.append(cardBlock);
        decorateBlock(cardBlock);
        loadPromises.push(loadBlock(cardBlock));
      }

      // setup image columns
      const pic = col.querySelector('picture');
      if (pic) {
        col.classList.add('columns-img-col');
      }
    });
  });

  await Promise.all(loadPromises);

  // if block has carousel style, autoblock carousel column
  if (block.classList.contains('carousel')) {
    await autoblockCarousel(block);
  }
}
