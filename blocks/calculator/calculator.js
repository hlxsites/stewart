import { createElement } from '../../scripts/scripts.js';
import amortizationCalc, { loanAmountUpdate, loanScheduleUpdate, print } from './amortization.js';
import deedStampsCalc, { inputUpdate, currencyUpdate, conditionalMatch } from './deedstamps.js';
import mortgageCalc, { currencyUpdate as mortgageCurrenyUpdate } from './mortgage.js';
import { amortization, deedstamps, mortgage } from './markup.js';

function buildAmortization() {
  const html = createElement('div', { class: 'inner-wrapper' }, amortization);

  html.querySelector('#amortization').onsubmit = amortizationCalc;
  html.querySelector('#loanAmountInput').onchange = loanAmountUpdate;
  html.querySelector('#printbutton').onclick = print;
  html.querySelectorAll('.togglefield-option').forEach((elem) => {
    elem.onclick = loanScheduleUpdate;
  });

  return html;
}

function buildDeedstamps() {
  const html = createElement('div', { class: 'inner-wrapper' }, deedstamps);

  html.querySelector('#deedstamps').onsubmit = deedStampsCalc;

  html.querySelectorAll('input[data-type="currency"]').forEach((input) => {
    input.onchange = currencyUpdate;
  });

  html.querySelectorAll('input[type="radio"], input[type="text"]').forEach((input) => {
    input.addEventListener('change', inputUpdate);
  });

  return html;
}

function buildMortgage() {
  const html = createElement('div', { class: 'inner-wrapper' }, mortgage);

  html.querySelector('#mortgage').onsubmit = mortgageCalc;

  html.querySelectorAll('input[data-type="currency"]').forEach((input) => {
    input.onchange = mortgageCurrenyUpdate;
  });

  return html;
}

function addConditionalMatch() {
  document.querySelectorAll('[data-conditional-match]').forEach((elem) => {
    conditionalMatch(elem);
  });
}

export default function decorate(block) {
  if (block.classList.contains('deedstamps')) {
    block.replaceChildren(buildDeedstamps());
    addConditionalMatch();
  } else if (block.classList.contains('mortgage')) {
    block.replaceChildren(buildMortgage());
  } else {
    block.replaceChildren(buildAmortization());
  }
}
