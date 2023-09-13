import {
  sampleRUM,
  buildBlock,
  decorateBlock,
  loadHeader,
  loadFooter,
  decorateIcons as libFranklinDecorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  toClassName,
  getMetadata,
  fetchPlaceholders,
} from './lib-franklin.js';

// valid template for which we have css/js files
const VALID_TEMPLATES = [
  'section-landing-page',
  'section-page',
  'blog-article-page',
  'landing-page',
];
const PRODUCTION_DOMAINS = ['www.stewart.com'];
const LCP_BLOCKS = ['hero', 'alert']; // add your LCP blocks to the list

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
 * build columns blocks from sections containing the columns style
 * @param {Element} main the main element
 */
export function buildAutoColumns(main) {
  main.querySelectorAll('.section.columns').forEach((colSect) => {
    const blockTable = [];
    const row = [];
    [...colSect.children].forEach((wrapper) => {
      row.push({ elems: [...wrapper.children] });
      wrapper.remove();
    });
    blockTable.push(row);
    const block = buildBlock('columns', blockTable);
    // todo add variant classes
    const wrapper = createElement('div');
    wrapper.append(block);
    colSect.append(wrapper);
    decorateBlock(block);
  });
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
export function buildHeroBlock(main) {
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
  const filtered = elems.filter((el) => !el.classList.contains('section-metadata') && !el.classList.contains('alert'));
  const block = buildBlock('hero', { elems: filtered });
  section.append(block);
}

export function buildEmbed(link) {
  const elems = [link.cloneNode(true)];
  const block = buildBlock('embed', { elems });
  link.replaceWith(block);
  decorateBlock(block);
}

export function buildFragment(link) {
  const block = buildBlock('fragment', link.cloneNode(true));
  link.replaceWith(block);
  decorateBlock(block);
}

export function buildForm(link) {
  const block = buildBlock('form', link.cloneNode(true));
  link.replaceWith(block);
  decorateBlock(block);
}

export function buildLinkAutoBlocks(main) {
  const hosts = ['localhost', 'hlx.page', 'hlx.live', ...PRODUCTION_DOMAINS];
  main.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href);
    const hostMatch = hosts.some((host) => url.hostname.includes(host));
    let autoBlocked = false;
    if (hostMatch && url.pathname.includes('/fragments/') && a.textContent.includes(url.pathname)) {
      buildFragment(a);
      autoBlocked = true;
    } else if (hostMatch
      && url.pathname.includes('/forms/') && url.pathname.endsWith('.json')
      && a.textContent.includes(url.pathname)) {
      buildForm(a);
      autoBlocked = true;
    } else if (url.hostname.includes('youtube.com') && url.pathname.startsWith('/embed')) {
      buildEmbed(a);
      autoBlocked = true;
    }

    if (autoBlocked) {
      const buttonContainer = a.closest('.button-container');
      if (buttonContainer) buttonContainer.classList.remove('button-container');
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
export function buildAutoBlocks(main) {
  buildHeroBlock(main);
  buildLinkAutoBlocks(main);
}

export function decorateLinks(element) {
  const hosts = ['localhost', 'hlx.page', 'hlx.live', ...PRODUCTION_DOMAINS];
  element.querySelectorAll('a').forEach((a) => {
    try {
      if (a.href) {
        const url = new URL(a.href);
        // protect against maito: links or other weirdness
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

        const hostMatch = hosts.some((host) => url.hostname.includes(host));
        if (hostMatch) {
          // local links are rewritten to be relative
          a.href = `${url.pathname.replace('.html', '')}${url.search}${url.hash}`;
        } else if (!url.hostname.includes('.stewart.com')) {
          // non local open in a new tab
          // but if a different stewart.com sub-domain, leave absolute, don't open in a new tab
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
  const ignorePatterns = ['/fragments/', '/forms/'];
  const pictures = container.querySelectorAll('picture');
  pictures.forEach((pic) => {
    // need to deal with 2 use cases here
    // 1) <picture><br/><a>
    // 2) <p><picture></p><p><a></p>
    if (pic.nextElementSibling && pic.nextElementSibling.tagName === 'BR'
      && pic.nextElementSibling.nextElementSibling && pic.nextElementSibling.nextElementSibling.tagName === 'A') {
      const link = pic.nextElementSibling.nextElementSibling;
      if (link.textContent.includes(link.getAttribute('href'))) {
        if (ignorePatterns.some((pattern) => link.getAttribute('href').includes(pattern))) {
          return;
        }
        pic.nextElementSibling.remove();
        link.innerHTML = pic.outerHTML;
        pic.replaceWith(link);
        return;
      }
    }

    const parent = pic.parentNode;
    if (!parent.nextElementSibling) {
      // eslint-disable-next-line no-console
      console.warn('no next element');
      return;
    }
    const nextSibling = parent.nextElementSibling;
    if (parent.tagName !== 'P' || nextSibling.tagName !== 'P' || nextSibling.children.length > 1) {
      // eslint-disable-next-line no-console
      console.warn('next element not viable link container');
      return;
    }
    const link = nextSibling.querySelector('a');
    if (link && link.textContent.includes(link.getAttribute('href'))) {
      if (ignorePatterns.some((pattern) => link.getAttribute('href').includes(pattern))) {
        return;
      }
      link.parentElement.remove();
      link.innerHTML = pic.outerHTML;
      pic.replaceWith(link);
    }
  });
}

/**
 * fetches page and returns a json representation of all it's metadata
 * @param {string} path path to the page to fetch
 */
export async function fetchMetadataJson(path) {
  const data = {};
  const resp = await fetch(path);
  if (resp.ok) {
    const html = await resp.text();
    const parser = new DOMParser();
    const contentDoc = parser.parseFromString(html, 'text/html');
    contentDoc.querySelectorAll('head > meta').forEach((metaTag) => {
      const name = metaTag.getAttribute('name') || metaTag.getAttribute('property');
      const value = metaTag.getAttribute('content');
      if (data[name]) {
        let val = data[name];
        if (!Array.isArray(val)) {
          val = [val];
        }
        val.push(value);
        data[name] = val;
      } else {
        data[name] = value;
      }
    });
  }

  return data;
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
 * Builds accordion blocks from default content
 * @param {Element} main The container element
 */
function buildAccordions(main) {
  const accordionSectionContainers = main.querySelectorAll('.section.accordion');
  accordionSectionContainers.forEach((accordion) => {
    const contentWrappers = accordion.querySelectorAll(':scope > div');
    const blockTable = [];
    let row;
    contentWrappers.forEach((wrapper) => {
      let removeWrapper = true;
      [...wrapper.children].forEach((child) => {
        if (child.nodeName === 'H2') {
          if (row) {
            blockTable.push(row);
          }

          row = [{ elems: [] }, { elems: [] }];
          row[0].elems.push(child);
        }

        if (!row) {
          // if there is content in the section before the first h2
          // then that content is preserved
          // otherwise, we remove the wrapper
          removeWrapper = false;
        }
        if (row && child.nodeName !== 'H2') {
          row[1].elems.push(child);
        }
      });
      if (removeWrapper) wrapper.remove();
    });

    // add last row
    if (row) {
      blockTable.push(row);
    }

    const block = buildBlock('accordion', blockTable);
    const wrapper = createElement('div');
    wrapper.append(block);
    accordion.append(wrapper);
    decorateBlock(block);
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
    const thisHasBg = section.querySelector('.hero') || [...section.classList].some((cls) => bgClasses.includes(cls));
    if (nextSection) {
      const nextHasBg = [...nextSection.classList].some((cls) => bgClasses.includes(cls));
      if (thisHasBg && nextHasBg) {
        section.classList.add('no-margin');
      }
    } else if (thisHasBg) {
      section.classList.add('no-margin');
    }
  }
}

function isLinkOutsideParagraph(link) {
  const parent = link.parentElement;

  if (parent.tagName === 'LI') {
    return false;
  }

  // Check for siblings which would indicate this link is in other text.
  const siblings = [...parent.childNodes].filter((node) => {
    if (link === node) return false; // The link itself is not a sibling
    if (node.nodeType === Node.TEXT_NODE) {
      // If a sibling is a text that is more than whitespace, then this link is inside other text.
      return node.textContent.trim().length > 0;
    }
    if (node.nodeType === Node.ELEMENT_NODE && getComputedStyle(node).display !== 'block') {
      // If a sibling is an inline element, then this link is inside other text.
      return false;
    }
    return true;
  });
  // Recurse up one level if the link should be a secondary or tertiary button.
  if (parent.tagName === 'STRONG' || parent.tagName === 'EM') {
    return siblings.length === 0 && (
      parent.parentElement.childNodes.size === 0
      || isLinkOutsideParagraph(parent));
  }

  return siblings.length === 0;
}

/**
 * Decorates paragraphs containing a single link as buttons.
 * @param {Element} element container element
 */
export function decorateButtons(element) {
  element.querySelectorAll('a').forEach((a) => {
    a.title = a.title || a.textContent;
    if (a.href !== a.textContent && !a.querySelector('img') && isLinkOutsideParagraph(a)) {
      const up = a.parentElement;
      const twoup = up.parentElement;
      if (up.tagName === 'STRONG') {
        a.className = 'button tertiary';
        twoup.classList.add('button-container');
      } else if (up.tagName === 'EM') {
        a.className = 'button secondary';
        twoup.classList.add('button-container');
      } else if (up) {
        a.className = 'button primary'; // default
        up.classList.add('button-container');
      }
    }
  });
}

/**
 * load template css and js.
 * @param {string} template the template to load.
 * @param {element} main the main element to pass to template decorate function
 * @returns promise which resolves to the templates js module if there is one.
 */
async function loadTemplate(templateName) {
  if (!VALID_TEMPLATES.some((t) => t === templateName)) {
    return null;
  }

  try {
    let mod;
    const cssLoaded = new Promise((resolve) => {
      try {
        loadCSS(`${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.css`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`failed to load styles for ${templateName}`, error);
      }
      resolve();
    });
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          mod = await import(`../templates/${templateName}/${templateName}.js`);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${templateName}`, error);
        }
        resolve();
      })();
    });
    await Promise.all([cssLoaded, decorationComplete]);
    return mod;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${templateName}`, error);
  }

  return null;
}

const decorateCardSections = (main) => {
  const template = getMetadata('template');
  const isLanding = toClassName(template) === 'landing-page';
  main.querySelectorAll('.section.card').forEach((cardSect) => {
    const newWrapper = createElement('div');
    const contentWrappers = cardSect.querySelectorAll(':scope > div');
    contentWrappers.forEach((wrapper) => {
      if (!(isLanding && wrapper.classList.contains('footer-wrapper'))) {
        newWrapper.append(wrapper);
      }
    });
    const block = buildBlock('card', [[newWrapper]]);
    cardSect.prepend(block);
    decorateBlock(block);
    cardSect.classList.remove('card');

    if (isLanding) {
      // find logo image and lift it out of card
      const cardLogo = block.querySelector('.default-content-wrapper .bg-image + p > picture');
      if (cardLogo) {
        const logoWrapper = createElement('div', { class: 'default-content-wrapper' });
        logoWrapper.append(cardLogo.parentElement);
        block.insertAdjacentElement('beforebegin', logoWrapper);
      }
    }
  });
};

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export async function decorateMain(main, isFragment = false) {
  // hopefully forward compatible button decoration
  wrapImgsInLinks(main);
  decorateLinks(main);
  decorateButtons(main);
  decorateIcons(main);

  try {
    const template = getMetadata('template');
    let autoBlocksFunc = buildAutoBlocks;
    if (template && !isFragment) {
      // template js, if they exist, must call appropriate auto-blocks on their own
      const templateMod = await loadTemplate(toClassName(template));
      if (templateMod && templateMod.default) {
        autoBlocksFunc = templateMod.default;
      }
    }
    await autoBlocksFunc(main, isFragment);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }

  decorateSectionBackgroundImages(main);
  decorateSections(main);
  decorateSectionsExt(main);
  decorateBlocks(main);
  decorateCardSections(main);
  buildAccordions(main);
  buildAutoColumns(main);
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/fonts/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Adds a parameter to the URL.
 * @param {String} key
 * @param {String} value
 */
export function addQueryParamToURL(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url.toString());
}

/**
 * Gets a query param from the URL.
 * @param {String} key
 * @returns {String} the value of the query parameter
 */
export function getQueryParamFromURL(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) || '';
}

/**
 * Generic debounce function
 */
export const debounce = (func, timeout = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
};

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // init page lang
  const validLangs = ['en', 'es', 'zh', 'vi', 'ko'];
  let lang = 'en';
  const pathSegments = window.location.pathname.split('/');
  if (pathSegments.length > 1 && !window.isErrorPage) {
    [, lang] = pathSegments;
  }
  if (!validLangs.includes(lang)) lang = 'en';
  document.documentElement.lang = lang;

  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if fonts already loaded, load fonts.css */
    if (sessionStorage.getItem('fonts-loaded')) {
      await loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * @returns the global placeholders from the window object.
 */
export function getGlobalPlaceholders() {
  if (!window.placeholders || !window.placeholders.default) {
    console.error('global placeholders not initialized yet.'); // eslint-disable-line no-console
    return {};
  }

  return window.placeholders.default;
}

/**
 * @returns the locale specific placeholders from the window object.
 */
export function getLocalePlaceholders() {
  if (!window.placeholders || !window.placeholders[document.documentElement.lang]) {
    console.error('locale placeholders not initialized yet.'); // eslint-disable-line no-console
    return {};
  }

  return window.placeholders[document.documentElement.lang];
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await Promise.all([fetchPlaceholders(), fetchPlaceholders(document.documentElement.lang)]);
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  const template = getMetadata('template');
  if (toClassName(template) === 'landing-page') {
    // landing pages get no header or footer
    // this isn't autoblocking in main, so need to do this here
    doc.querySelector('header').remove();
    doc.querySelector('footer').remove();
  } else {
    loadHeader(doc.querySelector('header'));
    loadFooter(doc.querySelector('footer'));
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  await loadFonts();

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
