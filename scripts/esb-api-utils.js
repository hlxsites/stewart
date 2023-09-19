const ESB_BASE_URL = 'https://d28w3vn6d1tm1o.cloudfront.net/esb/api';

const getAutoCompleteSuggestions = async (prefix) => {
  const url = `${ESB_BASE_URL}/Autocomplete?prefix=${prefix}`;
  const suggestions = await fetch(url, {
    method: 'GET',
  });

  const { autoCompleteResponse } = await suggestions.json();
  return autoCompleteResponse;
};

const getOfficeListings = async (params, isAgencyLocator) => {
  const url = `${ESB_BASE_URL}/Office/Listings/v2?${new URLSearchParams({
    ...params,
    ...!isAgencyLocator ? { isRadiusSearch: true } : {},
    limit: 1000,
    agent_type: isAgencyLocator ? ['I'] : ['I', 'E1', 'E2', 'S1', 'S2'],
    office_visibility: '[both]',
  })}`;

  let results = null;

  try {
    const listings = await fetch(url, {
      method: 'GET',
    });

    const { StewartOffices: { StewartOffice } } = await listings.json();
    results = StewartOffice;
  } catch (e) {
    console.log(e); // eslint-disable-line no-console
  }

  return results;
};

export {
  getOfficeListings,
  getAutoCompleteSuggestions,
};
