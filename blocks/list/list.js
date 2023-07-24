function getListItemRestructured(parent) {
  const listItem = document.createElement('li');
  listItem.className = 'list-item';
  const innerWrapper = document.createElement('div');
  innerWrapper.className = 'list-inner-wrapper';
  [...parent.children].forEach((ele) => {
    const anchorEle = ele.querySelector('a');
    const icon = ele.querySelector('.fa-icon');
    const textWrapper = innerWrapper.querySelector('.text-wrapper');
    if (anchorEle) {
      if (!listItem.querySelector('a')) {
        const anchor = document.createElement('a');
        anchor.href = anchorEle.href;
        anchor.title = anchorEle.title;
        anchor.append(innerWrapper);
        listItem.append(anchor);
      }
      if (icon) {
        listItem.querySelector('.list-inner-wrapper').append(icon);
      } else {
        const span = document.createElement('div');
        span.className = 'link-text';
        span.innerHTML = anchorEle.innerHTML;
        listItem.querySelector('.list-inner-wrapper').append(span);
      }
    } else if (icon) {
      innerWrapper.append(icon);
    } else {
      if (!textWrapper) {
        const wrapper = document.createElement('div');
        wrapper.className = 'text-wrapper';
        innerWrapper.append(wrapper);
      }
      innerWrapper.querySelector('.text-wrapper').append(ele);
    }
  });

  if (!listItem.querySelector('.list-inner-wrapper')) {
    listItem.append(innerWrapper);
  }

  return listItem;
}

/**
 * loads and decorates the list
 * @param {Element} block The list block element
 */
export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'ul';

  [...block.children].forEach((ele) => {
    list.append(getListItemRestructured(ele.querySelector(':scope > div')));
  });

  block.replaceChildren(list);
}
