import { getLocalePlaceholders } from '../../scripts/scripts.js';

const placeholders = getLocalePlaceholders();

export const amortization = `
  <form id='amortization' class='amortization' novalidate>
    <div class='calculator-form'>
      <fieldset>
        <div class='row'>
          <div class='column col-50'>
            <label for='loanAmountInput'>${placeholders?.loanAmount || 'Loan Amount'}</label>
            <input type='text' id='loanAmountInput' name='loanAmount' placeholder='$ 0.00' required data-type='currency'
            data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
          <div class='column col-50'>
            <label for='loanTermInput'>${placeholders?.loanTerm || 'Loan Term'}</label>
            <input type='number' id='loanTermInput' name='loanTerm' placeholder='0' step='1.0' required
            data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
        </div>
        <div class='row'>
          <div class='column col-50'>
            <label for='annualInterestRateInput'>${placeholders?.annualInterestRate || 'Annual Interest Rate'}</label>
            <input type='number' id='annualInterestRateInput' name='annualInterestRate' placeholder='0.00' min='0' step='any' required 
            data-type='percent' data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
          <div class='column col-50'>
            <label for='dateOfFirstPaymentInput'>${placeholders?.dateOfFirstPayment || 'Date of First Payment'}</label>
            <input type='date' id='dateOfFirstPaymentInput' name='dateOfFirstPayment' placeholder='mm/dd/yyyy' autocomplete='off' required
            data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
        </div>
      </fieldset>
      <div class='row'>
        <div class='column'>
          <button type="submit" class="button primary">${placeholders?.calculate || 'Calculate'}</button>
        </div>
      </div>
    </div>

    <div id='amortizationFormResults' class="calculator-form-results hidden">

      <div class="results-summary">
        <div class="title">
          <i class="fal fa-money-check-edit-alt"></i>
          <h4>${placeholders?.summary || 'Summary'}</h4>
        </div>
        <div class="datatable row">
          <div class="dataitem column col-50">
            <span class="label">${placeholders?.monthlyPayment || 'Monthly Payment'}</span>
            <span data-type="currency" data-local="US" class="monthlyPayment data">0.00</span>
          </div>
          <div class="dataitem column col-50">
            <span class="label">${placeholders?.totalYearlyPayment || 'Total Yearly Payment'}</span>
            <span data-type="currency" data-local="US" class="totalYearlyPayment data">0.00</span>
          </div>
          <div class="dataitem column col-50">
            <span class="label">${placeholders?.totalLifetimePayment || 'Total Lifetime Payments'}</span>
            <span data-type="currency" data-local="US" class="totalLifetimePayments data">0.00</span>
          </div>
          <div class="dataitem column col-50">
            <span class="label">${placeholders?.totalLifetimeInterest || 'Total Lifetime Interest'}</span>
            <span data-type="currency" data-local="US" class="totalLifetimeInterest data">0.00</span>
          </div>
        </div>
      </div>

      <div class="results-calculated">
        <div class="title">
          <i class="fal fa-calendar"></i>
          <h4>${placeholders?.payments || 'Payments'}</h4>
          <div id='printbutton' class="printbutton">
            <i class="far fa-print"></i>
            <span>${placeholders?.print || 'Print'}</span>
          </div>
          <div class="togglefield">
            <div class="togglefield-controls">
              <div class="togglefield-option" data-for="groupByYear" data-value="false" data-selected="true" type="button">${placeholders?.monthly || 'Monthly'}</div>
              <div class="togglefield-option" data-for="groupByYear" data-value="true" type="button">${placeholders?.yearly || 'Yearly'}</div>
            </div>
            <label for="groupByYear">${placeholders?.groupByYear || 'Group by Year'}</label>
            <input id="groupByYear" type="checkbox" name="groupByYear" />
          </div>
        </div>
        <div class="amortization" data-table="amortization">
          <table>
            <thead>
            <tr>
              <th>${placeholders?.paymentDate || 'Payment Date'}</th>
              <th>${placeholders?.principalPaid || 'Principal Paid'}</th>
              <th>${placeholders?.interestPaid || 'Interest Paid'}</th>
              <th>${placeholders?.remainingBalance || 'Remaining Balance'}</th>
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
`;

export const deedstamps = `
  <form id='deedstamps' class='deedstamps' novalidate>
    <div class='calculator-form'>
      <fieldset>
        <div class='row'>
          <div class='column col-50'>
            <legend id='propertyLocationLegend'>${placeholders?.propertyLocation || 'Property Location'}</legend>
            <div class='form-group' area-labelledby='propertyLocationLegend'>
              <div>
                <input type='radio' id='propertyLocationMiami' name='propertyLocation' value='miami' data-conditional-match="trigger" />
                <label for='propertyLocationMiami' id='propertyLocationMiamiLabel'>${placeholders?.miamiDadeCounty || 'Miami-Dade County'}</label>
              </div>
              <div>
                <input type='radio' id='propertyLocationOther' name='propertyLocation' value='other' checked />
                <label for='propertyLocationOther' id='propertyLocationOtherLabel'>${placeholders?.otherCounties || 'Other Counties'}</label>
              </div>
            </div>
          </div>
        </div>
        <div class='row hidden' data-conditional-match="content" data-input-name="propertyLocation" data-input-value="miami">
          <div class='column col-50'>
            <legend id='singleFamilyDwellingLegend'>${placeholders?.singleFamilyDwelling || 'Single Family Dwelling'}</legend>
            <div class='form-group' area-labelledby='singleFamilyDwellingLegend'>
              <div>
                <input type='radio' id='singleFamilyDwellingYes' name='singleFamilyDwelling' value='true' checked />
                <label for='singleFamilyDwellingYes' id='singleFamilyDwellingyesLabel'>${placeholders?.yes || 'Yes'}</label>
              </div>
              <div>
                <input type='radio' id='singleFamilyDwellingNo' name='singleFamilyDwelling' value='false' data-conditional-match="trigger" />
                <label for='singleFamilyDwellingNo' id='singleFamilyDwellingNoLabel'>${placeholders?.no || 'No'}</label>
              </div>
            </div>
          </div>
        </div>
        <div class='row'>
          <div class='column col-50'>
            <label for='salesPriceInput'>${placeholders?.salesPrice || 'Sales Price'}</label>
            <input type='text' id='salesPriceInput' name='salesPrice' placeholder='0.00' required data-type='currency'
            data-error-message='${placeholders?.salesPriceIsRequired || 'Sales Price is required'}' area-invalid='false' />
          </div>
          <div class='column col-50'>
            <label for='loanAmountInput'>${placeholders?.loanAmount || 'Loan Amount'}</label>
            <input type='text' id='loanAmountInput' name='loanAmount' placeholder='0.00' required data-type='currency'
            data-error-message='${placeholders?.loanAmountIsRequired || 'Loan Amount is required'}' area-invalid='false' />
          </div>
        </div>
      </fieldset>
      <div class='row'>
        <div class='column'>
          <button type="submit" class="button primary">${placeholders?.calculate || 'Calculate'}</button>
        </div>
      </div>
    </div>

    <div id="deedstampsFormResults" class="calculator-form-results hidden">
      <div class="results-summary">
        <div class="title">
          <i class="fal fa-money-check-edit-alt"></i>
          <h4>${placeholders?.summary || 'Summary'}</h4>
        </div>
        <div class="datatable row" data-conditional-match="content" data-input-name="singleFamilyDwelling" data-input-value="false">
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.surtax || 'Surtax'}</span>
            <span data-type="currency" data-local="US" class="surtax data">0.00</span>
          </div>
        </div>
        <div class="datatable row">
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.floridaMortgageDocStamps || 'Florida Mortgage Doc Stamps'}</span>
            <span data-type="currency" data-local="US" class="mortgageDocStamps data">0.00</span>
          </div>
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.floridaIntangibleTax || 'Florida Intangible Tax'}</span>
            <span data-type="currency" data-local="US" class="intangibleTax data">0.00</span>
          </div>
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.deedDocStamps || 'Deed Doc Stamps'}</span>
            <span data-type="currency" data-local="US" class="transferTax data">0.00</span>
          </div>
        </div>
      </div>
    </div>
  </form>
`;

export const mortgage = `
  <form id='mortgage' class='mortgage' novalidate>
    <div class='calculator-form'>
      <fieldset>
        <div class='row'>
          <div class='column col-50'>
            <label for='homePriceInput'>${placeholders?.homePrice || 'Home Price'}</label>
            <input type='text' id='homePriceInput' name='homePrice' placeholder='$ 0.00' required data-type='currency'
            data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
          <div class='column col-50'>
            <label for='downPaymentInput'>${placeholders?.downPayment || 'Down Payment'}</label>
            <input type='text' id='downPaymentInput' name='downPayment' placeholder='$ 0.00' required data-type='currency'
            data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
        </div>
        <div class='row'>
          <div class='column col-50'>
            <label for='annualInterestRateInput'>${placeholders?.annualInterestRate || 'Annual Interest Rate'}</label>
            <input type='number' id='annualInterestRateInput' name='interestRate' placeholder='0.00' min='0' step='any' required 
            data-type='percent' data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
          <div class='column col-50'>
            <label for='numberOfYearsInput'>${placeholders?.numberOfYears || 'Number of Years'}</label>
            <input type='number' id='numberOfYearsInput' name='numberOfYears' min='0' step='1.0' required value='30' 
            data-type='percent' data-error-message='${placeholders?.required || 'Required'}' area-invalid='false' />
          </div>
        </div>
      </fieldset>
      <div class='row'>
        <div class='column'>
          <button type="submit" class="button primary">${placeholders?.calculate || 'Calculate'}</button>
        </div>
      </div>
    </div>
    <div id="mortgageFormResults" class="calculator-form-results hidden">
      <div class="results-summary">
        <div class="title">
          <i class="fal fa-money-check-edit-alt"></i>
          <h4>${placeholders?.summary || 'Summary'}</h4>
        </div>
        <div class="datatable row">
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.loanAmount || 'Loan Amount'}</span>
            <span data-type="currency" data-local="US" class="loanAmount data">0.00</span>
          </div>
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.numberOfPayments || 'Number of Payments'}</span>
            <span class="numberOfPayments data">0</span>
          </div>
          <div class="column col-50 dataitem">
            <span class="label">${placeholders?.monthlyPrincipalAndInterest || 'Monthly Principal and Interest'}</span>
            <span data-type="currency" data-local="US" class="monthlyPandI data">0.00</span>
          </div>
        </div>
      </div>
    </div>
  </form>
`;
