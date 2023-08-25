const blockName = 'locator-results';

export const classes = {
  state: {
    loading: 'loading',
    error: 'error',
  },
  searchBar: `${blockName}-search-bar`,
  loader: `${blockName}-loading-spinner`,
  title: `${blockName}-title`,
  subTitle: `${blockName}-subtitle`,
  searchBarActions: `${blockName}-actions`,
  searchBarFilter: `${blockName}-filter`,
  searchBarFilterCount: `${blockName}-filter-count`,
  searchBarFilterButton: `${blockName}-filter-button`,
  searchBarViewFilter: `${blockName}-view-filter`,
  searchBarPagination: `${blockName}-pagination`,
  resultsContainer: `${blockName}-list-container`,
  resultsList: `${blockName}-list`,
  resultsListItem: `${blockName}-list-item`,
  mapContainer: `${blockName}-map-container`,
  listing: {
    type: `${blockName}-listing-type`,
    title: `${blockName}-listing-title`,
    contactInfo: `${blockName}-listing-contact-info`,
    details: `${blockName}-listing-details`,
    address: `${blockName}-listing-address`,
    addressTitle: `${blockName}-listing-address-title`,
    city: `${blockName}-listing-city`,
    phone: `${blockName}-listing-phone`,
    viewOnMap: `${blockName}-listing-view-on-map`,
    viewDetails: `${blockName}-listing-view-details`,
    otherInfo: `${blockName}-listing-other-info`,
  },
};

export const officeLocatorResultFilters = {
  all: {
    id: 'all',
    label: 'All',
  },
  offices: {
    id: 'offices',
    label: 'Stewart Offices',
  },
  agencies: {
    id: 'agencies',
    label: 'Independent Agencies',
  },
};

export const officeLocatorViewOptions = {
  list: 'list',
  map: 'map',
};

export const BING_MAPS_API_KEY = 'AiZTZg5KCzz6j4GXFWdqSbmhcnKD08BUT11H1Kr20aLFaQYr7iSx30hiZOEDPq-T';
export const BING_MAPS_BASE_URL = 'https://www.bing.com/maps/sdkrelease/mapcontrol';
