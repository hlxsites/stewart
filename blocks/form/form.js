import { createElement } from '../../scripts/scripts.js';

function getOptions(formData, options) {
  if (formData[options]) { 
    return formData[options];
  } else {
    return options.split(",").map((option) => {
      if (option.includes(":")) {
        const [Display, Value] = option.split(":");
        return { Display, Value };
      } else {
        return { Display: option, Value: option };
      }
    });
  }
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
          const optionEle = createElement('option');
          optionEle.setAttribute('value', option.Value);
          optionEle.textContent = option.Label;
          input.append(optionEle);
        });
        currentSection.append(input);
        break;
      case 'radio':
        getOptions(formData, field.Options).forEach((option) => {
          input = createElement('input');
          input.setAttribute('name', name);
          input.setAttribute('type', 'radio');
          input.setAttribute('value', option.Value);
          if (defaultValue === option.Value) {
            input.setAttribute('checked', true);
          }
          currentSection.append(input);
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
export default async function decorate(formEmbed) {
  // The form id is everything after the colon in the text
  const formId = formEmbed.textContent.split(':')[1].trim();
  const formData = await fetch(`/form/${formId}.json`).json;
  const form = buildForm(formData);
  formEmbed.replaceWith(form);
}
