import { createSearchForm, getSearchConfig } from '../../scripts/search-utils.js';
import ffetch from '../../scripts/ffetch.js';
import { createElement } from '../../scripts/scripts.js';
import { toClassName } from '../../scripts/lib-franklin.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

const blockName = 'search-results';

const classNames = {
  searchResultsData: `${blockName}-container`,
  searchResultsListContainer: `${blockName}-list-container`,
  searchResultsFilterContainer: `${blockName}-filter-container`,
  searchResultsInfo: `${blockName}-info-container`,
  searchResultsDataList: `${blockName}-data-list`,
  searchResultsNav: `${blockName}-nav`,
  searchResultsPagination: `${blockName}-pagination`,
  searchResultsPaginationItem: `${blockName}-pagination-item`,
  searchResultsPaginationButton: `${blockName}-pagination-button`,
};

const resetBlock = (block) => {
  block.innerHTML = '';
};

const generatePaginationData = (currentPage, totalPages) => {
  if (!currentPage || !totalPages) {
    return null;
  }

  const prev = currentPage === 1 ? null : currentPage - 1;
  const next = currentPage === totalPages ? null : currentPage + 1;
  const items = [1];

  if (currentPage === 1 && totalPages === 1) {
    return items;
  }

  if (currentPage > 3) {
    items.push('…');
  }

  const pageOffset = 1;
  const offsetLeft = currentPage - pageOffset;
  const offsetRight = currentPage + pageOffset;

  for (let i = offsetLeft > 2 ? offsetLeft : 2; i <= Math.min(totalPages, offsetRight); i += 1) {
    items.push(i);
  }

  if (offsetRight + 1 < totalPages) {
    items.push('…');
  }

  if (offsetRight < totalPages) {
    items.push(totalPages);
  }

  if (next) {
    items.push('>');
  }

  if (prev) {
    items.unshift('<');
  }

  return items;
};

const addQueryParamToURL = (key, value) => {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState({}, '', url.toString());
};

const getQueryParamFromURL = (key) => {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) || '';
};

const setupSearchForm = async (block) => {
  block.append(await createSearchForm({ type: 'default' }));
  const searchInput = block.querySelector('.search-form input[type="search"]');
  searchInput.value = getQueryParamFromURL('q') || '';
};

const createPaginationButton = (page, currentPage) => {
  const pageLookup = {
    '>': {
      value: currentPage + 1,
      text: '<span class="fa-icon far fa-chevron-right"></span>',
      cssClass: 'arrow',
      ariaLabel: 'Next page',
    },
    '<': {
      cssClass: 'arrow',
      value: currentPage - 1,
      text: '<span class="fa-icon far fa-chevron-left"></span>',
      ariaLabel: 'Previous page',
    },
    default: {
      cssClass: '',
      value: page,
      text: page,
      ariaLabel: `Page ${page}`,
    },
  };

  const item = pageLookup[page] || pageLookup.default;

  const {
    value,
    text,
    cssClass,
    ariaLabel,
  } = item;

  const isActive = currentPage === page;

  const markup = `<li class="${classNames.searchResultsPaginationItem}">
    <button class="${classNames.searchResultsPaginationButton} ${isActive ? 'active' : ''} ${cssClass}" data-page="${value}" aria-label="Go to ${ariaLabel}" ${isActive ? 'aria-current="page" aria-selected="true"' : ''} role="button">
      ${text}
    </button>
  </li>`;

  return markup;
};

const createResultItem = (entry) => {
  const item = createElement('li', {}, [
    createElement('h4', {}, [
      createElement('a', { href: entry.path }, entry.title),
    ]),
    createElement('p', {}, entry.description),
  ]);

  if (entry.date) {
    const dateinMs = Number(entry.date) * 1000;
    const postDate = new Date(dateinMs);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = postDate.toLocaleDateString('en-us', options);
    const dateAuthor = createElement('span', {}, dateStr);
    if (entry.author) {
      dateAuthor.innerHTML += ` | ${entry.author}`;
    }
    item.querySelector('h4').insertAdjacentElement('afterend', dateAuthor);
  }

  return item;
};

const createPagination = (paginationArray, currentPage) => paginationArray.map((page) => createPaginationButton(page, currentPage)).join('');

const fetchResults = (cfg, query, tag, pageNum) => {
  const results = ffetch(cfg.queryIndex)
    .filter((entry) => {
      if (entry.path.startsWith(cfg.path)) {
        let tagMatch = true;
        let queryMatch = true;

        const tags = JSON.parse(entry.tags);
        if (cfg.tag) {
          tagMatch = tags.includes(cfg.tag);
        }

        if (tag) {
          tagMatch = tagMatch && tags.includes(tag);
        }

        if (query) {
          const regex = new RegExp(query, 'id');
          queryMatch = regex.test(entry.title) || regex.test(entry.description);
        }

        return queryMatch && tagMatch;
      }

      return false;
    });

  if (pageNum < 1) {
    return results;
  }

  const resultsPerPage = Number(cfg['page-size']);
  const offset = (pageNum - 1) * resultsPerPage;
  return results.slice(offset, offset + resultsPerPage);
};

const buildFacets = (filteredResults, block, cfg, q, selectedTag) => {
  const filterContainer = block.querySelector(`.${classNames.searchResultsFilterContainer}`);

  const tagData = {};
  filteredResults.forEach((page) => {
    JSON.parse(page.tags).forEach((tag) => {
      let tagCount = tagData[tag];
      if (tagCount) {
        tagCount += 1;
      } else {
        tagCount = 1;
      }
      tagData[tag] = tagCount;
    });
  });

  const sortedKeys = Object.keys(tagData).sort((keyA, keyB) => {
    const countA = tagData[keyA];
    const countB = tagData[keyB];

    return countB - countA;
  });

  filterContainer.querySelector('ul').replaceChildren(...sortedKeys.map((tagName) => createElement('li', {}, [
    createElement('input', {
      type: 'checkbox',
      name: 'content-types',
      title: tagName,
      value: tagName,
      id: `${toClassName(tagName)}-facet-input`,
    }),
    createElement('label', {
      for: `${toClassName(tagName)}-facet-input`,
    }, `${tagName} (${tagData[tagName]})`),
  ])));

  if (selectedTag) {
    const tagCbx = filterContainer.querySelector(`input[value="${selectedTag}"]`);
    if (tagCbx) tagCbx.checked = true;
  }

  const allCheckBoxes = filterContainer.querySelectorAll('input');

  allCheckBoxes.forEach((cbx) => {
    cbx.addEventListener('change', () => {
      allCheckBoxes.forEach((otherCbx) => {
        if (otherCbx !== cbx) otherCbx.checked = false;
      });

      // eslint-disable-next-line no-use-before-define
      renderSearchResults(block, cfg, q, cbx.checked ? cbx.value : '', '1').then(() => {
        block.scrollIntoView({
          behavior: 'smooth',
        });
      });
    });
  });
};

const renderResults = async (block, filteredResults, searchTerm) => {
  const resultsUl = block.querySelector('.search-results-data-list');
  resultsUl.innerHTML = '';
  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of filteredResults) {
    const li = createResultItem(entry);
    resultsUl.append(li);
  }

  block.querySelector('.search-results-term').textContent = `"${searchTerm}"`;
};

function renderSearchResultsScaffolding() {
  return createElement('div', { class: classNames.searchResultsData }, [
    createElement('div', { class: classNames.searchResultsInfo }, [
      createElement('h2', {}, 'Search results for <span class="search-results-term"></span>'),
      createElement('h3', { class: 'search-result-count' }),
    ]),
    createElement('div', { class: classNames.searchResultsFilterContainer }, [
      createElement('h4', { class: 'search-results-filterby' }, 'Filter By:'),
      createElement('div', { class: 'search-results-facet-container', 'aria-expanded': 'false' }, [
        createElement('h5', {}, 'Content Types'),
        createElement('ul'),
      ]),
    ]),
    createElement('div', { class: classNames.searchResultsListContainer }, [
      createElement('ul', { class: classNames.searchResultsDataList }),
      createElement('nav', { class: classNames.searchResultsNav, 'aria-label': 'Search Results Pagination' }, [
        createElement('ul', { class: classNames.searchResultsPagination }),
      ]),
    ]),
  ]);
}

async function renderSearchResults(block, cfg, q, tag, page, partial = false) {
  const pageNum = Number(page);
  const resultsForPage = fetchResults(cfg, q, tag, pageNum);
  await renderResults(block, resultsForPage, q);

  const allResults = fetchResults(cfg, q, tag, -1);
  allResults.all().then((resArray) => {
    const allResCount = resArray.length;
    block.setAttribute('data-result-count', allResCount);
    const resultsPerPage = Number(cfg['page-size']);

    if (!partial) {
      block.querySelector('.search-result-count').textContent = `${allResCount} Results Found`;
      buildFacets(resArray, block, cfg, q, tag);
    }

    const totalPages = Math.ceil(allResCount / resultsPerPage);
    const paginationContainer = block.querySelector(`.${classNames.searchResultsNav} > .${classNames.searchResultsPagination}`);
    if (totalPages > 1) {
      const paginationArray = generatePaginationData(pageNum, totalPages);
      paginationContainer.innerHTML = createPagination(paginationArray, pageNum);
    } else {
      paginationContainer.innerHTML = '';
    }
  });
}

export default async function decorate(block) {
  const cfg = getSearchConfig(block);
  resetBlock(block);

  if (cfg.tagFacet) {
    block.classList.add('tag-facet');
  }
  await setupSearchForm(block);
  const form = block.querySelector('form.search-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // update results, preserve tag facet if present
    const searchTerm = form.querySelector('input[name="q"').value;
    renderSearchResults(block, cfg, searchTerm, '', '1');
    addQueryParamToURL('page', '1');
    addQueryParamToURL('q', searchTerm);
  });

  block.append(renderSearchResultsScaffolding());

  const usp = new URLSearchParams(window.location.search);
  const q = usp.get('q') || '';
  const page = usp.get('page') || '1';
  await renderSearchResults(block, cfg, q, '', page);

  const filterContainer = block.querySelector(`.${classNames.searchResultsFilterContainer}`);
  const facetContainer = filterContainer.querySelector('.search-results-facet-container');

  filterContainer.querySelector('.search-results-filterby').addEventListener('click', () => {
    if (isDesktop.matches) {
      return;
    }
    const expanded = facetContainer.getAttribute('aria-expanded') === 'true';
    facetContainer.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      facetContainer.setAttribute('aria-expanded', 'true');
    } else {
      facetContainer.setAttribute('aria-expanded', 'false');
    }
  });
  if (isDesktop.matches) {
    facetContainer.setAttribute('aria-expanded', 'true');
  }

  const pager = block.querySelector(`.${classNames.searchResultsPagination}`);
  pager.addEventListener('click', (event) => {
    const { target } = event;
    const shouldUpdate = (target.matches('button') || target.matches('span.fa-icon')) && target.dataset.page !== '…';

    if (shouldUpdate) {
      const newPage = target.matches('span.fa-icon') ? Number(target.parentElement.dataset.page) : Number(target.dataset.page);
      const curPage = Number(pager.querySelector('.search-results-pagination-button.active').dataset.page);
      if (newPage !== curPage) {
        const searchTerm = form.querySelector('input[name="q"').value;
        renderSearchResults(block, cfg, searchTerm, '', newPage, true).then(() => {
          block.scrollIntoView({
            behavior: 'smooth',
          });
        });
        addQueryParamToURL('page', newPage);
      }
    }
  });
}
