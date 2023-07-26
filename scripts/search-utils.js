import { createElement, fetchNavigationHTML } from './scripts.js';
import { fetchPlaceholders } from './lib-franklin.js';

const getSearchFormAction = async () => {
  const navHTML = await fetchNavigationHTML();
  const navElement = document.createElement('nav');
  navElement.innerHTML = navHTML;
  const links = navElement.querySelectorAll('li > a');
  return [...links].find((link) => link.innerHTML.toLowerCase().includes('search') || link.innerHTML.toLowerCase().includes('icon-far-search')).getAttribute('href');
};

const SearchConstants = {
  QUERY_INDEX: '/query-index.json',
  DEFAULT_LIMIT: 20,
};

const createSearchForm = async ({ type }) => {
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

export {
  createSearchForm,
  SearchConstants,
};
