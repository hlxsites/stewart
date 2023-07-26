import { readBlockConfig, toCamelCase } from '../../scripts/lib-franklin.js';
import { createSearchForm, SearchConstants } from '../../scripts/search-utils.js';
import ffetch from '../../scripts/ffetch.js';

const blockName = 'search-results';

const classNames = {
  searchResultsData: `${blockName}-data`,
  searchResultsDataList: `${blockName}-data-list`,
  searchResultsNav: `${blockName}-nav`,
  searchResultsPagination: `${blockName}-pagination`,
  searchResultsPaginationItem: `${blockName}-pagination-item`,
  searchResultsPaginationButton: `${blockName}-pagination-button`,
};

const resetBlock = (block) => {
  block.innerHTML = '';
};

const setBlockConfig = (block) => {
  const config = readBlockConfig(block);

  Object.keys(config).forEach((key) => {
    block.dataset[toCamelCase(key)] = config[key];
  });
};

const getSearchParams = (searchParams) => {
  const currentPageParam = new URLSearchParams(searchParams).get('page');
  const searchTerm = new URLSearchParams(searchParams).get('q');
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
  const markup = `<li><h4><a href="${entry.path}">${entry.title}</a></h4>${entry.description}</li>`;
  return markup;
};

const createResultsPerPage = (currentPage, results, resultsPerPage) => {
  const markup = `${results.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage).map((entry) => createResultItem(entry)).join('')}`;
  return markup;
};

const createPagination = (paginationArray, currentPage) => paginationArray.map((page) => createPaginationButton(page, currentPage)).join('');

const createResultsContainer = () => {
  const resultsContainer = document.createElement('div');
  resultsContainer.classList.add(classNames.searchResultsData);
  return resultsContainer;
};

const fetchResults = async () => ffetch(SearchConstants.QUERY_INDEX).all();

const renderResults = (block, results, searchTerm, resultsPerPage) => {
  let currentPage = Number(getQueryParamFromURL('page')) || 1;
  const filteredResults = results.filter((entry) => `${entry.title} ${entry.description}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredResultsSize = filteredResults.length;
  const resultsContainer = createResultsContainer();
  const perPage = parseInt(resultsPerPage || SearchConstants.DEFAULT_LIMIT, 10);
  const totalPages = Math.ceil(filteredResults.length / perPage);

  resultsContainer.innerHTML = `<h2>Search results for "${searchTerm}"</h2>
    <h3>${filteredResultsSize} ${filteredResultsSize > 1 ? 'results' : 'result'} found</h3>
    <ul class="${classNames.searchResultsDataList}">
      ${createResultsPerPage(currentPage, filteredResults, perPage)}
    </ul>
    <nav class="${classNames.searchResultsNav}" aria-label="${classNames.searchResultsPagination}">
      <ul class="${classNames.searchResultsPagination}"></ul>
    </nav>`;

  block.append(resultsContainer);

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
        searchUl.innerHTML = createResultsPerPage(currentPage, filteredResults, perPage);
        resultsContainer.scrollIntoView();
      }
    });
  }
};

export default async function decorate(block) {
  setBlockConfig(block);
  resetBlock(block);
  await setupSearchForm(block);

  const { searchTerm } = getSearchParams(window.location.search);
  const { dataset: { resultsPerPage } } = block;

  const results = await fetchResults();
  renderResults(block, results, searchTerm, resultsPerPage);
}
