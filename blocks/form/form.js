import { createElement } from '../../scripts/scripts.js';

let isCmdShiftPressed = false;

function getOptions(formData, options) {
  if (formData[options] || formData[options].data) {
    return [...formData[options].data];
  }
  return [...options].split(',').map((option) => {
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

function buildForm(formData, defaultAction) {
  const form = createElement('form');
  form.setAttribute('action', defaultAction);
  form.setAttribute('method', 'POST');
  const formFieldData = formData.form.data;
  let currentSection = form;
  let input;
  let previousIs2Col = false;
  let usesDefaultAction = true;
  let successMessage = '*Success!* Thank you for your submission.';
  let failureMessage = 'We\'re sorry, there was an error processing your submission. Please try again later.';
  const encounteredFieldLabels = new Set();
  formFieldData.forEach((field) => {
    const label = attr(field, 'label') || attr(field, 'name');
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
    const required = (attr(field, 'required') || 'n').toLowerCase() !== 'n';
    const cols = attr(field, 'cols') || 1;
    const help = attr(field, 'help');
    const helpUrl = attr(field, 'help url');
    const defaultValue = attr(field, 'default');
    const placeholder = attr(field, 'placeholder');

    if (type === 'form') {
      if (name.toLowerCase() === 'url') {
        form.setAttribute('action', options || defaultValue);
        usesDefaultAction = false;
      } else if (field.Name.toLowerCase() === 'method') {
        form.setAttribute('method', options || defaultValue);
      } else if (field.Name.toLowerCase() === 'success') {
        successMessage = options || defaultValue;
      } else if (field.Name.toLowerCase() === 'failure') {
        failureMessage = options || defaultValue;
      }
      return;
    }

    if (type === 'section') {
      const newSection = createElement('div');
      newSection.classList = ['field-container'];
      if (cols) {
        newSection.classList.add(`col-${cols}`);
      }
      if (options === '2-col') {
        newSection.classList.add('section-col-2');
        if (previousIs2Col) {
          previousIs2Col = false;
          currentSection.parentElement.append(newSection);
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
      const sectionTitle = createElement('h3');
      sectionTitle.textContent = field.Label || field.Name;
      newSection.append(sectionTitle);
      currentSection = newSection;
      return;
    }

    const fieldDiv = createElement('div');
    fieldDiv.classList = ['form-field'];
    fieldDiv.classList.add(`type-${type}`);
    if (cols) {
      fieldDiv.classList.add(`col-${cols}`);
    }
    currentSection.append(fieldDiv);

    const labelElem = createElement('label');
    labelElem.setAttribute('for', name);
    labelElem.setAttribute('id', labelId);
    labelElem.textContent = label;
    if (!required && type !== 'radio' && type !== 'checkbox') {
      labelElem.classList.add('optional');
    }
    fieldDiv.append(labelElem);

    switch (type) {
      case 'text':
        input = createElement('input');
        input.setAttribute('name', name);
        input.setAttribute('aria-labelledby', labelId);
        if (placeholder) { input.setAttribute('placeholder', placeholder); }
        if (defaultValue) { input.textContent = defaultValue; }
        if (required) { input.setAttribute('required', true); }
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
        getOptions(formData, options).forEach((option) => {
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
        getOptions(formData, field.Options).forEach((option) => {
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
  });

  form.append(createElement('input', { type: 'submit', value: 'Submit' }));
  if (usesDefaultAction) {
    // Default action uses AJAX to post the form
    form.addEventListener('submit', async (event) => {
      const data = {};
      event.preventDefault();
      (new FormData(form)).forEach((value, key) => { data[key] = value; });
      let action = form.getAttribute('action');
      if (isCmdShiftPressed) {
        action = `https://admin.hlx.page/form/hlxsites/stewart/main${action}.json`;
      }
      let response;
      try {
        response = await fetch(action, {
          method: 'POST',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data }),
        });
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
  return form;
}

/**
 * loads and generated the form
 * @param {Element} formEmbed The marker for the form embed
 */
export default function decorate(block) {
  const observer = new IntersectionObserver(async (entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        const formId = block.textContent.trim();
        // The form id is everything after the colon in the text
        const formData = await fetch(`/forms/${formId}.json`);
        const formJson = await formData.json();
        const form = buildForm(formJson, `/forms/${formId}`);
        block.replaceWith(form);

        // If domain is localhost or contains hlxsites.hlx then track keboard events
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('hlxsites.hlx')) {
          const handler = (event) => {
            isCmdShiftPressed = (event.ctrlKey || event.metaKey) && event.shiftKey;
          };
          document.addEventListener('keydown', handler);
          document.addEventListener('keyup', handler);
          // Cmd+Shift+DoubleClick autofills everything with test data
          form.addEventListener('dblclick', () => {
            if (!isCmdShiftPressed) return;
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
              const type = input.getAttribute('type');
              const name = input.getAttribute('name');
              if (type === 'radio' || type === 'checkbox') {
                if (Math.random() > 0.5) input.checked = true;
              } else if (type === 'date') {
                input.value = '2020-01-01';
              } else if (type === 'tel') {
                input.value = '555-555-5555';
              } else if (type === 'email') {
                input.value = 'test@test.test';
              } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 1 + (Math.floor(Math.random() * input.options.length - 1));
              } else if (name) {
                input.value = name;
              }
            });
          });
        }
      }
    });
  });

  observer.observe(block);
}
