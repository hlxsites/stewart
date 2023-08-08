import { createElement } from '../../scripts/scripts.js';

const blockName = 'accordion';

const classNames = {
  accordionItem: `${blockName}-item`,
  accordionItemTrigger: `${blockName}-item-trigger`,
  accordionItemTitle: `${blockName}-item-title`,
  accordionItemActive: `${blockName}-item-active`,
  accordionPanel: `${blockName}-panel`,
};

let blockIndex = 0;

export default function decorate(block) {
  block.dataset.accordionIndex = blockIndex;
  blockIndex += 1;

  [...block.children].forEach((accordionItem, accordionItemIndex) => {
    accordionItem.classList.add(classNames.accordionItem);

    const header = accordionItem.querySelector('h2');
    const headerText = header.textContent;
    header.innerHTML = '';

    const newHeader = createElement('h2', {
      class: classNames.accordionItemTrigger,
      'aria-expanded': 'false',
      'aria-controls': `accordion-panel-${block.dataset.accordionIndex}-${accordionItemIndex}`,
      id: `accordion-${block.dataset.accordionIndex}-${accordionItemIndex}`,
    }, createElement('span', { class: classNames.accordionItemTitle }, headerText));

    header.outerHTML = newHeader.outerHTML;
    const panel = createElement('div', {
      class: classNames.accordionPanel,
      role: 'region',
      'aria-labelledby': `accordion-${block.dataset.accordionIndex}-${accordionItemIndex}`,
      id: `accordion-panel-${block.dataset.accordionIndex}-${accordionItemIndex}`,
      hidden: '',
    });

    const panelText = accordionItem.querySelector('p');
    if (panelText !== null) {
      panel.append(panelText);
    }
    const panelTable = accordionItem.querySelector('div.table');
    if (panelTable !== null) {
      panel.append(panelTable);
    }
    accordionItem.firstChild.append(panel);
  });

  const accordionTriggers = block.querySelectorAll(`.${classNames.accordionItemTrigger}`);

  [...accordionTriggers].forEach((trigger) => {
    trigger.addEventListener('click', () => {
      trigger.closest(`.${classNames.accordionItem}`).classList.toggle(classNames.accordionItemActive);
      const panel = trigger.nextElementSibling;
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true' || false;
      trigger.setAttribute('aria-expanded', !isExpanded);
      panel.classList.toggle(classNames.accordionItemActive);
      panel.hidden = !panel.hidden;
    });
  });
}
