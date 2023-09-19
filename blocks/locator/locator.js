import {
  createElement,
  debounce,
  addQueryParamToURL,
  getQueryParamFromURL,
  getLocalePlaceholders,
} from '../../scripts/scripts.js';
import { getTaxonomyCategory } from '../../scripts/taxonomy.js';
import { getAutoCompleteSuggestions } from '../../scripts/esb-api-utils.js';
import { executeSearch } from '../locator-results/locator-results.js';

const blockName = 'locator';

let AUTOCOMPLETE_ACTIVE_INDEX = -1;
let defaultValues = {};

const classes = {
  locatorResults: `${blockName}-results`,
  autoCompleteList: `${blockName}-autocomplete-list`,
  autoCompleteListItem: `${blockName}-autocomplete-list-item`,
};

const selectors = {
  locator: `.${blockName}`,
  locatorResults: `.${classes.locatorResults}`,
  agencyLocator: {
    agencyName: `.${blockName}.agency #input-agency-name`,
  },
  officeLocator: {
    autoCompleteList: `.${blockName}.office .${classes.autoCompleteList}`,
    addressInput: `.${blockName}.office #input-address`,
  },
  sharedInputs: {
    cityInput: `.${blockName} #input-city`,
    stateInput: `.${blockName} #input-state`,
  },
};

/**
 * Creates an option element for a select field
 * @param {Object} option
 * @returns {HTMLElement} an option element
 */
const createSelectOption = (option) => {
  const stateAbbr = Object.values(option).find((key) => (typeof key === 'object' && key.title));
  const value = stateAbbr && stateAbbr.title ? stateAbbr.title : option.name;

  const selectOption = createElement(
    'option',
    {
      value: value.split('-')[0],
      ...option.disabled ? { disabled: true } : {},
      ...option.selected ? { selected: true } : {},
    },
    option.title,
  );

  return selectOption;
};

/**
 * Creates a a form field pair (label and form field)
 * @param {Object} fieldOptions
 * @returns {HTMLElement} a div containing a label and a form field
 */
const createFormField = (fieldOptions) => {
  const { attributes, selectOptions, width } = fieldOptions;
  const {
    id,
    type,
    placeholder,
    value,
  } = attributes;

  if (selectOptions) {
    const defaultOptionAttributes = {
      name: '',
      disabled: true,
      selected: true,
      title: `Select a ${placeholder}`,
    };

    selectOptions.unshift(defaultOptionAttributes);
  }

  const formFieldTag = type === 'select' ? 'select' : 'input';

  const formFieldPair = createElement('div', { class: ['form-field-pair', width || 'full', type] }, [
    createElement('label', {
      for: id,
    }),
    createElement(formFieldTag, attributes, type === 'select' && selectOptions ? selectOptions.map((option) => createSelectOption(option)) : null),
  ]);

  if (type === 'select' && value) {
    formFieldPair.querySelector('select').value = value;
  }

  return formFieldPair;
};

/**
 * Creates a locator form for the agency locator or office locator based on some parameters.
 * @param {Object} locator parameters
 * @returns {HTMLElement} a div containing a full form.
 */
const createLocatorForm = ({
  formAction,
  type,
  formFields,
  submitButtonText,
  title,
}) => createElement('form', {
  class: [`${type}-locator-form`, 'locator-form'],
  action: formAction,
  autocomplete: 'off',
}, [
  createElement('h4', {}, title),
  ...formFields,
  createElement('button', {
    type: 'submit',
  }, submitButtonText),
]);

/**
 * @param {Boolean} isAgencyLocator whether the locator is an agency locator
 * returns {Array} an array of form fields
 */
const getLocatorFormFields = async (isAgencyLocator) => {
  const states = await getTaxonomyCategory('States');
  const distances = await getTaxonomyCategory('Distance');
  const stateOptions = Object.values(states).filter((state) => state.title);
  const serviceStateOptions = JSON.parse(JSON.stringify(stateOptions));
  const distanceOptions = Object.values(distances).filter((distance) => distance.title);

  const formFields = [
    ...(isAgencyLocator ? [createFormField({
      attributes: {
        'aria-label': defaultValues.agencyName,
        id: 'input-agency-name',
        name: 'agencyName',
        type: 'text',
        placeholder: defaultValues.agencyName,
        value: getQueryParamFromURL('agencyName') || '',
      },
    })] : []),
    ...(!isAgencyLocator ? [createFormField({
      attributes: {
        'aria-label': defaultValues.address,
        id: 'input-address',
        name: 'address',
        type: 'text',
        placeholder: defaultValues.address,
        value: getQueryParamFromURL('address') || '',
        'aria-owns': 'autocomplete-list',
        'aria-expanded': false,
      },
    })] : []),
    createFormField({
      attributes: {
        'aria-label': defaultValues.city,
        id: 'input-city',
        name: 'city',
        type: 'text',
        placeholder: defaultValues.city,
        value: getQueryParamFromURL('city') || '',
      },
    }),
    createFormField({
      attributes: {
        'aria-label': defaultValues.state,
        id: 'input-state',
        name: 'state',
        type: 'select',
        ...!isAgencyLocator ? { required: true } : {},
        placeholder: defaultValues.state,
        value: getQueryParamFromURL('state') || '',
      },
      selectOptions: stateOptions,
      width: 'half',
    }),
    ...(isAgencyLocator ? [createFormField({
      attributes: {
        'aria-label': defaultValues.zipcode,
        id: 'input-zipcode',
        name: 'zip',
        type: 'number',
        placeholder: defaultValues.zipcode,
        pattern: '[0-9]{5}',
        value: getQueryParamFromURL('zip') || '',
      },
      width: 'half',
    })] : []),
    ...(isAgencyLocator ? [createFormField({
      attributes: {
        'aria-label': defaultValues.serviceState,
        id: 'input-service-state',
        name: 'serviceState',
        type: 'select',
        placeholder: defaultValues.serviceState,
        value: getQueryParamFromURL('serviceState') || '',
      },
      selectOptions: serviceStateOptions,
    })] : []),
    ...(!isAgencyLocator ? [createFormField({
      attributes: {
        'aria-label': defaultValues.distance,
        id: 'input-distance',
        name: 'distance',
        type: 'select',
        placeholder: defaultValues.distance,
        value: getQueryParamFromURL('distance') || '',
      },
      selectOptions: distanceOptions,
      width: 'half',
    })] : []),
  ];

  return formFields;
};

/**
 *
 * @param {String} city the city
 * @param {String} state the state
 * @param {HTMLElement} block the locator block
 * @param {HTMLElement} autoCompleteList the autocomplete list
 */
const handleSuggestionclick = (city, state, text, block, autoCompleteList) => {
  const cityInput = block.querySelector(selectors.sharedInputs.cityInput);
  const stateInput = block.querySelector(selectors.sharedInputs.stateInput);
  const addressInput = block.querySelector(selectors.officeLocator.addressInput);
  cityInput.value = city;
  stateInput.value = state;

  if (addressInput) {
    addressInput.value = text;
  }
  autoCompleteList.remove();
};

/**
 * @param {Object<Array>} suggestions an array of suggestions
 * @param {HTMLElement} block the locator block
 * @param {HTMLElement} addressInput the address input
 * Creates an autocomplete list box.
 */
const createAutoCompleteList = (suggestions, block, addressInput) => {
  const autoCompleteList = createElement('ul', {
    class: classes.autoCompleteList,
    id: 'autocomplete-list',
    role: 'listbox',
    tabindex: 0,
  });

  suggestions.forEach((suggestion) => {
    const { city, state, text } = suggestion;
    const listItem = createElement('li', {
      class: classes.autoCompleteListItem,
      'data-city': city,
      'data-state': state,
    }, text);
    autoCompleteList.appendChild(listItem);
    listItem.addEventListener('click', () => handleSuggestionclick(city, state, text, block, autoCompleteList));
  });

  addressInput.setAttribute('aria-expanded', true);
  const fieldContainer = addressInput.parentElement;
  fieldContainer.prepend(autoCompleteList);
};

/**
 * Gets suggestions for the address field.
 * @param {String} value
 * @param {HTMLElement} block the locator block
 */
const getSuggestions = async (value, block) => {
  const { address } = await getAutoCompleteSuggestions(value);
  const existingAutoCompleteList = block.querySelector(selectors.officeLocator.autoCompleteList);
  const addressInput = block.querySelector(selectors.officeLocator.addressInput);

  if (existingAutoCompleteList) {
    existingAutoCompleteList.remove();
    addressInput.setAttribute('aria-expanded', false);
  }

  if (address && address.suggestions && value.length) {
    createAutoCompleteList(address.suggestions, block, addressInput);
  }
};

/**
 * @param {Number} index the index of the active item
 * @param {HTMLElement} autoCompleteList the autocomplete list
 * Applies the active index to an autocomplete list item.
 */
const applyActiveIndex = (index, autoCompleteList) => {
  [...autoCompleteList.children].forEach((item) => {
    if (item.classList.contains('active')) {
      item.classList.remove('active');
    }
  });

  [...autoCompleteList.children][index].classList.add('active');
};

/**
 * @param {Event} e the event
 * @param {HTMLElement} block the locator block
 * Handle keydown events on the address input
 */
const handleKeyDown = (e, block) => {
  const autoCompleteList = block.querySelector(selectors.officeLocator.autoCompleteList);

  if (autoCompleteList) {
    const { length } = autoCompleteList.children;
    const { key } = e;

    if (autoCompleteList) {
      if (key === 'ArrowDown') {
        AUTOCOMPLETE_ACTIVE_INDEX = (AUTOCOMPLETE_ACTIVE_INDEX + 1) % length;
        applyActiveIndex(AUTOCOMPLETE_ACTIVE_INDEX, autoCompleteList);
      } else if (key === 'ArrowUp') {
        if (AUTOCOMPLETE_ACTIVE_INDEX === -1) {
          AUTOCOMPLETE_ACTIVE_INDEX = 0;
        }

        AUTOCOMPLETE_ACTIVE_INDEX = (length + (AUTOCOMPLETE_ACTIVE_INDEX - 1)) % length;
        applyActiveIndex(AUTOCOMPLETE_ACTIVE_INDEX, autoCompleteList);
      } else if (key === 'Enter') {
        e.preventDefault();
        const activeItem = [...autoCompleteList.children][AUTOCOMPLETE_ACTIVE_INDEX];
        const address = activeItem.innerText;
        const { city, state } = activeItem.dataset;
        handleSuggestionclick(city, state, address, block, autoCompleteList);
        autoCompleteList.remove();
      }
    }
  }
};

/**
 * Adds event listeners for form elements.
 * @param {Boolean} isAgencyLocator
 * @param {Boolean} isOnResultsPage
 * @param {HTMLElement} block the locator block
 * @param {HTMLElement} locatorForm the locator form
 */
const addEventListeners = (isAgencyLocator, isOnResultsPage, block, locatorForm) => {
  if (!isAgencyLocator) {
    const addressInput = block.querySelector(selectors.officeLocator.addressInput);
    const onAddressInputChange = debounce(getSuggestions);
    addressInput.addEventListener('input', (e) => onAddressInputChange(e.target.value, block));
    addressInput.addEventListener('keydown', (e) => handleKeyDown(e, block));
  }

  locatorForm.addEventListener('submit', async (e) => {
    if (isAgencyLocator) {
      const cityInput = block.querySelector(selectors.sharedInputs.cityInput);
      const agencyNameInput = block.querySelector(selectors.agencyLocator.agencyName);
      const error = locatorForm.querySelector('.error');
      if (error) error.remove();

      if (!cityInput.value && !agencyNameInput.value) {
        e.preventDefault();
        const errorElement = createElement('div', { class: 'error' }, defaultValues.agencyValidationError);
        locatorForm.appendChild(errorElement);

        return;
      }
    }

    if (isOnResultsPage) {
      e.preventDefault();
      const formData = new FormData(locatorForm);
      const urlParams = new URLSearchParams(formData);
      window.history.pushState('name', '', window.location.pathname);

      urlParams.forEach((value, key) => {
        addQueryParamToURL(key, value);
      });

      const params = Object.fromEntries(urlParams.entries());
      const locatorResultsBlock = document.querySelector(selectors.locatorResults);
      locatorResultsBlock.scrollIntoView({ behavior: 'smooth' });
      await executeSearch(params, locatorResultsBlock, isAgencyLocator);
    }
  });

  locatorForm.addEventListener('formdata', (e) => {
    const { formData } = e;
    const entries = [...formData.entries()];

    entries.forEach((entry) => {
      const [name, value] = entry;
      if (value === '') formData.delete(name);
    });
  });
};

/**
 * Decorates the block.
 */
export default async function decorate(block) {
  const placeholders = getLocalePlaceholders();
  const {
    agencyName,
    findYourAgency,
    findUs,
    findAnAgency,
    findAnOffice,
    locateOfficeResultsPage,
    locateAgencyResultsPage,
    cityOrAgencyNameError,
    city,
    address,
    state,
    zipCode,
    serviceState,
    distance,
  } = placeholders;

  defaultValues = {
    agencyName: agencyName || 'Agency Name',
    address: address || 'Address',
    city: city || 'City',
    state: state || 'State',
    zipcode: zipCode || 'Zip Code',
    serviceState: serviceState || 'Service State',
    distance: distance || 'Distance',
    formTitle: (isAgencyLocator) => `Find an ${isAgencyLocator ? 'Agency' : 'Office'}`,
    submitButtonText: (isAgencyLocator) => `Find an ${isAgencyLocator ? 'Agency' : 'Office'}`,
    formAction: (isAgencyLocator) => (isAgencyLocator ? '/en/agent-verification' : '/en/locate-an-office'),
    agencyValidationError: cityOrAgencyNameError || 'Please enter a city or agency name.',
  };

  const isAgencyLocator = block.classList.contains('agency');
  const locatorType = isAgencyLocator ? 'agency' : 'office';
  const isOnResultsPage = !!document.querySelector(`.${classes.locatorResults}.${locatorType}`);
  const formFields = await getLocatorFormFields(isAgencyLocator);
  const defaultSubmitButtonText = defaultValues.submitButtonText(isAgencyLocator);
  const defaultTitle = defaultValues.formTitle(isAgencyLocator);
  const defaultFormAction = defaultValues.formAction(isAgencyLocator);

  const locatorForm = createLocatorForm({
    formAction: (isAgencyLocator
      ? locateAgencyResultsPage
      : locateOfficeResultsPage
    ) || defaultFormAction,
    isAgencyLocator,
    formFields,
    type: locatorType,
    title: (isAgencyLocator ? findYourAgency : findUs) || defaultTitle,
    submitButtonText: (isAgencyLocator ? findAnAgency : findAnOffice) || defaultSubmitButtonText,
  });

  block.innerHTML = '';
  block.appendChild(locatorForm);
  addEventListeners(isAgencyLocator, isOnResultsPage, block, locatorForm);
}
