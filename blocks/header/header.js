import { getMetadata } from '../../scripts/lib-franklin.js';
import {
  wrapImgsInLinks,
  decorateLinks,
  createElement,
  decorateIcons,
} from '../../scripts/scripts.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  // document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('role', 'button');
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('role');
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }
  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

function buildMobileMenu(nav) {
  const mobileMenu = createElement('div', { class: 'nav-mobile-menu' });
  let sections = nav.querySelector('.nav-sections');
  let tools = nav.querySelector('.nav-tools');
  if (sections && tools) {
    sections = sections.cloneNode(true);
    tools = tools.cloneNode(true);
    sections.classList.add('nav-sections-mobile');
    tools.classList.add('nav-tools-mobile');
    mobileMenu.append(sections);
    mobileMenu.append(tools);
  }

  nav.append(mobileMenu);
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  block.innerHTML = '';
  // fetch nav content
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta).pathname : '/nav';
  const resp = await fetch(`${navPath}.plain.html`);

  if (resp.ok) {
    const html = await resp.text();

    // decorate nav DOM
    const nav = createElement('nav', {
      id: 'nav',
    });
    nav.innerHTML = html;

    const classes = ['brand', 'tools', 'sections'];
    classes.forEach((c, i) => {
      const section = nav.children[i];
      if (section) section.classList.add(`nav-${c}`);
    });

    const navSections = nav.querySelector('.nav-sections');
    if (navSections) {
      navSections.querySelectorAll(':scope > ul > li').forEach((navSection) => {
        const subList = navSection.querySelector('ul');
        if (subList) {
          navSection.classList.add('nav-drop');
          const sectionLink = navSection.querySelector(':scope > a');
          if (sectionLink) {
            const sectionLi = createElement('li', { class: 'nav-section-link' });
            sectionLi.append(sectionLink);
            subList.insertAdjacentElement('afterbegin', sectionLi);

            const sectionHead = createElement('span', { class: 'nav-section-heading' }, sectionLink.textContent);
            navSection.insertAdjacentElement('afterbegin', sectionHead);
          }
        }
      });
    }

    const navTools = nav.querySelector('.nav-tools');
    if (navTools) {
      navTools.querySelectorAll(':scope > ul > li').forEach((navTool) => {
        const searchIcon = navTool.querySelector('.icon-search');
        if (searchIcon) {
          navTool.classList.add('search-item');
        }
        const subList = navTool.querySelector('ul');
        if (subList) {
          navTool.classList.add('nav-drop');
        }
      });
    }

    // hamburger for mobile
    const hamburger = createElement('div', {
      class: 'nav-hamburger',
    }, createElement('button', {
      type: 'button',
      'aria-controls': 'nav',
      'aria-label': 'Open navigation',
    }, createElement('span', {
      class: 'nav-hamburger-icon',
    })));

    hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
    nav.prepend(hamburger);
    nav.setAttribute('aria-expanded', 'false');
    // prevent mobile nav behavior on window resize
    toggleMenu(nav, navSections, isDesktop.matches);
    isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

    buildMobileMenu(nav);

    wrapImgsInLinks(nav);
    decorateLinks(nav);
    decorateIcons(nav);

    nav.addEventListener('click', (e) => {
      const section = e.target.closest('.nav-drop');
      const sections = section.closest('.nav-sections, .nav-tools');
      if (section) {
        const expanded = section.getAttribute('aria-expanded') === 'true';
        toggleAllNavSections(sections);
        section.setAttribute('aria-expanded', expanded ? 'false' : 'true');

        const anyExpanded = sections.querySelector('.nav-drop[aria-expanded="true"]');
        if (anyExpanded) {
          sections.classList.add('drop-expanded');
        } else {
          sections.classList.remove('drop-expanded');
        }
      }
    });

    const navWrapper = createElement('div', {
      class: 'nav-wrapper',
    }, nav);
    block.append(navWrapper);
  }
}
