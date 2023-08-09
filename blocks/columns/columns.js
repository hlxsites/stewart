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
  if (block.closest('.section').classList.contains('has-bg-image')) {
    block.classList.add('opacity');
  }

  const rowCount = [...block.children].length;

  [...block.children].forEach((row, rdx) => {
    /*
    The columns of first row should occupy full width when more than one row exists.
    "row" class is used to set the column width. So, not adding "row" class for the first row.
    */
    if (rowCount > 1 && rdx === 0) {
      row.classList.add(`row-${rdx + 1}`);
    } else {
      row.classList.add('row', `row-${rdx + 1}`);
    }
    [...row.children].forEach((col, cdx) => {
      col.classList.add('column', `column-${cdx + 1}`);

      // setup image columns
      const pic = col.querySelector('picture');
      if (pic) {
        col.classList.add('columns-img-col');
      }
    });
  });

  // if block has carousel style, autoblock carousel column
  if (block.classList.contains('carousel')) {
    await autoblockCarousel(block);
  }
}
