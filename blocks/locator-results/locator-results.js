import { loadScript, fetchPlaceholders, readBlockConfig } from '../../scripts/lib-franklin.js';
import { getOfficeListings } from '../../scripts/esb-api-utils.js';
import { createElement, addQueryParamToURL, getQueryParamFromURL } from '../../scripts/scripts.js';
import { generatePaginationData, createPaginationButton } from '../../scripts/search-utils.js';
import {
  classes,
  officeLocatorResultFilters,
  officeLocatorViewOptions,
  BING_MAPS_API_KEY,
  BING_MAPS_BASE_URL,
} from './utils/constants.js';

const {
  stewartOffice,
  independentAgency,
  locatorResultsLoadingText,
  agenciesFound,
  officeLocations,
  locatorSearchErrorText,
  tryAgainLater,
  noLocationsFound,
  expandSearchCriteria,
  mailingShippingAddress,
  underwriter,
  serviceState,
  details,
} = await fetchPlaceholders();

const textValues = {
  stewartOffice: stewartOffice || 'Stewart Office',
  independentAgency: independentAgency || 'Independent Agency',
  resultsLoading: locatorResultsLoadingText || 'Searching through our vast network of locations...',
  officeLocations: async (isAgencyLocator) => (isAgencyLocator ? agenciesFound || 'Agencies Found' : officeLocations || 'Office Locations'),
  errorFetchingResults: locatorSearchErrorText || 'There was an error fetching the results.',
  tryAgainLater: tryAgainLater || 'Please try again later.',
  noResultsFound: noLocationsFound || 'No locations found.',
  expandSearchCriteria: expandSearchCriteria || 'Try expanding your search criteria.',
  mailingShippingAddress: mailingShippingAddress || 'Mailing/Shipping Address',
  underWriter: underwriter || 'Underwriter',
  serviceState: serviceState || 'Service State',
  details: details || 'Details',
  maps: {
    map: 'Map',
    googleMapsBaseUrl: 'https://www.google.com/maps/place',
  },
};

let currentListings = [];

/**
 * Creates a fontawesome icon.
 * @param {String} iconName the fontawesome icon name.
 * @param {Array<String>} additionalClasses the classes to add to the icon.
 * @returns an icon element.
 */
const renderIcon = (iconName, additionalClasses) => createElement('i', { class: ['fal', `fa-${iconName}`, ...additionalClasses || []] });

/**
 * Creates a button for the search bar view filter.
 * @param {String} buttonName
 * @returns {HTMLElement} the button containing the icon.
 */
const renderViewFilterButton = (buttonName) => createElement('button', {
  class: ['button', 'secondary', classes.searchBarFilterButton],
  'data-filter': buttonName,
}, renderIcon(buttonName));

/**
 * Creates the search results container
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @returns {HTMLElement} the search results container.
 */
const renderSearchResultsContainer = (isAgencyLocator) => createElement('div', { class: classes.resultsContainer }, [
  createElement('ul', { class: classes.resultsList }),
  ...!isAgencyLocator ? [createElement('div', { class: classes.mapContainer })] : [],
]);

/**
 * Creates the search bar
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @returns {HTMLElement} the search bar.
 */
const renderSearchBar = (isAgencyLocator) => createElement(
  'div',
  { class: [classes.searchBar, 'hide'] },
  [
    createElement('div', { class: 'section' }, [
      createElement('h2', { class: classes.title }, textValues.resultsLoading),
      createElement('h3', { class: classes.subTitle }),
      createElement('div', { class: classes.loader }, renderIcon('spinner', ['fa-spin'])),
      createElement('div', { class: classes.searchBarActions }, [
        ...!isAgencyLocator ? [createElement('div', { class: classes.searchBarFilter }, Object.entries(officeLocatorResultFilters)
          .map(
            (filterItem) => createElement('button', { class: ['button', 'secondary', classes.searchBarFilterButton], 'data-filter': filterItem[1].id }, [
              createElement('span', {}, filterItem[1].label),
              createElement('span', { class: classes.searchBarFilterCount }),
            ]),
          ))] : [],
        ...!isAgencyLocator ? [createElement('div', { class: classes.searchBarViewFilter }, Object
          .entries(officeLocatorViewOptions)
          .map((viewItem) => renderViewFilterButton(viewItem[0]))),
        ] : [],
        createElement('nav', { class: [classes.searchBarPagination, 'search-results-pagination', 'dark-bg'], 'aria-label': 'Search results pagination' }),
      ]),
    ]),
  ],
);

/**
 * Handles click events once a map marker is visible.
 * Used to close the infobox when the X icon is clicked.
 * @param {Event} e
 */
const handleMapMarkerInfoBoxClick = (e) => {
  const isCloseAction = e.originalEvent.target.className === 'close-button' || e.originalEvent.target.className === 'fal fa-times';

  if (isCloseAction) {
    e.target.setOptions({ visible: false });
  }
};

/**
 *
 * @param {Event} e the event.
 * @param {Object} listing the listing data.
 * @param {*} infobox the infobox.
 * @param {*} map the map.
 */
const handleMapMarkerClick = (e, listing, infobox, map) => {
  const shouldSetOptions = e.target.metadata && e.targetType === 'pushpin';

  if (shouldSetOptions) {
    // eslint-disable-next-line no-use-before-define
    const listingElement = createListing(listing, false, true);
    const closeButton = createElement('button', { class: 'close-button' }, renderIcon('times'));
    listingElement.appendChild(closeButton);

    infobox.setOptions({
      location: e.target.getLocation(),
      visible: true,
      htmlContent: listingElement.outerHTML,
    });

    // eslint-disable-next-line no-undef
    Microsoft.Maps.Events.addHandler(infobox, 'click', handleMapMarkerInfoBoxClick);

    map.setView({ center: e.target.getLocation() });
  }
};

/**
 * Customizes the cluster pin.
 * @param {Object} cluster the bing map pin cluster.
 */
const customizeClusterPin = (cluster) => {
  const isAgencyCluster = (pin) => pin.metadata.AgentType === 'I';

  const colorLookup = {
    agency: {
      condition: cluster.containedPushpins.every((pin) => isAgencyCluster(pin)),
      color: 'purple',
    },
    office: {
      condition: cluster.containedPushpins.every((pin) => !isAgencyCluster(pin)),
      color: 'teal',
    },
    agencyAndOffice: {
      condition: cluster.containedPushpins.some((pin) => !isAgencyCluster(pin))
        && cluster.containedPushpins.some((pin) => !isAgencyCluster(pin)),
      color: '#3a3a3a',
    },
  };

  const { color } = Object.values(colorLookup).find((item) => item.condition);

  cluster.setOptions({
    color,
  });
};

/**
 * populates markers on the map with the listings.
 */
const populateMapMarkers = () => {
  /* eslint-disable no-undef */
  const map = new Microsoft.Maps.Map(`.${classes.mapContainer}`, {
    credentials: BING_MAPS_API_KEY,
  });

  const infobox = new Microsoft.Maps.Infobox(map.getCenter(), {
    visible: false,
  });

  infobox.setMap(map);
  const pins = [];
  const pinLocations = [];

  currentListings.forEach((listing) => {
    const { Latitude, Longitude } = listing;
    const isAgency = listing.AgentType === 'I';

    if (Latitude && Longitude) {
      const pinLocation = new Microsoft.Maps.Location(Latitude, Longitude);
      pinLocations.push(pinLocation);
      const pin = new Microsoft.Maps.Pushpin(pinLocation, {
        color: isAgency ? 'purple' : 'teal',
      });

      map.setView({ center: pinLocation });

      pin.metadata = listing;

      Microsoft.Maps.Events.addHandler(pin, 'click', (e) => handleMapMarkerClick(e, listing, infobox, map));
      pins.push(pin);
    }
  });

  Microsoft.Maps.loadModule('Microsoft.Maps.Clustering', () => {
    const clusterLayer = new Microsoft.Maps.ClusterLayer(pins, {
      clusteredPinCallback: (cluster) => customizeClusterPin(cluster),
    });

    map.layers.insert(clusterLayer);
  });

  const bounds = Microsoft.Maps.LocationRect.fromLocations(pinLocations);
  map.setView({
    bounds,
    zoom: 500,
  });

  map.setOptions({
    disableScrollWheelZoom: true,
    disableStreetside: true,
  });
};

/**
 * @param {Array<Object>} listings the data.
 * @param {String} filter the filter.
 * @returns a filtered set of listings.
 */
const getFilteredResults = (listings, filter) => {
  const officeLookup = {
    [officeLocatorResultFilters.all.id]: listings,
    [officeLocatorResultFilters.offices.id]: listings.filter((listing) => listing.AgentType !== 'I'),
    [officeLocatorResultFilters.agencies.id]: listings.filter((listing) => listing.AgentType === 'I'),
  };

  return officeLookup[filter];
};

const isMapView = () => getQueryParamFromURL('view') === officeLocatorViewOptions.map;

/**
 * Handles the filter click event.
 * @param {HTMLElement} filter the filter element.
 * @param {Array<Object>} listings the listings retrieved from the api.
 */
const handleFilterClick = (
  filterButton,
  listings,
  searchBar,
  searchResultsList,
  isAgencyLocator,
) => {
  const { filter } = filterButton.dataset;
  const { resultsPerPage } = searchBar.parentElement.dataset;

  const allFilters = searchBar.querySelectorAll(`.${classes.searchBarFilter} button[data-filter]`);
  [...allFilters].forEach((button) => button.classList.remove('active'));
  filterButton.classList.add('active');

  const filteredListings = getFilteredResults(listings, filter);
  currentListings = filteredListings;
  addQueryParamToURL('filter', filter);

  // eslint-disable-next-line no-use-before-define
  setupPaginatedResults(
    filteredListings,
    searchBar,
    searchResultsList,
    isAgencyLocator,
    resultsPerPage,
    true,
  );

  if (isMapView()) {
    populateMapMarkers();
  } else {
    searchResultsList.scrollIntoView({ behavior: 'smooth' });
  }
};

/**
 *
 * @param {HTMLElement} searchBar the searchbar element.
 * @param {Array<Object>} listings the listings retrieved from the api.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 */
const setupFilters = (searchBar, listings, searchResultsList, isAgencyLocator) => {
  const activeFilter = getQueryParamFromURL('filter') || officeLocatorResultFilters.all.id;
  const officeCount = listings.filter((listing) => listing.AgentType !== 'I').length;
  const agencyCount = listings.length - officeCount;
  const filters = searchBar.querySelectorAll(`.${classes.searchBarFilter} button[data-filter]`);
  const activeFilterButton = searchBar.querySelector(`.${classes.searchBarFilter} button[data-filter="${activeFilter}"]`);
  activeFilterButton.classList.add('active');

  [...filters].forEach((filter) => {
    const countElement = filter.querySelector(`.${classes.searchBarFilterCount}`);

    if (filter.dataset.filter === officeLocatorResultFilters.all.id) {
      countElement.innerText = ` (${listings.length})`;
    } else {
      countElement.innerText = filter.getAttribute('data-filter') === officeLocatorResultFilters.offices.id
        ? ` (${officeCount})`
        : ` (${agencyCount})`;
    }

    filter.addEventListener('click', () => handleFilterClick(filter, listings, searchBar, searchResultsList, isAgencyLocator));
  });
};

/**
 * handles the view filter click event.
 * @param {String} filter the view filter.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 */
const handleViewClick = (filter, searchResultsList) => {
  const { filter: viewFilter } = filter.dataset;
  addQueryParamToURL('view', viewFilter);

  const viewFilters = filter.parentElement.querySelectorAll(`.${classes.searchBarViewFilter} button[data-filter]`);
  const mapContainer = searchResultsList.parentElement.querySelector(`.${classes.mapContainer}`);
  const pagination = searchResultsList.parentElement.parentElement.querySelector(`.${classes.searchBarPagination}`);

  [...viewFilters].forEach((view) => view.classList.remove('active'));
  filter.classList.add('active');

  if (viewFilter === officeLocatorViewOptions.map) {
    pagination.classList.add('hide');
    mapContainer.classList.add('active');
    searchResultsList.classList.add('hide');
    populateMapMarkers();
  } else {
    pagination.classList.remove('hide');
    mapContainer.classList.remove('active');
    searchResultsList.classList.remove('hide');
  }
};

/**
 * Sets up the view filters.
 * @param {HTMLElement} searchBar the searchbar element.
 * @param {Array<Object>} listings the listings retrieved from the api.
 */
const setupViews = (searchBar, searchResultsList) => {
  const viewFilters = searchBar.querySelectorAll(`.${classes.searchBarViewFilter} button[data-filter]`);
  const activeViewFilter = getQueryParamFromURL('view') || officeLocatorViewOptions.list;
  const activeViewFilterButton = searchBar.querySelector(`.${classes.searchBarViewFilter} button[data-filter="${activeViewFilter}"]`);
  activeViewFilterButton.classList.add('active');
  [...viewFilters].forEach((filter) => filter.addEventListener('click', () => handleViewClick(filter, searchResultsList)));
};

/**
 *
 * @param {Array} paginationArray
 * @param {Number} currentPage
 * @returns {Array} the pagination array.
 */
const createPagination = (paginationArray, currentPage) => paginationArray.map((page) => createPaginationButton(page, currentPage)).join('');

/**
 * Populates the data in the search bar.
 * @param {HTMLElement} searchBar the search bar.
 * @param {Array<Object>} listings the listings retrieved from the api.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 */
const populateSearchBar = async (searchBar, listings, isAgencyLocator, searchResultsList) => {
  const searchResultsCount = listings.length;
  const searchResultsTitle = searchBar.querySelector(`.${classes.title}`);
  const searchResultsSubTitle = searchBar.querySelector(`.${classes.subTitle}`);

  if (!isAgencyLocator) {
    setupFilters(searchBar, listings, searchResultsList, isAgencyLocator);
    setupViews(searchBar, searchResultsList);
  }

  if (searchResultsCount === 0) {
    searchResultsTitle.innerText = textValues.noResultsFound;
    searchResultsSubTitle.innerText = textValues.expandSearchCriteria;
    return;
  }

  searchResultsTitle.innerText = `${searchResultsCount} ${await textValues.officeLocations(isAgencyLocator)}`;
};

/**
 *
 * @param {Object} listing listing data.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @param {Boolean} isMapPopup whether or not this is a map popup element.
 * @returns {HTMLElement} the li element for the listing.
 */
const createListing = (listing, isAgencyLocator, isMapPopup) => {
  const {
    AgentType,
    OfficeDisplayName,
    OfficeAddress,
    Fax,
    Phone,
    UnderwriterCode,
    ServiceState,
    URL,
  } = listing;

  const isIndy = AgentType === 'I';
  const mapsLink = `${textValues.maps.googleMapsBaseUrl}/${OfficeAddress.Address1} ${OfficeAddress.Address2} ${OfficeAddress.City} ${OfficeAddress.State} ${OfficeAddress.Zip}`;

  const listingItem = createElement(isMapPopup ? 'div' : 'li', { class: [classes.resultsListItem, isIndy ? 'indy' : 'stewart-office'] }, [
    !isAgencyLocator ? createElement('div', { class: classes.listing.type }, [
      renderIcon(isIndy ? 'male' : 'building'),
      createElement('span', {}, isIndy ? textValues.independentAgency : textValues.stewartOffice),
    ]) : [],
    createElement('h4', { class: classes.listing.title }, OfficeDisplayName),
    createElement('div', { class: classes.listing.contactInfo }, [
      createElement('div', { class: classes.listing.address }, [
        isAgencyLocator ? createElement('span', { class: classes.listing.addressTitle }, textValues.mailingShippingAddress) : [],
        createElement('span', { class: `${classes.listing.address}-1` }, OfficeAddress.Address1),
        OfficeAddress.Address2 ? createElement('span', { class: `${classes.listing.address}-2` }, OfficeAddress.Address2) : [],
        createElement('span', { class: classes.listing.city }, `${OfficeAddress.City}, ${OfficeAddress.State} ${OfficeAddress.Zip}`),
      ]),
      !isAgencyLocator ? createElement('div', { class: classes.listing.phone }, [
        createElement('span', {}, `ph. ${Phone}`),
        ...Fax ? [createElement('span', {}, `fx. ${Fax}`)] : [],
      ]) : [],
    ]),
    !isAgencyLocator && !isMapPopup ? createElement('div', { class: classes.listing.details }, [
      createElement('a', { href: mapsLink, target: '_blank' }, [
        renderIcon('map-marker-alt'),
        createElement('span', {}, textValues.maps.map),
      ]),
      URL ? createElement('a', { href: URL, targe: '_blank' }, textValues.details) : [],
    ]) : [],
    isAgencyLocator ? createElement('div', { class: classes.listing.otherInfo }, [
      createElement('span', {}, `<strong>${textValues.underWriter}</strong>: ${UnderwriterCode}`),
      createElement('span', {}, `<strong>${textValues.serviceState}</strong>: ${ServiceState}`),
    ]) : [],
  ]);

  return listingItem;
};

/**
 *
 * @param {Number} currentPage the current page.
 * @param {Number} resultsPerPage the number of results per page.
 * @param {Array<Object>} results the listing results.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 * @returns {HTMLElement} the li element for the listing.
 */
const createResultsPerPage = (
  currentPage,
  listings,
  resultsPerPage,
  searchResultsList,
  isAgencyLocator,
) => {
  const listingSet = listings
    .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
    .map((listing) => createListing(listing, isAgencyLocator, false));

  searchResultsList.innerHTML = '';
  searchResultsList.append(...listingSet);
};

/**
 *
 * @param {Array<Object>} listings the listing data.
 * @param {HTMLElement} searchBar the searchBar element.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @param {Number} resultsPerPage the number of results per page.
 * @param {Boolean} isFilterClick whether or not this is a filter click.
 */
const setupPaginatedResults = (
  listings,
  searchBar,
  searchResultsList,
  isAgencyLocator,
  resultsPerPage,
  isFilterClick = false,
) => {
  const totalPages = Math.ceil(listings.length / resultsPerPage);
  const hasPages = totalPages > 1;

  if (isFilterClick) {
    addQueryParamToURL('page', 1);
  }

  let currentPage = Number(getQueryParamFromURL('page')) || 1;
  const paginationContainer = searchBar.querySelector(`.${classes.searchBarPagination}`);
  paginationContainer.innerHTML = '';

  createResultsPerPage(currentPage, listings, resultsPerPage, searchResultsList, isAgencyLocator);

  if (hasPages) {
    let paginationArray = generatePaginationData(currentPage, totalPages);
    paginationContainer.innerHTML = createPagination(paginationArray, currentPage);
    const paginationList = searchBar.querySelector('.search-results-pagination');
    const paginationButtons = searchBar.querySelectorAll('.search-results-pagination-button');

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
        createResultsPerPage(
          currentPage,
          listings,
          resultsPerPage,
          searchResultsList,
          isAgencyLocator,
        );

        searchResultsList.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
};

/**
 * populates the search results
 * @param {Object} params the search params.
 * @param {Array<Object>} listings the listings retrieved from the api.
 * @param {HTMLElement} searchResultsList the <ul> to populate.
 * @param {HTMLElement} searchBar the search bar.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 * @param {Number} resultsPerPage the number of results per page.
 */
const populateSearchResults = async (
  params,
  listings,
  searchResultsList,
  searchBar,
  isAgencyLocator,
  resultsPerPage,
) => {
  const sortedListings = listings.sort((item) => (item.AgentType !== 'I' ? -1 : 1));

  if (!isAgencyLocator) {
    await loadScript(BING_MAPS_BASE_URL);
  }

  const listingsToShow = isAgencyLocator && params.agencyName
    ? sortedListings.filter((listing) => listing
      .OfficeDisplayName
      .toLowerCase()
      .includes(params.agencyName
        .toLowerCase()))
      .filter((agencyListings) => agencyListings.AgentType === 'I')
    : sortedListings;

  const filteredListings = getFilteredResults(
    listingsToShow,
    params.filter || officeLocatorResultFilters.all.id,
  );

  currentListings = filteredListings;

  const filters = searchBar.querySelectorAll(`.${classes.searchBarFilterButton}`);
  const mapContainer = searchResultsList.parentElement.querySelector(`.${classes.mapContainer}`);
  [...filters].forEach((filter) => filter.classList.remove('active'));
  await populateSearchBar(searchBar, listingsToShow, isAgencyLocator, searchResultsList);

  setupPaginatedResults(
    filteredListings,
    searchBar,
    searchResultsList,
    isAgencyLocator,
    resultsPerPage,
    false,
  );

  if (isMapView()) {
    mapContainer.classList.add('active');
    searchResultsList.classList.add('hide');

    setTimeout(() => {
      // there seems to be a race condition on page load,
      // even though mapContainer is there when this is called.
      // bing maps just takes a bit to load.
      populateMapMarkers();
    }, 100);
  }
};

/**
 * Removes the loading state on the block.
 * @param {HTMLElement} block the block.
 * @param {HTMLElement} searchResultsList the <ul> results list.
 */
const removeLoadingState = (block, searchResultsList) => {
  block.classList.remove(classes.state.loading);
  const pagination = block.querySelector(`.${classes.searchBarPagination}`);

  if (isMapView()) {
    pagination.classList.add('hide');
  } else {
    searchResultsList.classList.remove('hide');
  }
};

/**
 * Sets the loading state on the block.
 * @param {HTMLElement} block the block.
 * @param {HTMLElement} searchResultsList the <ul> results list.
 * @param {HTMLElement} searchBar the search bar.
 * @param {HTMLElement} searchResultsTitle the search results title.
 * @param {HTMLElement} searchResultsSubtitle the search results subtitle.
 */
const setLoadingState = async (
  block,
  searchResultsList,
  searchBar,
  searchResultsTitle,
  searchResultsSubtitle,
  mapContainer,
) => {
  block.classList.add(classes.state.loading);
  searchResultsList.innerHTML = '';
  searchBar.classList.remove('hide');
  searchResultsTitle.innerText = textValues.resultsLoading;
  searchResultsSubtitle.innerText = '';

  if (mapContainer) {
    mapContainer.classList.remove('active');
  }
};

/**
 * Executes the search.
 * @param {Object} params the search params.
 * @param {HTMLElement} block the block.
 * @param {Boolean} isAgencyLocator whether or not this is an agency locator.
 */
export const executeSearch = async (params, block, isAgencyLocator) => {
  block.classList.remove(classes.state.error);
  const searchResultsList = block.querySelector(`.${classes.resultsList}`);
  const searchBar = block.querySelector(`.${classes.searchBar}`);
  const searchResultsTitle = searchBar.querySelector(`.${classes.title}`);
  const searchResultsSubtitle = searchBar.querySelector(`.${classes.subTitle}`);
  const mapContainer = block.querySelector(`.${classes.mapContainer}`);
  const { resultsPerPage } = block.dataset;

  await setLoadingState(
    block,
    searchResultsList,
    searchBar,
    searchResultsTitle,
    searchResultsSubtitle,
    mapContainer,
  );

  try {
    const listings = await getOfficeListings(params, isAgencyLocator);

    await populateSearchResults(
      params,
      listings,
      searchResultsList,
      searchBar,
      isAgencyLocator,
      resultsPerPage,
    );
  } catch (e) {
    console.log(e); // eslint-disable-line no-console
    searchResultsTitle.innerText = textValues.errorFetchingResults;
    searchResultsSubtitle.innerText = textValues.tryAgainLater;
    block.classList.add(classes.state.error);

    if (mapContainer) {
      mapContainer.classList.remove('active');
    }
  }

  removeLoadingState(block, searchResultsList);
};

/**
 * Decorates the block.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const blockConfig = readBlockConfig(block);
  block.dataset.resultsPerPage = blockConfig['results-per-page'] || 10;
  const isAgencyLocator = block.classList.contains('agency');
  const searchBar = renderSearchBar(isAgencyLocator);
  const searchResultsContainer = renderSearchResultsContainer(isAgencyLocator);

  block.innerHTML = '';
  block.appendChild(searchBar);
  block.appendChild(searchResultsContainer);

  const hasSearchParams = window.location.search.includes('?');

  if (hasSearchParams) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const allParams = Object.fromEntries(urlSearchParams.entries());
    delete allParams.esbUser; // temp
    delete allParams.esbPass; // temp

    setTimeout(async () => {
      searchResultsContainer.scrollIntoView({ behavior: 'smooth' });
      // the API is slow sometimes, so we need a timeout
      // to avoid putting the loading state on the block if it takes a few seconds
      await executeSearch(allParams, block, isAgencyLocator);
    }, 100);
  }
}
