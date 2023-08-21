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
    const { children } = accordionItem;
    // if (accordionStandardBlock) {
    // Removing header wrapper only for regular accordion block
    const headerDiv = children[0];
    headerDiv.outerHTML = headerDiv.innerHTML;

    const header = accordionItem.querySelector('h3, h2');
    const headerText = header.textContent;
    header.innerHTML = '';

    const button = createElement('button', {
      class: classNames.accordionItemTrigger,
      'aria-expanded': 'false',
      'aria-controls': `accordion-panel-${block.dataset.accordionIndex}-${accordionItemIndex}`,
      id: `accordion-${block.dataset.accordionIndex}-${accordionItemIndex}`,
    }, createElement('span', { class: classNames.accordionItemTitle }, headerText));

    header.append(button);
    const panel = header.nextElementSibling;

    panel.classList.add(classNames.accordionPanel);
    panel.setAttribute('id', `accordion-panel-${block.dataset.accordionIndex}-${accordionItemIndex}`);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', `accordion-${block.dataset.accordionIndex}-${accordionItemIndex}`);
  });

  const accordionTriggers = block.querySelectorAll(`.${classNames.accordionItemTrigger}`);

  [...accordionTriggers].forEach((trigger) => {
    trigger.addEventListener('click', () => {
      trigger.closest(`.${classNames.accordionItem}`).classList.toggle(classNames.accordionItemActive);
      const panel = trigger.parentElement.nextElementSibling;
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true' || false;
      trigger.setAttribute('aria-expanded', !isExpanded);
      panel.classList.toggle(classNames.accordionItemActive);
    });
  });
}
