let thisform;

function formatAsMoney(amount, locale, currency) {
  return (amount).toLocaleString(locale || 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
  });
}

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

function Calculate() {
  let HomePrice = 0;
  HomePrice = cleanAndRound(thisform.querySelector('[name="homePrice"]').value);
  const DownPayment = cleanAndRound(thisform.querySelector('[name="downPayment"]').value);
  const AnnualInterestRate = cleanNumber(thisform.querySelector('[name="interestRate"]').value) / 100;
  const Years = cleanNumber(thisform.querySelector('[name="numberOfYears"]').value);
  const Rate = AnnualInterestRate / 12;
  const Payments = Years * 12;
  const Amount = HomePrice - DownPayment;
  const PandI = Math.floor(((Amount * Rate) / (1 - ((1 + Rate) ** (-1 * Payments)))) * 100) / 100;

  thisform.querySelector('.loanAmount').innerHTML = formatAsMoney(Amount);
  thisform.querySelector('.numberOfPayments').innerHTML = Payments;

  if (Number.isNaN(PandI) || !(Number.isFinite(parseInt(PandI, 10)))) {
    thisform.querySelector('.monthlyPandI').innerHTML = formatAsMoney(0.00);
  } else {
    thisform.querySelector('.monthlyPandI').innerHTML = formatAsMoney(PandI);
  }

  thisform.querySelector('#mortgageFormResults').classList.remove('hidden');
}

export default function mortgageCalc(evt) {
  evt.preventDefault();
  thisform = evt.currentTarget;

  let valid = true;
  let isFirstIndex = false;

  thisform.querySelectorAll('input').forEach((input) => {
    if (document.querySelector(`#${input.getAttribute('id')}-errormessage`)) {
      document.querySelector(`#${input.getAttribute('id')}-errormessage`).remove();
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

export function currencyUpdate(evt) {
  const elem = evt.currentTarget;
  elem.value = elem.value ? formatAsMoney(cleanNumber(elem.value)) : '';
  if (document.querySelector(`#${elem.getAttribute('id')}-errormessage`)) {
    document.querySelector(`#${elem.getAttribute('id')}-errormessage`).remove();
  }
  elem.classList.remove('invalid');
  elem.removeAttribute('aria-describedby');
  elem.setAttribute('aria-invalid', 'false');
}
