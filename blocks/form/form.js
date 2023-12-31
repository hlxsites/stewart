import { createElement } from '../../scripts/scripts.js';
import { fetchPlaceholders } from '../../scripts/lib-franklin.js';

let commonOptions;
let image;

async function getCommonOptions(listName) {
  if (!commonOptions) {
    const response = await fetch('/forms/common.json');
    commonOptions = await response.json();
  }
  return [...commonOptions[listName].data];
}

async function getOptions(formData, options) {
  // If options is state or yes-no get the common options
  if (options === 'state' || options === 'yes-no') {
    return getCommonOptions(options);
  }
  if (formData[options] && formData[options].data) {
    return [...formData[options].data];
  }
  return [...options.split(',')].map((option) => {
    if (option.includes(':')) {
      const [display, value] = option.split(':');
      return { display, value };
    }
    return { display: option, value: option };
  });
}

function attr(object, name) {
  let val;
  Object.keys(object).forEach((key) => {
    if (key.toLowerCase() === name.toLowerCase()) {
      val = object[key];
    }
  });
  return val;
}

/**
 * For a franklin form post, set up the form post handler
 * to post via AJAX and display a success or failure message
 * @param {*} form the form element
 * @param {*} successMessage Success message
 * @param {*} failureMessage Failure message
 * @param {*} multipartFormdata multipart/form-data flag
 */
function configureDefaultFormPost(form, successMessage, failureMessage, multipartFormdata) {
  form.addEventListener('submit', async (event) => {
    const data = {};
    event.preventDefault();
    (new FormData(form)).forEach((value, key) => { data[key] = value; });
    const action = form.getAttribute('action').replace(/\.json$/, '');
    let response;
    try {
      const options = {
        method: 'POST',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      };

      if (multipartFormdata) {
        options.headers['Content-Type'] = 'multipart/form-data';
        options.body = new FormData(form);
      }

      response = await fetch(action, options);
    } finally {
      let message;
      if (response && response.ok) {
        // Create success message at the top of the form and scroll to it.
        message = createElement('p', { class: 'form-success' });
        message.textContent = successMessage;
      } else {
        message = createElement('p', { class: 'form-failure' });
        message.textContent = failureMessage;
      }
      // Convert any text content surrounded by asterisks to boldface
      message.innerHTML = message.innerHTML.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
      form.querySelectorAll('.form-success, .form-failure').forEach((ele) => ele.remove());
      form.prepend(message);
      message.parentElement.scrollIntoView();
    }
  });
}

function configureEmailFormPost(form, subject) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Build the email body using carriage return and new line as delimiters
    const body = [...(new FormData(form)).entries()].map((entry) => `${entry[0]}: ${entry[1]}`).join('\r\n');
    const action = form.getAttribute('action');
    // URL encode the body
    const encodedBody = encodeURIComponent(body);
    // Open the mailto link with subject and body in new window
    const url = `${action}?subject=${subject}&body=${encodedBody}`;
    window.open(url, '_blank');
  });
}

function processFormOption(name, form, options, defaultValue, formOptions, label) {
  if (name.toLowerCase() === 'url' || name.toLowerCase() === 'action') {
    form.setAttribute('action', options || defaultValue);
    if (label.toLowerCase() === 'fetch') {
      formOptions.multipartFormdata = true;
    } else {
      formOptions.usesDefaultAction = false;
    }
  } else if (name.toLowerCase() === 'method') {
    form.setAttribute('method', options || defaultValue);
  } else if (name.toLowerCase() === 'success') {
    formOptions.successMessage = options || defaultValue;
  } else if (name.toLowerCase() === 'failure') {
    formOptions.failureMessage = options || defaultValue;
  } else if (name.toLowerCase() === 'submit') {
    formOptions.submitLabel = label || options || defaultValue;
  } else if (name.toLowerCase() === 'subject') {
    formOptions.subject = options || defaultValue;
  }
}

function buildFormSection(lastSection, form, label, cols, options) {
  let previousIs2Col = lastSection?.previousIs2Col || false;
  const newSection = createElement('div');
  newSection.classList = ['field-container'];
  if (cols) {
    newSection.classList.add(`col-${cols}`);
  }
  if (options.includes('transparent')) {
    newSection.classList.add('transparent');
  } else if (options.includes('white')) {
    newSection.classList.add('white');
  }
  if (options.includes('nested')) {
    newSection.classList.add('section-nested');
    if (lastSection.classList.contains('section-nested')) {
      lastSection.closest('.form-section').append(createElement('div', { class: ['form-field', cols ? `col-${cols}` : ''] }, newSection));
    } else {
      lastSection.append(createElement('div', { class: ['form-field', cols ? `col-${cols}` : ''] }, newSection));
    }
  } else if (options.includes('2-col')) {
    newSection.classList.add('section-col-2');
    if (previousIs2Col) {
      previousIs2Col = false;
      lastSection.parentElement.append(newSection);
    } else {
      previousIs2Col = true;
      const sectionWrapper = createElement('div');
      sectionWrapper.classList = ['form-section'];
      sectionWrapper.classList.add('section-col-2-wrapper');
      sectionWrapper.append(newSection);
      form.append(sectionWrapper);
    }
  } else {
    newSection.classList.add('form-section');
    form.append(newSection);
  }
  if (label) {
    const sectionTitle = createElement('h3');
    sectionTitle.textContent = label;
    newSection.append(sectionTitle);
  }
  newSection.previousIs2Col = previousIs2Col;
  return newSection;
}

async function buildForm(formData, defaultAction) {
  const form = createElement('form');
  form.setAttribute('action', defaultAction);
  form.setAttribute('method', 'POST');
  const formFieldData = formData?.form?.data || formData.data;
  let currentSection = form;
  const placeholders = await fetchPlaceholders();
  const formOptions = {
    successMessage: placeholders?.formSuccessMessage || '*Success!* Thank you for filling out our form. We have received it and will get back to you soon.',
    failureMessage: placeholders?.formFailureMessage || '*An error has occurred!* Please contact webmaster@stewart.com and let us know the name and URL of the form you just tried to complete. Something happened and it didn\'t accept your information. We apologize!',
    subject: placeholders?.formSubject || 'Form Submission',
    submitLabel: placeholders?.formSubmitLabel || 'Submit',
    usesDefaultAction: true,
    multipartFormdata: false,
  };
  const encounteredFieldLabels = new Set();
  // eslint-disable-next-line no-restricted-syntax
  for (const field of formFieldData) {
    const label = attr(field, 'label');
    const name = attr(field, 'name') || attr(field, 'label');
    let labelId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}--label`;
    let labelSuffix = 1;
    while (encounteredFieldLabels.has(labelId)) {
      labelSuffix += 1;
      labelId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}${labelSuffix}--label`;
    }
    encounteredFieldLabels.add(labelId);
    const type = (attr(field, 'type') || '').toLowerCase();
    const options = attr(field, 'options');
    // eslint-disable-next-line no-await-in-loop
    const optionsList = await getOptions(formData, options);
    const required = (attr(field, 'required') || 'n').toLowerCase() !== 'n';
    const cols = attr(field, 'cols') || 1;
    const help = attr(field, 'help');
    const helpUrl = attr(field, 'help url');
    const defaultValue = attr(field, 'default');
    const placeholder = attr(field, 'placeholder');
    let input;
    let fieldDiv;

    switch (type) {
      case 'form':
        processFormOption(name, form, options, defaultValue, formOptions, label);
        break;
      case 'section':
        currentSection = buildFormSection(currentSection, form, label, cols, options);
        break;
      default:
        fieldDiv = createElement('div');
        fieldDiv.classList = ['form-field'];
        fieldDiv.classList.add(`type-${type}`);
        if (cols) {
          fieldDiv.classList.add(`col-${cols}`);
        }
        currentSection.append(fieldDiv);

        if (label) {
          const labelElem = createElement('label');
          labelElem.setAttribute('for', name);
          labelElem.setAttribute('id', labelId);
          labelElem.textContent = label;
          if (!required && type !== 'radio' && type !== 'checkbox' && type !== 'label') {
            labelElem.classList.add('optional');
          }
          fieldDiv.append(labelElem);
        } else {
          // Apply id attribute to the last h3 we created
          const sectionTitle = currentSection.querySelector('h3:last-of-type');
          if (sectionTitle) {
            sectionTitle.setAttribute('id', labelId);
          }
        }
        switch (type) {
          case 'text':
            input = createElement('input');
            input.setAttribute('name', name);
            input.setAttribute('aria-labelledby', labelId);
            if (placeholder) { input.setAttribute('placeholder', placeholder); }
            if (defaultValue) { input.value = defaultValue; }
            if (required) { input.setAttribute('required', true); }
            if (options.includes('hide')) { fieldDiv.classList.add('hidden'); }
            fieldDiv.append(input);
            break;
          case 'textarea':
            input = createElement('textarea');
            input.setAttribute('name', name);
            input.setAttribute('aria-labelledby', labelId);
            if (placeholder) { input.setAttribute('placeholder', placeholder); }
            if (defaultValue) { input.textContent = defaultValue; }
            if (required) { input.setAttribute('required', true); }
            fieldDiv.append(input);
            break;
          case 'select':
            input = createElement('select');
            input.setAttribute('name', name);
            input.setAttribute('aria-labelledby', labelId);
            if (required) { input.setAttribute('required', true); }
            optionsList.forEach((option) => {
              const selectionLabel = attr(option, 'label') || attr(option, 'display');
              const value = attr(option, 'value');
              const optionEle = createElement('option');
              optionEle.setAttribute('value', value);
              optionEle.textContent = selectionLabel;
              if (defaultValue === value) {
                optionEle.setAttribute('checked', true);
              }
              input.append(optionEle);
            });
            fieldDiv.append(input);
            break;
          case 'radio':
            if (optionsList.length === 1 && !label) {
              fieldDiv.classList.add('long-radio');
            }
            optionsList.forEach((option) => {
              const selectionLabel = attr(option, 'label') || attr(option, 'display');
              const value = attr(option, 'value');
              input = createElement('input');
              input.setAttribute('name', name);
              input.setAttribute('aria-labelledby', labelId);
              input.setAttribute('type', 'radio');
              input.setAttribute('value', value);
              if (defaultValue === value) {
                input.setAttribute('checked', true);
              }
              fieldDiv.append(input);
              const labelEle = createElement('label');
              labelEle.setAttribute('class', 'value-label');
              labelEle.textContent = selectionLabel;
              fieldDiv.append(labelEle);
            });

            break;
          case 'checkbox':
            input = createElement('input');
            input.setAttribute('name', name);
            input.setAttribute('type', 'checkbox');
            input.setAttribute('aria-labelledby', labelId);
            if (required) { input.setAttribute('required', true); }
            fieldDiv.append(input);
            break;
          case 'date':
            input = createElement('input');
            input.setAttribute('name', name);
            input.setAttribute('type', 'date');
            input.setAttribute('aria-labelledby', labelId);
            input.setAttribute('placeholder', placeholder || 'mm/dd/yyyy');
            if (required) { input.setAttribute('required', true); }
            if (defaultValue) { input.textContent = defaultValue; }
            fieldDiv.append(input);
            break;
          case 'tel':
          case 'telephone':
          case 'phone':
            input = createElement('input');
            input.setAttribute('name', name);
            input.setAttribute('type', 'tel');
            input.setAttribute('aria-labelledby', labelId);
            input.setAttribute('placeholder', placeholder || '555-555-5555');
            if (required) { input.setAttribute('required', true); }
            if (defaultValue) { input.textContent = defaultValue; }
            fieldDiv.append(input);
            break;
          case 'email':
            input = createElement('input');
            input.setAttribute('name', name);
            input.setAttribute('type', 'email');
            input.setAttribute('aria-labelledby', labelId);
            input.setAttribute('placeholder', placeholder);
            if (required) { input.setAttribute('required', true); }
            if (defaultValue) { input.textContent = defaultValue; }
            fieldDiv.append(input);
            break;
          case 'legend':
            input = createElement('legend', { class: 'legend' }, defaultValue || '');
            fieldDiv.append(input);
            break;
          case 'info':
            input = createElement('div', { role: 'alert', class: 'info-alert' }, defaultValue || '');
            fieldDiv.append(input);
            break;
          case 'image':
            if (image) {
              fieldDiv.append(image);
            }
            break;
          default:
            break;
        }
        if (help) {
          if (helpUrl) {
            const helpLink = createElement('a');
            helpLink.classList = ['help'];
            helpLink.setAttribute('href', helpUrl);
            helpLink.textContent = help;
            fieldDiv.append(helpLink);
          } else {
            const helpEle = createElement('p');
            helpEle.classList = ['help'];
            helpEle.textContent = help;
            fieldDiv.append(helpEle);
          }
        }
    }
  }

  form.append(createElement('input', { type: 'submit', value: formOptions.submitLabel }));
  if (formOptions.usesDefaultAction) {
    // Default action uses AJAX to post the form
    configureDefaultFormPost(
      form,
      formOptions.successMessage,
      formOptions.failureMessage,
      formOptions.multipartFormdata,
    );
  } else if (form.getAttribute('action').startsWith('mailto:')) {
    // Mailto action opens the user's email client
    configureEmailFormPost(form, formOptions.subject);
  }
  return form;
}

/**
 * loads and generated the form
 * @param {Element} formEmbed The marker for the form embed
 */
export default async function decorate(block) {
  image = block.querySelector('picture');
  const formLink = block.querySelector('a');
  let formHref = formLink ? formLink.href : '';
  if (!formHref) {
    // probably no link, check for name in text content
    const formId = block.textContent.trim().toLowerCase().replace(/\s/g, '-');
    if (formId) {
      formHref = `/forms/${formId}.json`;
    }
  }

  block.innerHTML = '';
  if (!formHref) {
    return;
  }

  const observer = new IntersectionObserver(async (entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        observer.disconnect();

        const formData = await fetch(formHref);
        const formJson = await formData.json();
        const form = await buildForm(formJson, formHref);
        block.replaceWith(form);
      }
    });
  });

  observer.observe(block);
}
