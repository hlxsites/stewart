import { readBlockConfig, loadScript } from '../../scripts/lib-franklin.js';
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
 * Load Bright edge links.
 * can't be deferred til delayed because whole purpose of this is SEO, so we do it here
 * since footer is lazy loaded, I'm optimistic this won't kill page speed.
 */
function loadBrightEdge(block) {
  loadScript('https://cdn.bc0a.com/be_ixf_js_sdk.js', {
    type: 'text/javascript',
  }).then(() => {
    if (window.BEJSSDK) {
      const beSdkOpts = {
        'api.endpoint': 'https://ixfd1-api.bc0a.com',
        'sdk.account': 'f00000000186049',
        'whitelist.parameter.list': 'ixf',
      };
      window.BEJSSDK.construct(beSdkOpts);
      window.BEJSSDK.processCapsule();
      // const processCapsule = new Promise((resolve, _reject) => {
      //   /*
      //     since this function doesn't return a promise (or really return any value),
      //     there is no way to await it.
      //     instead we wrap it in our own promise that we wait to resolve until we can detect the
      //     data we need is there (or a reasonable time has elapsed)
      //   */
      //   window.BEJSSDK.processCapsule();

      //   let elapsed = 0;
      //   let timeOutTime = 50;
      //   const timeOutFunc = () => {
      //     if (window.BEJSSDK.capsule) {
      //       resolve(window.BEJSSDK.getNodes());
      //       return;
      //     }
      //     elapsed += timeOutTime;
      //     if (elapsed >= 3000) {
      //       // eslint-disable-next-line no-console
      //       console.warn('failed to load capsule in under 3 seconds');
      //       resolve([]);
      //     } else {
      //       // progressive backoff waits 100ms longer each time
      //       // this is problably more complicated than neccessary, but it works
      //       timeOutTime += 100;
      //       setTimeout(timeOutFunc, timeOutTime);
      //     }
      //   };
      //   setTimeout(timeOutFunc, timeOutTime);
      // });
      // processCapsule.then((nodes) => {
      //   const body = nodes.find((node) => node.feature_group === 'body_1');
      //   if (body) {
      //     block.querySelector('.be-ix-link-block').insertAdjacentHTML('beforeend', body.content);
      //   }
      //   const headOpen = nodes.find((node) => node.feature_group === '_head_open');
      //   if (headOpen) {
      //     document.head.insertAdjacentHTML('beforeend', headOpen.content);
      //   }
      // });
    }
  });
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
    block.prepend(createElement('div', { class: 'be-ix-link-block' }));
    loadBrightEdge(block);
  }
}
