import { readBlockConfig } from '../../scripts/lib-franklin.js';
import {
  createElement,
  decorateIcons,
  wrapImgsInLinks,
  decorateLinks,
} from '../../scripts/scripts.js';

function createIconsList(ele) {
  const list = document.createElement('ul');
  list.className = 'icons-wrapper';
  [...ele.children].forEach((icon) => {
    const listItem = document.createElement('li');
    listItem.append(icon.querySelector('a'));
    list.append(listItem);
  });

  return list;
}

function createLinksList(ele) {
  const list = document.createElement('ul');
  list.className = 'links-list';
  [...ele.children].forEach((p) => {
    const listItem = document.createElement('li');
    listItem.append(p.querySelector('a'));
    list.append(listItem);
  });

  return list;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  // fetch footer content
  const footerPath = cfg.footer || '/footer';
  const resp = await fetch(`${footerPath}.plain.html`, window.location.pathname.endsWith('/footer') ? { cache: 'reload' } : {});

  if (resp.ok) {
    const html = await resp.text();

    // decorate footer DOM
    const footer = createElement('div');
    footer.className = 'inner-wrapper';
    footer.innerHTML = html;
    decorateIcons(footer);

    const firstColumn = document.createElement('div');
    firstColumn.className = 'column-1';
    const secondColumn = document.createElement('div');
    secondColumn.className = 'column-2';

    [...footer.children].forEach((ele, index, array) => {
      if (array.length - 1 === index && ele.querySelector('.icon, .fa-icon')) {
        const iconsList = createIconsList(ele);
        secondColumn.append(iconsList);
      } else {
        if (ele.querySelector('picture') && ele.querySelector('a')) {
          wrapImgsInLinks(ele);
          ele.className = 'logo';
        }
        if (!ele.querySelector('picture') && ele.querySelector('a')) {
          const linskList = createLinksList(ele);
          ele.className = 'links-wrapper';
          ele.replaceChildren(linskList);
        }
        if (!ele.querySelector('picture') && !ele.querySelector('a')) {
          ele.className = 'legal-text';
        }
        firstColumn.append(ele);
      }
    });
    footer.replaceChildren(firstColumn, secondColumn);
    decorateLinks(footer);
    block.append(footer);
  }
}
