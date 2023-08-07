import {
  sampleRUM,
  buildBlock,
  decorateBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons as libFranklinDecorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  toClassName,
  getMetadata,
} from './lib-franklin.js';

const PRODUCTION_DOMAINS = ['www.stewart.com'];
const LCP_BLOCKS = ['hero']; // add your LCP blocks to the list

/**
 * create an element.
 * @param {string} tagName the tag for the element
 * @param {object} props properties to apply
 * @param {string|Element} html content to add
 * @returns the element
 */
export function createElement(tagName, props, html) {
  const elem = document.createElement(tagName);
  if (props) {
    Object.keys(props).forEach((propName) => {
      const val = props[propName];
      if (propName === 'class') {
        const classesArr = (typeof val === 'string') ? [val] : val;
        elem.classList.add(...classesArr);
      } else {
        elem.setAttribute(propName, val);
      }
    });
  }

  if (html) {
    const appendEl = (el) => {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        elem.append(el);
      } else {
        elem.insertAdjacentHTML('beforeend', el);
      }
    };

    if (Array.isArray(html)) {
      html.forEach(appendEl);
    } else {
      appendEl(html);
    }
  }

  return elem;
}

/**
 * Extension of decorateIcons from lib-franklin.
 * adds special handing for fa icons from icon font
 * @param {Element} element the container element
 */
export async function decorateIcons(element) {
  const faPrefixes = ['fa-', 'far-', 'fab-', 'fas-', 'fal-'];
  element.querySelectorAll('span.icon').forEach((icon) => {
    const iconName = Array.from(icon.classList).find((c) => c.startsWith('icon-')).substring(5);
    const isFaIcon = faPrefixes.some((prefix) => iconName.startsWith(prefix));
    if (isFaIcon) {
      const faIcon = iconName.split('-');
      const faPrefix = faIcon[0];
      const faIconName = faIcon.slice(1).join('-');
      icon.className = `fa-icon ${faPrefix} fa-${faIconName}`;
    }
  });

  libFranklinDecorateIcons(element);
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  if (!h1) {
    return;
  }

  const section = h1.closest('div');
  const picture = section.querySelector('picture');
  if (!picture) {
    return;
  }

  const elems = [...section.children];
  const filtered = elems.filter((el) => !el.classList.contains('section-metadata'));
  const block = buildBlock('hero', { elems: filtered });
  section.append(block);
  main.prepend(section);
}

function buildEmbedBlocks(main) {
  // For every youtube link, convert to an embed block
  main.querySelectorAll('a[href*="youtube.com/embed"]').forEach((a) => {
    // Get picture if it exists and move it to the block
    const picture = a.closest('div').querySelector('picture');
    const block = buildBlock('embed', { elems: picture ? [picture, a.cloneNode()] : [a.cloneNode()] });
    a.replaceWith(block);
    decorateBlock(block);
  });
}

function buildFragmentBlocks(main) {
  const hosts = ['localhost', 'hlx.page', 'hlx.live', ...PRODUCTION_DOMAINS];
  // links to /fragments/* become fragment blocks
  main.querySelectorAll('a[href*="/fragments/"]').forEach((a) => {
    if (a.href) {
      const url = new URL(a.href);

      // for safety, we do a host match, and make sure the text content matches the path
      const hostMatch = hosts.some((host) => url.hostname.includes(host));
      if (hostMatch && a.textContent.includes(url.pathname)) {
        const block = buildBlock('fragment', { elems: a });
        a.replaceWith(block);
        decorateBlock(block);
      }
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    buildEmbedBlocks(main);
    buildFragmentBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

export function decorateLinks(element) {
  const hosts = ['localhost', 'hlx.page', 'hlx.live', ...PRODUCTION_DOMAINS];
  element.querySelectorAll('a').forEach((a) => {
    try {
      if (a.href) {
        const url = new URL(a.href);

        // local links are relative
        // non local and non email links open in a new tab
        const hostMatch = hosts.some((host) => url.hostname.includes(host));

        if (hostMatch) {
          a.href = `${url.pathname.replace('.html', '')}${url.search}${url.hash}`;
        } else {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
      }
    } catch (e) {
      // something went wrong
      // eslint-disable-next-line no-console
      console.log(e);
    }
  });
}

/**
 * Wraps images followed by links within a matching <a> tag.
 * @param {Element} container The container element
 */
export function wrapImgsInLinks(container) {
  const pictures = container.querySelectorAll('p picture');
  pictures.forEach((pic) => {
    const parent = pic.parentNode;
    if (!parent.nextElementSibling) {
      // eslint-disable-next-line no-console
      console.warn('no next element');
      return;
    }
    const link = parent.nextElementSibling.querySelector('a');
    if (link && link.textContent.includes(link.getAttribute('href'))) {
      link.parentElement.remove();
      link.innerHTML = pic.outerHTML;
      pic.replaceWith(link);
    }
  });
}

/**
 * fetches the navigation markup
 */
export async function fetchNavigationHTML() {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta).pathname : '/nav';

  const response = await fetch(`${navPath}.plain.html`);
  return response.text();
}

/**
 * decorates section background images out of section metadata
 * @param {element} main the container element
 */
function decorateSectionBackgroundImages(main) {
  main.querySelectorAll('div.section-metadata').forEach((sectionMeta) => {
    sectionMeta.querySelectorAll(':scope > div').forEach((row) => {
      if (row.children) {
        const cols = [...row.children];
        if (cols[1]) {
          const name = toClassName(cols[0].textContent);
          if (name === 'background') {
            const pic = cols[1].querySelector('picture');
            if (pic) {
              const section = sectionMeta.parentElement;
              pic.classList.add('bg-image');
              section.prepend(pic);
              section.classList.add('has-bg-image');
              row.remove();
            }
          }
        }
      }
    });
  });
}

/**
 * perform additional section class decoration
 * @param {Element} main the container element
 */
function decorateSectionsExt(main) {
  const bgClasses = ['has-bg-image', 'teal', 'blue', 'black', 'gray', 'grey'];
  const opacityClasses = ['opacity-100', 'opacity-90', 'opacity-80', 'opacity-70', 'opacity-60', 'opacity-55', 'opacity-50'];
  const allSections = main.querySelectorAll('div.section');
  for (let i = 0; i < allSections.length; i += 1) {
    const section = allSections[i];

    const hasBg = [...section.classList].some((cls) => bgClasses.includes(cls));
    if (hasBg) {
      section.classList.add('has-bg');
    }

    const hasOpacity = [...section.classList].some((cls) => opacityClasses.includes(cls));
    if (hasOpacity) {
      section.classList.add('has-opacity');
    }
    // if the section has a background
    // and the next one does not, then the section gets no bottom margin
    let nextSection;
    if (i <= (allSections.length - 1)) nextSection = allSections[i + 1];
    if (nextSection) {
      const nextHasBg = [...nextSection.classList].some((cls) => bgClasses.includes(cls));
      const thisHasBg = [...section.classList].some((cls) => bgClasses.includes(cls));
      if (thisHasBg && nextHasBg) {
        section.classList.add('no-margin');
      }
    } else {
      section.classList.add('no-margin');
    }
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  wrapImgsInLinks(main);
  decorateLinks(main);
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSectionBackgroundImages(main);
  decorateSections(main);
  decorateSectionsExt(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
