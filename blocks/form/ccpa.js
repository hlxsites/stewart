import { createElement } from '../../scripts/scripts.js';
import initGrecaptcha, { executeGrecaptcha } from '../../scripts/grecaptcha.js';

const experianUrl = '/bin/stewart/experianintegration';
const stewartUrl = '';
const notCaliforniaResident = `Currently, this form is only available to California residents making requests pursuant to the CCPA. 
  If you are not a California resident but would like more information regarding Stewart's privacy policy, 
  please contact Stewart at 1-866-571-9270 or email us at <a href="mailto:compliance@stewart.com">compliance@stewart.com</a>.`;

let currentForm;
let contactInfoForm;
let requestInfoForm;

async function submitStep2(e) {
  e.preventDefault();
  const token = await executeGrecaptcha();

  contactInfoForm.querySelector('input[name="recaptcha-token"]').value = token;

  const response = await fetch(experianUrl, {
    method: 'POST',
    body: new URLSearchParams(new FormData(e.target)),
  });

  if (response.ok) {
    const data = await response.json();

    // Process Data
    console.log(data);

    contactInfoForm.classList.add('hidden');
    requestInfoForm.classList.remove('hidden');
  } else {
    console.log(response);
  }
}

function submitStep3() {
  requestInfoForm.submit();
}

function handleStep1(section) {
  section.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      currentForm.classList.add('hidden');

      if (e.currentTarget.value === 'y') {
        contactInfoForm.classList.remove('hidden');
      } else {
        const info = createElement('p', { class: 'info' }, notCaliforniaResident);
        currentForm.insertAdjacentElement('afterend', info);
      }
    });
  });
}

function handleStep2(section) {
  const recaptchaInput = createElement('input', { type: 'text', class: 'hidden', name: 'recaptcha-token' });
  contactInfoForm = createElement('form', { action: experianUrl, class: 'hidden' }, section);
  contactInfoForm.append(recaptchaInput);
  contactInfoForm.append(createElement('input', { type: 'submit', value: 'Next' }));

  contactInfoForm.addEventListener('submit', submitStep2);

  currentForm.insertAdjacentElement('afterend', contactInfoForm);

  initGrecaptcha(recaptchaInput);
}

function handleStep3(section) {
  requestInfoForm = createElement('form', { action: stewartUrl, class: 'hidden' }, section);
  requestInfoForm.append(createElement('input', { type: 'submit' }));

  requestInfoForm.addEventListener('submit', submitStep3);

  contactInfoForm.insertAdjacentElement('afterend', requestInfoForm);
}

export default function handleCCPA(form) {
  currentForm = form;
  currentForm.querySelectorAll('.form-section').forEach((section, index) => {
    switch (index) {
      case 0:
        handleStep1(section);
        break;
      case 1:
        handleStep2(section);
        break;
      case 2:
        handleStep3(section);
        break;
      default:
        break;
    }
  });

  currentForm.querySelector('input[type="submit"]').remove();
}
