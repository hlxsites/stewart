import { createElement } from '../../scripts/scripts.js';

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

function buildForm(formData) {
  const form = createElement('form');
  const formFieldData = formData.form.data;
  let currentSection = form;
  let input;
  formFieldData.forEach((field) => {
    const name = attr(field, 'name');
    const type = (attr(field, 'type') || '').toLowerCase();
    const options = attr(field, 'options');
    const required = (attr(field, 'required') || 'n').toLowerCase().startsWith('y');
    const cols = attr(field, 'cols');
    const help = attr(field, 'help');
    const helpUrl = attr(field, 'help url');
    const defaultValue = attr(field, 'default');

    if (type === 'form') {
      if (name.toLowerCase() === 'url') {
        form.setAttribute('action', options || defaultValue);
      } else if (field.Name.toLowerCase() === 'method') {
        form.setAttribute('method', options || defaultValue);
      }
      return;
    }

    if (type === 'section') {
      currentSection = createElement('div');
      currentSection.classList = ['form-section'];
      form.append(currentSection);
      const sectionTitle = createElement('h2');
      sectionTitle.textContent = field.Name;
      currentSection.append(sectionTitle);
      return;
    }

    const fieldDiv = createElement('div');
    fieldDiv.classList = ['form-field'];
    if (cols) {
      fieldDiv.classList.add(`col-${cols}`);
    }
    currentSection.append(fieldDiv);

    const label = createElement('label');
    label.setAttribute('for', name);
    label.textContent = name;
    fieldDiv.append(label);

    switch (type) {
      case 'text':
        input = createElement('input');
        input.setAttribute('name', name);
        if (required) { input.setAttribute('required', true); }
        currentSection.append(input);
        break;
      case 'textarea':
        input = createElement('textarea');
        input.setAttribute('name', name);
        if (required) { input.setAttribute('required', true); }
        currentSection.append(input);
        break;
      case 'select':
        input = createElement('select');
        input.setAttribute('name', name);
        if (required) { input.setAttribute('required', true); }
        getOptions(formData, options).forEach((option) => {
          const selectionLabel = attr(option, 'label') || attr(option, 'display');
          const value = attr(option, 'value');
          const optionEle = createElement('option');
          optionEle.setAttribute('value', value);
          optionEle.textContent = selectionLabel;
          input.append(optionEle);
        });
        currentSection.append(input);
        break;
      case 'radio':
        getOptions(formData, field.Options).forEach((option) => {
          const selectionLabel = attr(option, 'label') || attr(option, 'display');
          const value = attr(option, 'value');
          input = createElement('input');
          input.setAttribute('name', name);
          input.setAttribute('type', 'radio');
          input.setAttribute('value', value);
          if (defaultValue === value) {
            input.setAttribute('checked', true);
          }
          currentSection.append(input);
          const labelEle = createElement('label');
          labelEle.textContent = selectionLabel;
          currentSection.append(labelEle);
        });
        break;
      case 'checkbox':
        input = createElement('input');
        input.setAttribute('name', name);
        input.setAttribute('type', 'checkbox');
        if (required) { input.setAttribute('required', true); }
        currentSection.append(input);
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

  return form;
}

/**
 * loads and generated the form
 * @param {Element} formEmbed The marker for the form embed
 */
export default async function decorate(block) {
  const formId = block.textContent.trim();
  // The form id is everything after the colon in the text
  const formData = await fetch(`/forms/${formId}.json`);
  const formJson = await formData.json();
  const form = buildForm(formJson);
  block.replaceWith(form);
}
