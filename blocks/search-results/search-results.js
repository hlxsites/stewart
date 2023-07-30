import { createSearchForm, getSearchConfig } from '../../scripts/search-utils.js';
import ffetch from '../../scripts/ffetch.js';
import { createElement } from '../../scripts/scripts.js';
import { toClassName } from '../../scripts/lib-franklin.js';

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

const getSearchParams = (searchParams) => {
  const currentPageParam = new URLSearchParams(searchParams).get('page');
  const searchTerm = new URLSearchParams(searchParams).get('q') || '';
  const currentPage = !currentPageParam ? 1 : parseInt(currentPageParam, 10);

  return {
    searchTerm,
    currentPage,
  };
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

const createResultsPerPage = (currentPage, results, resultsPerPage) => {
  const elements = results.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
    .map((entry) => createResultItem(entry));
  return elements;
};

const createPagination = (paginationArray, currentPage) => paginationArray.map((page) => createPaginationButton(page, currentPage)).join('');

const createResultsContainer = () => {
  const resultsContainer = document.createElement('div');
  resultsContainer.classList.add(classNames.searchResultsData);
  return resultsContainer;
};

const fetchResults = async (cfg, query) => {
  const results = ffetch(cfg.queryIndex)
    .filter((page) => {
      if (page.path.startsWith(cfg.path)) {
        let tagMatch = true;
        let queryMatch = true;

        if (cfg.tag) {
          const tags = JSON.parse(page.tags);
          tagMatch = tags.includes(cfg.tag);
        }

        if (query) {
          const regex = new RegExp(query, 'id');
          queryMatch = regex.test(page.title) || regex.test(page.description);
        }

        return queryMatch && tagMatch;
      }

      return false;
    });

  return results.all();
};

const buildFacets = (filteredResults, filterContainer) => {
  filterContainer.append(createElement('h4', { class: 'search-results-filterby' }, 'Filter By:'));
  filterContainer.append(createElement('div', { class: 'search-results-facet-container', 'aria-expanded': 'false' }, [
    createElement('h5', {}, 'Content Types'),
    createElement('ul'),
  ]));

  filterContainer.querySelector('.search-results-filterby').addEventListener('click', () => {
    const facetContainer = filterContainer.querySelector('.search-results-facet-container');
    const expanded = facetContainer.getAttribute('aria-expanded') === 'true';
    filterContainer.querySelector('.search-results-facet-container').setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

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

  filterContainer.querySelector('ul').replaceChildren(...Object.keys(tagData).map((tagName) => createElement('li', {}, [
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

  filterContainer.querySelectorAll('input').forEach((cbx) => {
    cbx.addEventListener('change', () => {
      // todo update results
    });
  });
};

const renderResults = (block, filteredResults, searchTerm, cfg) => {
  const resultsPerPage = Number(cfg['page-size']);
  let currentPage = Number(getQueryParamFromURL('page')) || 1;
  const filteredResultsSize = filteredResults.length;
  const resultsContainer = createResultsContainer();
  const perPage = parseInt(resultsPerPage, 10);
  const totalPages = Math.ceil(filteredResults.length / perPage);

  resultsContainer.innerHTML = `
    <div class="${classNames.searchResultsInfo}">
      <h2>Search results for "${searchTerm}"</h2>
      <h3>${filteredResultsSize} ${filteredResultsSize > 1 ? 'results' : 'result'} found</h3>
    </div>
    <div class="${classNames.searchResultsFilterContainer}"></div>
    <div class="${classNames.searchResultsListContainer}">
      <ul class="${classNames.searchResultsDataList}">
      </ul>
      <nav class="${classNames.searchResultsNav}" aria-label="${classNames.searchResultsPagination}">
        <ul class="${classNames.searchResultsPagination}"></ul>
      </nav>
    </div>`;

  const results = createResultsPerPage(currentPage, filteredResults, perPage);
  resultsContainer.querySelector(`.${classNames.searchResultsDataList}`).replaceChildren(...results);

  block.append(resultsContainer);

  if (cfg.tagFacet) {
    buildFacets(filteredResults, resultsContainer.querySelector(`.${classNames.searchResultsFilterContainer}`));
  }

  const hasPages = totalPages > 1;

  if (hasPages) {
    let paginationArray = generatePaginationData(currentPage, totalPages);
    const paginationContainer = resultsContainer.querySelector(`.${classNames.searchResultsNav} > .${classNames.searchResultsPagination}`);
    paginationContainer.innerHTML = createPagination(paginationArray, currentPage);

    const paginationList = resultsContainer.querySelector(`.${classNames.searchResultsPagination}`);
    const searchUl = resultsContainer.querySelector(`.${classNames.searchResultsDataList}`);
    const paginationButtons = resultsContainer.querySelectorAll(`.${classNames.searchResultsPaginationButton}`);

    paginationList.addEventListener('click', (event) => {
      const { target } = event;
      const shouldUpdate = (target.matches('button') || target.matches('span.fa-icon')) && target.dataset.page !== '…';

      if (shouldUpdate) {
        currentPage = target.matches('span.fa-icon') ? Number(target.parentElement.dataset.page) : Number(target.dataset.page);
        [...paginationButtons].forEach((button) => button.classList.remove('active'));
        paginationArray = generatePaginationData(currentPage, totalPages);
        paginationContainer.innerHTML = createPagination(paginationArray, currentPage);
        target.classList.add('active');
        addQueryParamToURL('page', currentPage);
        const newResults = createResultsPerPage(currentPage, filteredResults, perPage);
        searchUl.replaceChildren(...newResults);
        resultsContainer.scrollIntoView();
      }
    });
  }
};

export default async function decorate(block) {
  const cfg = getSearchConfig(block);
  resetBlock(block);

  if (cfg.tagFacet) {
    block.classList.add('tag-facet');
  }
  await setupSearchForm(block);

  const { searchTerm } = getSearchParams(window.location.search);

  const results = await fetchResults(cfg, searchTerm);
  renderResults(block, results, searchTerm, cfg);
}
