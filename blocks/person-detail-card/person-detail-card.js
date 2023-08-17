import { createElement } from '../../scripts/scripts.js';

/**
 * decorate the person detail card
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  const wrapper = block.querySelectorAll(':scope > div > div');
  const innerWrapper = createElement('div', { class: 'inner-wrapper' });
  const contentWrapperNew = createElement('div', { class: 'content-wrapper' });

  if (wrapper[0]) {
    wrapper[0].classList.add('image-wrapper');
    innerWrapper.append(wrapper[0]);
  }

  if (wrapper[1]) {
    const contentWrapper = wrapper[1];

    if (contentWrapper.querySelector('h3')) {
      contentWrapperNew.append(contentWrapper.querySelector('h3'));
    }

    if (contentWrapper.querySelector('.job-title')) {
      contentWrapperNew.append(createElement('h4', { class: 'title' }, contentWrapper.querySelector('.job-title').innerHTML));
    }

    [...contentWrapper.querySelectorAll('p')].forEach((p) => {
      if (p.querySelector('a')) {
        p.classList.remove('button-container');
        p.classList.add('email');
        p.querySelector('a').classList.remove('button', 'primary');
      } else {
        p.classList.add('phone');
      }
      contentWrapperNew.append(p);
    });

    innerWrapper.append(contentWrapperNew);
  }

  block.replaceChildren(innerWrapper);
}
