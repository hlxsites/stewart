import {
  createSearchForm,
  getSearchConfig,
  queryIndexPath,
  generatePaginationData,
  createPaginationButton,
} from '../../scripts/search-utils.js';
import ffetch from '../../scripts/ffetch.js';
import { createElement, addQueryParamToURL, getQueryParamFromURL } from '../../scripts/scripts.js';
import { toClassName, sampleRUM, fetchPlaceholders } from '../../scripts/lib-franklin.js';
import { getTaxonomy } from '../../scripts/taxonomy.js';

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

const placeholders = await fetchPlaceholders();
const {
  filterBy,
  contentTypes,
  searchResultsPagination,
  resultsFound,
} = placeholders;

const setupSearchForm = async (block) => {
  block.append(await createSearchForm({ type: 'default' }));
  const searchInput = block.querySelector('.search-form input[type="search"]');
  searchInput.value = getQueryParamFromURL('q') || '';
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

export const fetchResults = (cfg, query, tag, pageNum) => {
  const results = ffetch(queryIndexPath)
    .sheet(cfg.sheet || '')
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

const buildFacets = async (filteredResults, block, cfg, q, selectedTag) => {
  const filterContainer = block.querySelector(`.${classNames.searchResultsFilterContainer}`);

  const taxonomy = await getTaxonomy();
  const facetPath = cfg.tagFacet;
  const contentTypeTags = new Set();
  const recurse = (data) => {
    if (data.path && data.path.startsWith(facetPath)) {
      contentTypeTags.add(data.title);
    }

    Object.keys(data).forEach((key) => {
      if (!['title', 'name', 'path', 'hide'].includes(key)) {
        recurse(data[key]);
      }
    });
  };
  recurse(taxonomy);

  const tagData = {};
  filteredResults.forEach((page) => {
    JSON.parse(page.tags).forEach((tag) => {
      if (contentTypeTags.has(tag)) {
        let tagCount = tagData[tag];
        if (tagCount) {
          tagCount += 1;
        } else {
          tagCount = 1;
        }
        tagData[tag] = tagCount;
      }
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

  if (searchTerm) {
    block.querySelector('.search-results-term').textContent = `"${searchTerm}"`;
    block.querySelector('.search-results-term').parentElement.style.display = null;
  } else {
    block.querySelector('.search-results-term').parentElement.style.display = 'none';
  }
};

function renderSearchResultsScaffolding() {
  return createElement('div', { class: classNames.searchResultsData }, [
    createElement('div', { class: classNames.searchResultsInfo }, [
      createElement('h2', {}, 'Search results for <span class="search-results-term"></span>'),
      createElement('h3', { class: 'search-result-count' }),
    ]),
    createElement('div', { class: classNames.searchResultsFilterContainer }, [
      createElement('h4', { class: 'search-results-filterby' }, filterBy || 'Filter By:'),
      createElement('div', { class: 'search-results-facet-container', 'aria-expanded': 'false' }, [
        createElement('h5', {}, contentTypes || 'Content Types'),
        createElement('ul'),
      ]),
    ]),
    createElement('div', { class: classNames.searchResultsListContainer }, [
      createElement('ul', { class: classNames.searchResultsDataList }),
      createElement('nav', { class: classNames.searchResultsNav, 'aria-label': searchResultsPagination || 'Search Results Pagination' }, [
        createElement('ul', { class: classNames.searchResultsPagination }),
      ]),
    ]),
  ]);
}

async function renderSearchResults(block, cfg, q, tag, page, partial = false) {
  const pageNum = Number(page);
  const resultsForPage = fetchResults(cfg, q, tag, pageNum);
  await renderResults(block, resultsForPage, q);

  if (q && pageNum === 1 && !tag) {
    // only sample rum on initial search, not paging or tagging
    sampleRUM('search', { source: '.search-form .search-input', target: q });
  }

  const allResults = fetchResults(cfg, q, tag, -1);
  allResults.all().then((resArray) => {
    const allResCount = resArray.length;
    block.setAttribute('data-result-count', allResCount);
    const resultsPerPage = Number(cfg['page-size']);

    if (q && pageNum === 1 && !tag && allResCount === 0) {
      // only sample rum on initial search, not paging or tagging
      sampleRUM('searchnull', { source: '.search-form .search-input', target: q });
    }

    if (!partial) {
      block.querySelector('.search-result-count').textContent = `${allResCount} ${resultsFound || 'Results Found'}`;
      if (cfg.tagFacet) {
        buildFacets(resArray, block, cfg, q, tag);
      }
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
  block.innerHTML = '';

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
