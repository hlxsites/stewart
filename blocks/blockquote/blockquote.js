import { createElement } from '../../scripts/scripts.js';

const blockName = 'blockquote';

const classNames = {
  blockquoteContainer: `${blockName}-container`,
  blockquoteImageContainer: `${blockName}-image-container`,
  blockquoteTitle: `${blockName}-title`,
  blockquoteContent: `${blockName}-content`,
};

export default function decorate(block) {
  const blockQuote = block.querySelector('blockquote');
  const blockQuoteContentElement = createElement('div', {}, createElement('blockquote', {}, blockQuote.innerHTML));

  const blockContainer = block.children[0];

  block.append(...blockContainer.childNodes);
  block.append(blockQuoteContentElement);
  blockQuote.remove();
  blockContainer.remove();

  const selectors = ['img', 'h4', 'blockquote'];
  const classes = {
    img: classNames.blockquoteImageContainer,
    h4: classNames.blockquoteTitle,
    blockquote: classNames.blockquoteContent,
  };

  [...block.children].forEach((child) => {
    const selector = selectors.find((className) => child.querySelector(className));
    child.classList.add(classes[selector]);
  });
}
