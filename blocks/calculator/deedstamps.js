let thisform;
let currentInputName;

function roundToHundredths(num) { // annoying float precision forces the +0.000001
  return Math.round(parseFloat(num) * 100 + 0.000001) / 100;
}

function cleanNumber(num) {
  const val = (num && num.replace) ? num.replace(/[^\d.-]/g, '') : num;
  if (val === '') {
    return 0;
  }
  if (Number.isFinite(parseInt(val, 10))) {
    return parseFloat(val);
  }
  return 0;
}

function cleanAndRound(num) {
  return roundToHundredths(cleanNumber(num));
}

function formatAsMoney(amount, locale, currency) {
  return (amount).toLocaleString(locale || 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
  });
}

function Calculate() {
  thisform.setAttribute('data-calculated', 'true');

  thisform.querySelector('.calculator-form-results').setAttribute('aria-live', 'assertive');

  const isMiami = (thisform.querySelector('[name="propertyLocation"]:checked').value === 'miami');
  const transferTaxRate = isMiami ? 0.60 : 0.70;
  const salesPrice = (Math.ceil((cleanAndRound(thisform.querySelector('[name="salesPrice"]').value)) / 100)) * 100;
  const LoanAmount = (Math.ceil((cleanAndRound(thisform.querySelector('[name="loanAmount"]').value)) / 100)) * 100;

  thisform.querySelector('.surtax').innerHTML = formatAsMoney((salesPrice / 100) * 0.45);
  thisform.querySelector('.mortgageDocStamps').innerHTML = formatAsMoney((LoanAmount / 100) * 0.35);
  thisform.querySelector('.intangibleTax').innerHTML = formatAsMoney(cleanAndRound(thisform.querySelector('[name="loanAmount"]').value) * 0.002);
  thisform.querySelector('.transferTax').innerHTML = formatAsMoney((salesPrice / 100) * transferTaxRate);

  thisform.querySelector('#calculatorFormResults').classList.remove('hidden');
}

export default function deedStampsCalc(evt) {
  evt.preventDefault();
  thisform = evt.currentTarget;

  let valid = true;
  let isFirstIndex = false;
  thisform.querySelectorAll('input[type="text"]').forEach((input) => {
    if (document.getElementById(`#${input.getAttribute('id')}-errormessage`)) {
      document.getElementById(`#${input.getAttribute('id')}-errormessage`).remove();
    }
    input.classList.remove('invalid');
    input.removeAttribute('aria-describedby');
    input.setAttribute('aria-invalid', 'false');

    if (!input.checkValidity()) {
      valid = false;
      input.classList.add('invalid');
      input.setAttribute('aria-describedby', `${input.getAttribute('id')}-errormessage`);
      input.setAttribute('aria-invalid', 'true');
      if (!isFirstIndex) {
        isFirstIndex = true;
        input.focus();
      }

      if (!document.querySelector(`#${input.getAttribute('id')}-errormessage`)) {
        input.insertAdjacentHTML('afterend', `<span class="inputerrormessage" role="alert" id="${input.getAttribute('id')}-errormessage"> ${input.getAttribute('data-error-message')}</span>`);
      }
    }
  });

  if (valid) {
    Calculate();
  }
}

export function inputUpdate(evt) {
  thisform = evt.currentTarget.closest('form');
  thisform.setAttribute('data-calculated', 'false');
  thisform.querySelector('.calculator-form-results').removeAttribute('aria-live');
  thisform.querySelector('#calculatorFormResults').classList.add('hidden');
}

export function currencyUpdate(evt) {
  const elem = evt.currentTarget;
  elem.value = elem.value ? formatAsMoney(cleanNumber(elem.value)) : '';
  if (document.querySelector(`${elem.getAttribute('id')}-errormessage`)) {
    document.querySelector(`${elem.getAttribute('id')}-errormessage`).remove();
  }
  elem.classList.remove('invalid');
  elem.removeAttribute('aria-describedby');
  elem.setAttribute('aria-invalid', 'false');
}

function checkConditionalMatch(evt) {
  if (typeof evt === 'string') {
    currentInputName = evt;
  } else {
    currentInputName = evt.currentTarget.name;
  }

  const isRadioOrCheckbox = ['radio', 'checkbox'].includes(document.querySelector(`[name="${currentInputName}"]`).attributes.type.nodeValue);
  const isSelect = document.querySelector(`[name="${currentInputName}"]`).tagName === 'SELECT';
  const inputValue = [];
  if (isRadioOrCheckbox) {
    document.querySelectorAll(`[name="${currentInputName}"]:checked`).forEach((input) => {
      inputValue[inputValue.length] = input.value;
    });
  } else if (isSelect) {
    document.querySelectorAll(`[name="${currentInputName}"] option:selected`).forEach((option) => {
      inputValue[inputValue.length] = option.value;
    });
  } else {
    document.querySelectorAll(`[name="${currentInputName}"]`).forEach((input) => {
      inputValue[inputValue.length] = input.value;
    });
  }

  document.querySelectorAll('[data-conditional-match="content"]').forEach((elem1) => {
    const contentName = elem1.getAttribute('data-input-name');
    const contentNameArray = [contentName];

    for (let i = 0; i < contentNameArray.length; i += 1) {
      if (contentNameArray[i] === currentInputName) {
        let isSlideup = true;
        for (let j = 0; j < inputValue.length; j += 1) {
          const contentValue = elem1.getAttribute('data-input-value');
          const contentValueArray = [contentValue];

          for (let k = 0; k < contentValueArray.length; k += 1) {
            if (contentValueArray[k] === inputValue[j]) {
              elem1.classList.remove('hidden');
              isSlideup = false;
            }
          }
        }
        if (isSlideup) {
          elem1.classList.add('hidden');
        }
      } else if (currentInputName === 'propertyLocation') {
        elem1.classList.add('hidden');
      }
    }
  });
}

export function conditionalMatch(elem) {
  const condMatch = elem.getAttribute('data-conditional-match');
  const isContent = (condMatch === 'content');
  const isTrigger = (condMatch === 'trigger');

  if (isContent) {
    elem.classList.add('hidden');
  }

  if (isTrigger) {
    const inputName = elem.getAttribute('name');

    document.querySelectorAll(`[name="${inputName}"]`).forEach((elem2) => {
      elem2.onchange = checkConditionalMatch;
    });

    elem.onkeyup = checkConditionalMatch;

    checkConditionalMatch(inputName);
  }
}
