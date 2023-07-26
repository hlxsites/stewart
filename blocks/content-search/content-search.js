import { readBlockConfig } from '../../scripts/lib-franklin.js';
import { createElement } from '../../scripts/scripts.js';
import ffetch from '../../scripts/ffetch.js';

const defaultConfig = {
  insights: {
    path: '/en/insights/',
    pageSize: 10,
    headline: 'Browse All Articles',
    tag: '',
  },
};

function buildDOMStucture(cfg) {
  return [
    createElement('div', { class: 'content-search-search' }, [
      createElement('div', { class: 'content-search-search-heading' }, [
        createElement('h2', {}, cfg.headline),
      ]),
      createElement('div', { class: 'content-search-search-bar' }, [
        createElement('label', { for: 'content-search-search-input' }, 'Search Query'),
        createElement('input', { id: 'content-search-search-input', class: 'content-search-search-query' }),
        createElement('button', { type: 'submit', class: ['button', 'content-search-search-submit'] }, 'Submit'),
      ]),
    ]),
    createElement('div', { class: 'content-search-results' }, [
      createElement('div', { class: 'content-search-results-header' }, [
        createElement('span', { class: 'content-search-results-count' }),
      ]),
      createElement('div', { class: 'content-search-results-container' }, [
        createElement('div', { class: 'content-search-results-filter' }),
        createElement('div', { class: 'content-search-results-list-wrapper' }, createElement('ul', { class: 'content-search-results-list' })),
        createElement('div', { class: 'content-search-results-paging' }, createElement('ul', {}, [
          createElement('li', { class: ['content-search-results-paging-btn', 'btn-prev'] }, createElement('button')),
          createElement('li', { class: ['content-search-results-paging-item', 'item-first'] }, createElement('button')),
          createElement('li', { class: ['content-search-results-paging-item', 'item-placeholder', 'item-first-placeholder'] }, '...'),
          createElement('li', { class: ['content-search-results-paging-item', 'item-prev'] }, createElement('button')),
          createElement('li', { class: ['content-search-results-paging-item', 'item-cur'] }),
          createElement('li', { class: ['content-search-results-paging-item', 'item-next'] }, createElement('button')),
          createElement('li', { class: ['content-search-results-paging-item', 'item-placeholder', 'item-last-placeholder'] }, '...'),
          createElement('li', { class: ['content-search-results-paging-item', 'item-last'] }, createElement('button')),
          createElement('li', { class: ['content-search-results-paging-btn', 'btn-next'] }, createElement('button')),
        ])),
      ]),
    ]),
  ];
}

function execQuery(query, cfg, page) {
  const pageIdx = page - 1;
  const offset = pageIdx * cfg.pageSize;
  const limit = offset + cfg.pageSize;

  let res = ffetch('/query-index.json')
    .filter((p) => {
      if (p.path.startsWith(cfg.path)) {
        let tagMatch = true;
        let queryMatch = true;

        if (cfg.tag) {
          const tags = JSON.parse(p.tags);
          tagMatch = tags.includes(cfg.tag);
        }

        if (query) {
          const regex = new RegExp(query, 'id');
          queryMatch = regex.test(p.title) || regex.test(p.description);
        }

        return queryMatch && tagMatch;
      }

      return false;
    });

  if (pageIdx >= 0) {
    res = res.slice(offset, limit);
  }

  return res;
}

function buildPost(post) {
  const li = createElement('li', { class: 'content-search-result-item' }, [
    createElement('h4', { class: 'content-search-result-title' }, createElement('a', { href: post.path }, post.title)),
    createElement('span', { class: 'content-search-result-meta' }, `${post.date} | ${post.author}`),
    createElement('p', { class: 'content-search-result-description' }, post.description),
  ]);

  const tags = JSON.parse(post.tags);
  if (tags.length > 0) {
    li.append(createElement('span', { class: 'content-search-result-category' }, tags[0]));
  }

  return li;
}

async function updateResultCountsAndFilters(query, cfg, page, block) {
  const allResults = await execQuery(query, cfg, -1).all();

  const lastPage = Math.ceil(allResults.length / cfg.pageSize);
  block.querySelector('.content-search-results-count').textContent = `${allResults.length} Results Found`;

  const pages = block.querySelector('.content-search-results-paging > ul');

  const prevBtn = pages.querySelector('.content-search-results-paging-btn.btn-prev');
  const prevItem = pages.querySelector('.content-search-results-paging-item.item-prev');
  if (page > 1) {
    prevBtn.querySelector('button').classList.remove('disabled');
    prevItem.classList.add('remove');
    prevBtn.querySelector('button').dataset.page = page - 1;
    prevItem.querySelector('button').dataset.page = page - 1;
    prevItem.querySelector('button').textContent = page - 1;
  } else {
    prevBtn.querySelector('button').classList.add('disabled');
    prevItem.classList.add('hidden');
  }

  const nextBtn = pages.querySelector('.content-search-results-paging-btn.btn-next');
  const nextItem = pages.querySelector('.content-search-results-paging-item.item-next');
  if (page >= lastPage) {
    nextBtn.querySelector('button').classList.add('disabled');
    nextItem.classList.add('hidden');
  } else {
    nextBtn.querySelector('button').classList.remove('disabled');
    nextItem.classList.remove('hidden');
    nextBtn.querySelector('button').dataset.page = page + 1;
    nextItem.querySelector('button').dataset.page = page + 1;
    nextItem.querySelector('button').textContent = page + 1;
  }

  const firstItem = pages.querySelector('.content-search-results-paging-item.item-first');
  if (page > 2) {
    firstItem.classList.remove('hidden');
    firstItem.querySelector('button').dataset.page = 1;
    firstItem.querySelector('button').textContent = '1';
  } else {
    firstItem.classList.add('hidden');
  }

  const firstPlaceholder = pages.querySelector('.content-search-results-paging-item.item-first-placeholder');
  if (page > 3) {
    firstPlaceholder.classList.remove('hidden');
  } else {
    firstPlaceholder.classList.add('hidden');
  }

  const curItem = pages.querySelector('.content-search-results-paging-item.item-cur');
  curItem.textContent = page;

  const lastItem = pages.querySelector('.content-search-results-paging-item.item-last');

  if (page < (lastPage - 1)) {
    lastItem.classList.remove('hidden');
    lastItem.querySelector('button').dataset.page = lastPage;
    lastItem.querySelector('button').textContent = lastPage;
  } else {
    lastItem.classList.add('hidden');
  }

  const lastPlaceholder = pages.querySelector('.content-search-results-paging-item.item-last-placeholder');
  if (page < (lastPage - 2)) {
    lastPlaceholder.classList.remove('hidden');
  } else {
    lastPlaceholder.classList.add('hidden');
  }
}

async function populateSearchResults(cfg, block, page) {
  const query = block.querySelector('.content-search-search-query').value;
  const results = execQuery(query, cfg, page);

  const ul = block.querySelector('.content-search-results-list');
  ul.innerHTML = '';
  // eslint-disable-next-line no-restricted-syntax
  for await (const post of results) {
    ul.append(buildPost(post));
  }

  updateResultCountsAndFilters(query, cfg, page, block);
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const variant = Object.keys(defaultConfig).find((varName) => block.classList.contains(varName));
  if (variant) {
    Object.keys(defaultConfig[variant]).forEach((key) => {
      if (!cfg[key]) {
        cfg[key] = defaultConfig[variant][key];
      }
    });
  }

  block.innerHTML = '';
  block.append(...buildDOMStucture(cfg));

  const usp = new URLSearchParams(window.location.search);
  const q = usp.get('q');
  if (q) {
    block.querySelector('.content-search-search-query').value = q;
  }

  await populateSearchResults(cfg, block, 1);

  block.querySelector('.content-search-search-submit').addEventListener('click', () => {
    populateSearchResults(cfg, block, 1);
  });

  block.querySelectorAll('.content-search-results-paging-btn, .content-search-results-paging-item').forEach((pg) => {
    const btn = pg.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        if (!btn.classList.contains('disabled') && btn.dataset.page) {
          populateSearchResults(cfg, block, Number(btn.dataset.page));
        }
      });
    }
  });
}
