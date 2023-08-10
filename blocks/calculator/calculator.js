import { createElement } from '../../scripts/scripts.js';
import amortizationCalc, { loanAmountUpdate, loanScheduleUpdate, print } from './amortization.js';
import deedStampsCalc, { inputUpdate, currencyUpdate, conditionalMatch } from './deedstamps.js';

function buildAmortization() {
  const html = createElement('div', { class: 'inner-wrapper' }, `
    <form id='amortization' class='amortization' novalidate>
      <div class='calculator-form'>
        <fieldset>
          <div class='row'>
            <div class='column col-50'>
              <label for='loanAmountInput'>Loan Amount</label>
              <input type='text' id='loanAmountInput' name='loanAmount' placeholder='$ 0.00' required data-type='currency'
              data-error-message='Required' area-invalid='false' />
            </div>
            <div class='column col-50'>
              <label for='loanTermInput'>Loan Term</label>
              <input type='number' id='loanTermInput' name='loanTerm' placeholder='0' step='1.0' required
              data-error-message='Required' area-invalid='false' />
            </div>
          </div>
          <div class='row'>
            <div class='column col-50'>
              <label for='annualInterestRateInput'>Annual Interest Rate</label>
              <input type='number' id='annualInterestRateInput' name='annualInterestRate' placeholder='0.00' min='0' step='any' required 
              data-type='percent' data-error-message='Required' area-invalid='false' />
            </div>
            <div class='column col-50'>
              <label for='dateOfFirstPaymentInput'>Date of First Payment</label>
              <input type='date' id='dateOfFirstPaymentInput' name='dateOfFirstPayment' placeholder='mm/dd/yyyy' autocomplete='off' required
              data-error-message='Required' area-invalid='false' />
            </div>
          </div>
        </fieldset>
        <div class='row'>
          <div class='column'>
            <button type="submit" class="button primary">Calculate</button>
          </div>
        </div>
      </div>

      <div id='calculatorFormResults' class="calculator-form-results hidden">

        <div class="results-summary">
          <div class="title">
            <i class="fal fa-money-check-edit-alt"></i>
            <h4>Summary</h4>
          </div>
          <div class="datatable row">
            <div class="dataitem column col-50">
              <span class="label">
                Monthly Payment
              </span>
              <span data-type="currency" data-local="US" class="monthlyPayment data">0.00</span>
            </div>
            <div class="dataitem column col-50">
              <span class="label">Total Yearly Payment</span>
              <span data-type="currency" data-local="US" class="totalYearlyPayment data">0.00</span>
            </div>
            <div class="dataitem column col-50">
              <span class="label">
                Total Lifetime Payments
              </span>
              <span data-type="currency" data-local="US" class="totalLifetimePayments data">0.00</span>
            </div>
            <div class="dataitem column col-50">
              <span class="label">
                Total Lifetime Interest
              </span>
              <span data-type="currency" data-local="US" class="totalLifetimeInterest data">0.00</span>
            </div>
          </div>
        </div>

        <div class="results-calculated">
          <div class="title">
            <i class="fal fa-calendar"></i>
            <h4>Payments</h4>
            <div id='printbutton' class="printbutton">
              <i class="far fa-print"></i>
              <span>Print</span>
            </div>
            <div class="togglefield">
              <div class="togglefield-controls">
                <div class="togglefield-option" data-for="groupByYear" data-value="false" data-selected="true" type="button">Monthly</div>
                <div class="togglefield-option" data-for="groupByYear" data-value="true" type="button">Yearly</div>
              </div>
              <label for="groupByYear">Group by Year</label>
              <input id="groupByYear" type="checkbox" name="groupByYear" />
            </div>
          </div>
          <div class="amortization" data-table="amortization">
            <table>
              <thead>
              <tr>
                <th>Payment Date</th>
                <th>Principal Paid</th>
                <th>Interest Paid</th>
                <th>Remaining Balance</th>
              </tr>
              </thead>
              <tbody data-table="amortizationdata">
              </tbody>
            </table>
          </div>
        </div>

      </div>
      <div class="form-actions form-actions-total"></div>
    </form>
  `);

  html.querySelector('#amortization').onsubmit = amortizationCalc;
  html.querySelector('#loanAmountInput').onchange = loanAmountUpdate;
  html.querySelector('#printbutton').onclick = print;
  html.querySelectorAll('.togglefield-option').forEach((elem) => {
    elem.onclick = loanScheduleUpdate;
  });

  return html;
}

function buildDeedstamps() {
  const html = createElement('div', { class: 'inner-wrapper' }, `
    <form id='deedstamps' class='deedstamps' novalidate>
      <div class='calculator-form'>
        <fieldset>
          <div class='row'>
            <div class='column col-50'>
              <legend id='propertyLocationLegend'>Property Location</legend>
              <div class='form-group' area-labelledby='propertyLocationLegend'>
                <div>
                  <input type='radio' id='propertyLocationMiami' name='propertyLocation' value='miami' data-conditional-match="trigger" />
                  <label for='propertyLocationMiami' id='propertyLocationMiamiLabel'>Miami-Dade County</label>
                </div>
                <div>
                  <input type='radio' id='propertyLocationOther' name='propertyLocation' value='other' checked />
                  <label for='propertyLocationOther' id='propertyLocationOtherLabel'>Other Counties</label>
                </div>
              </div>
            </div>
          </div>
          <div class='row hidden' data-conditional-match="content" data-input-name="propertyLocation" data-input-value="miami">
            <div class='column col-50'>
              <legend id='singleFamilyDwellingLegend'>Single Family Dwelling</legend>
              <div class='form-group' area-labelledby='singleFamilyDwellingLegend'>
                <div>
                  <input type='radio' id='singleFamilyDwellingYes' name='singleFamilyDwelling' value='true' checked />
                  <label for='singleFamilyDwellingYes' id='singleFamilyDwellingyesLabel'>Yes</label>
                </div>
                <div>
                  <input type='radio' id='singleFamilyDwellingNo' name='singleFamilyDwelling' value='false' data-conditional-match="trigger" />
                  <label for='singleFamilyDwellingNo' id='singleFamilyDwellingNoLabel'>No</label>
                </div>
              </div>
            </div>
          </div>
          <div class='row'>
            <div class='column col-50'>
              <label for='salesPriceInput'>Sales Price</label>
              <input type='text' id='salesPriceInput' name='salesPrice' placeholder='0.00' required data-type='currency'
              data-error-message='Sales Price is required' area-invalid='false' />
            </div>
            <div class='column col-50'>
              <label for='loanAmountInput'>Loan Amount</label>
              <input type='text' id='loanAmountInput' name='loanAmount' placeholder='0.00' required data-type='currency'
              data-error-message='Loan Amount is required' area-invalid='false' />
            </div>
          </div>
        </fieldset>
        <div class='row'>
          <div class='column'>
            <button type="submit" class="button primary">Calculate</button>
          </div>
        </div>
      </div>

      <div id="calculatorFormResults" class="calculator-form-results hidden">
        <div class="results-summary">
          <div class="title">
            <i class="fal fa-money-check-edit-alt"></i>
            <h4>Summary</h4>
          </div>
          <div class="datatable row" data-conditional-match="content" data-input-name="singleFamilyDwelling" data-input-value="false">
            <div class="column col-50 dataitem">
              <span class="label">Surtax</span>
              <span data-type="currency" data-local="US" class="surtax data">0.00</span>
            </div>
          </div>
          <div class="datatable row">
            <div class="column col-50 dataitem">
              <span class="label">Florida Mortgage Doc Stamps</span>
              <span data-type="currency" data-local="US" class="mortgageDocStamps data">0.00</span>
            </div>
            <div class="column col-50 dataitem">
              <span class="label">Florida Intangible Tax</span>
              <span data-type="currency" data-local="US" class="intangibleTax data">0.00</span>
            </div>
            <div class="column col-50 dataitem">
              <span class="label">Deed Doc Stamps</span>
              <span data-type="currency" data-local="US" class="transferTax data">0.00</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  `);

  html.querySelector('#deedstamps').onsubmit = deedStampsCalc;

  html.querySelectorAll('input[data-type="currency"]').forEach((input) => {
    input.onchange = currencyUpdate;
  });

  html.querySelectorAll('input[type="radio"], input[type="text"]').forEach((input) => {
    input.addEventListener('change', inputUpdate);
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
  } else {
    block.replaceChildren(buildAmortization());
  }
}
