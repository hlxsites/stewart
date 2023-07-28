import { replaceElementTagName } from '../../scripts/scripts.js';

const blockName = 'blockquote';

const classNames = {
  blockquoteImageContainer: `${blockName}-image-container`,
  blockquoteTitle: `${blockName}-title`,
  blockquoteContent: `${blockName}-content`,
};

const setupContainerClasses = (block) => {
  const selectors = ['img', 'h4'];
  const classes = {
    img: classNames.blockquoteImageContainer,
    h4: classNames.blockquoteTitle,
  };

  [...block.children].forEach((child) => {
    const selector = selectors.find((className) => child.querySelector(className));
    child.classList.add(selector ? classes[selector] : classNames.blockquoteContent);
  });
};

const wrapQuote = (block) => {
  const quote = block.querySelector(`.${classNames.blockquoteContent} > div`);
  const blockQuoteElement = replaceElementTagName(quote, 'blockquote');
  blockQuoteElement.innerHTML = `<p>${quote.innerHTML}</p>`;
};

export default function decorate(block) {
  setupContainerClasses(block);
  wrapQuote(block);
}
