import { createElement, fetchNavigationHTML } from './scripts.js';
import { fetchPlaceholders, readBlockConfig } from './lib-franklin.js';

const getSearchFormAction = async () => {
  const navHTML = await fetchNavigationHTML();
  const navElement = document.createElement('nav');
  navElement.innerHTML = navHTML;
  const links = navElement.querySelectorAll('li > a');
  return [...links].find((link) => link.innerHTML.toLowerCase().includes('search') || link.innerHTML.toLowerCase().includes('icon-far-search')).getAttribute('href');
};

const SearchConfigs = {
  default: {
    path: '/',
    tagFacet: false,
    queryIndex: '/query-index.json',
    'page-size': 10,
  },
  insights: {
    path: '/en/insights/',
    queryIndex: '/query-index.json',
    tagFacet: true,
    'page-size': 10,
  },
  news: {
    path: '/en/news/press-releases/',
    tagFacet: false,
    queryIndex: '/query-index.json',
    'page-size': 10,
  },
};

export const getSearchConfig = (block) => {
  const cfg = readBlockConfig(block);
  const variant = Object.keys(SearchConfigs).find((varName) => block.classList.contains(varName)) || 'default';
  Object.keys(SearchConfigs[variant]).forEach((key) => {
    if (!cfg[key]) {
      cfg[key] = SearchConfigs[variant][key];
    }
  });

  return cfg;
};

export const createSearchForm = async ({ type }) => {
  const searchFormAction = await getSearchFormAction();
  const formAction = new URL(searchFormAction).pathname;
  const placeholders = await fetchPlaceholders();
  const { searchButtonText, searchFieldPlaceholder } = placeholders;

  const buttonHTML = {
    default: `<span>${searchButtonText || 'Search'}</span>`,
    minimal: '<span class="fa-icon far fa-search"></span>',
  };

  const uuid = Math.random().toString(36).slice(-6);

  const formElement = createElement('div', {
    class: 'search-form-container',
  }, createElement('form', {
    action: formAction,
    class: ['search-form', type],
    role: 'search',
  }, `<label class="search-label" for="searchbox-${uuid}"></label>
          <input type="search" name="q" id="searchbox-${uuid}" required placeholder="${searchFieldPlaceholder || 'Enter a search term...'}">
            <button class="search-form-button" type="submit">
              ${buttonHTML[type]}
            </button>`));

  return formElement;
};
