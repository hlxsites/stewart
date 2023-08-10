import { createElement } from '../../scripts/scripts.js';
import ffetch from '../../scripts/ffetch.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

let mouseEntered;
function bindMouseOverEvents(navDrop, navList) {
  navDrop.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;

    mouseEntered = true;
    navList.querySelectorAll('li[aria-expanded="true"]').forEach((nd) => {
      nd.setAttribute('aria-expanded', false);
    });
    navDrop.setAttribute('aria-expanded', true);
  });

  navDrop.addEventListener('mouseleave', () => {
    if (!isDesktop.matches) return;

    mouseEntered = false;
    setTimeout(() => {
      if (!mouseEntered) {
        navDrop.setAttribute('aria-expanded', false);
      }
    }, 200);
  });
}

async function findRootLandingPage() {
  const results = await ffetch('/query-index.json')
    .sheet('nav')
    .filter((p) => p.template === 'section-landing-page')
    .all();

  let root;
  let workingPath = '';
  const pathSegments = window.location.pathname.split('/').slice(1);
  pathSegments.forEach((segment) => {
    if (!root) {
      workingPath += `/${segment}`;
      root = results.find((p) => p.path === workingPath);
    }
  });

  return root;
}

function findNavPages(rootPage) {
  return ffetch('/query-index.json')
    .sheet('nav')
    .filter((p) => p.path.startsWith(rootPage.path));
}

/**
 * build nav list items
 * @param {string} navRoot path to nav root page
 * @param {Element} block the block element
 */
async function buildNavList(block) {
  const rootPage = await findRootLandingPage();

  if (!rootPage) {
    return;
  }

  const results = await findNavPages(rootPage).all();

  const mappedResults = results
    .map((item) => ({
      ...item,
      parentPath: item.path.split('/').slice(0, -1).join('/'),
      pathSegmentCount: item.path.split('/').length,
    })).sort((a, b) => a.pathSegmentCount - b.pathSegmentCount);

  const rootSegmentCount = rootPage.path.split('/').length;
  const navUl = block.querySelector('.nav-list');
  mappedResults.forEach((result) => {
    const li = createElement('li', { 'data-path': result.path }, [
      createElement('a', { href: result.path }, result.navigationTitle || result.title),
    ]);

    let parent = navUl;
    const parentLi = navUl.querySelector(`li[data-path="${result.parentPath}"`);
    if (parentLi && result.pathSegmentCount > (rootSegmentCount + 1)) {
      parent = parentLi.querySelector('ul');
      if (!parent) {
        parent = createElement('ul');
        parentLi.append(parent);
      }
    }
    parent.append(li);
  });

  const curPage = navUl.querySelector(`:scope > li[data-path="${window.location.pathname}"`);
  if (curPage) {
    curPage.setAttribute('aria-current', 'page');
  } else {
    const parentPath = window.location.pathname
      .split('/')
      .slice(0, -1)
      .join('/');
    const curParentPage = navUl.querySelector(`:scope > li[data-path="${parentPath}"`);
    if (curParentPage) {
      curParentPage.setAttribute('aria-current', 'page');
    }
  }

  navUl.querySelectorAll('li > ul').forEach((navList) => {
    const dropLi = navList.closest('li');
    dropLi.setAttribute('aria-expanded', 'false');
    dropLi.classList.add('nav-drop');
    const dropLink = dropLi.querySelector(':scope > a');
    navList.prepend(createElement('li', {}, dropLink.cloneNode(true)));
    bindMouseOverEvents(dropLi, navUl);
    dropLi.addEventListener('click', (e) => {
      if (!isDesktop.matches) return;

      if (e.target.tagName === 'A' && e.target !== dropLink) {
        return;
      }

      e.preventDefault();
      const expanded = dropLi.getAttribute('aria-expanded') === 'true';
      dropLi.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  block.classList.add('appear');
}

/**
 * decorate the section nav
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  const nav = createElement('nav', {
    'aria-label': 'Section Navigation',
    'aria-expanded': isDesktop.matches ? 'true' : 'false',
  }, [
    createElement('ul', { class: 'nav-list' }),
  ]);

  nav.querySelector('.nav-list').addEventListener('click', () => {
    if (isDesktop.matches) return;

    const expanded = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');

    nav.querySelectorAll('.nav-drop').forEach((navDrop) => {
      navDrop.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  isDesktop.addEventListener('change', () => {
    nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');

    nav.querySelectorAll('.nav-drop').forEach((navDrop) => {
      navDrop.setAttribute('aria-expanded', 'false');
    });
  });

  block.replaceChildren(nav);
  buildNavList(block);

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;

    nav.setAttribute('aria-expanded', isDesktop.matches ? 'true' : 'false');

    nav.querySelectorAll('.nav-drop').forEach((navDrop) => {
      navDrop.setAttribute('aria-expanded', 'false');
    });
  });
}
