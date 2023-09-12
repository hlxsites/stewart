const placeholders = window.placeholders[document.documentElement.lang];

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

function getNum(x) {
  let y = x;
  if (typeof (y) === 'undefined') {
    y = 0;
  }
  y = String(y);
  y = y.replace(/[^0-9.-]/g, '');
  y = parseFloat(y);
  if (Number.isNaN(y)) {
    y = 0;
  }
  return y;
}

function printSchedule(p, t, r, s) {
  let principle = p;
  let term = t;
  let rate = r;
  let start = s;

  principle = Math.round(getNum(principle) * 100);
  term = getNum(term);
  rate = Math.round(getNum(rate) * 1000000);

  start = start.split('-');

  if (rate >= 1000000) {
    rate /= 100; // change % to decimal
  }

  let i;
  let n;
  const columns = ['date', 'real', 'interest', 'principle'];

  // html vars
  let tableRow;
  let tableData;
  const table = thisform.querySelector('[data-table="amortizationdata"]');
  const isGroupByYear = thisform.querySelector('[name="groupByYear"]').checked === true;
  let numRows;

  // static rate vars
  const monthlyRate = Math.round(rate / 12);
  const numPayments = term * 12;
  const pFactor = (1 + (monthlyRate / 1000000)) ** numPayments;
  const payment = (pFactor === 1)
    ? Math.ceil(principle / numPayments)
    : Math.ceil((principle * ((monthlyRate * pFactor) / 1000000)) / (pFactor - 1));

  const startDate = new Date(start[0], start[1], start[2]);

  const monthly = {
    principle,
    payment,
    month: startDate.getMonth(),
    year: startDate.getFullYear(),
  };
  const yearly = {
    real: 0,
    interest: 0,
  };
  let totalInterest = 0;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fill amortResultsTable with data
  for (n = 1; n <= numPayments; n += 1) {
    // advance a year, if app.
    if (monthly.month === 12) {
      monthly.month = 0;
      monthly.year += 1;
      yearly.real = 0;
      yearly.interest = 0;
    }

    // set date output
    monthly.date = `${months[monthly.month]} ${monthly.year}`;
    yearly.date = `${placeholders?.year || 'Year'} ${monthly.year}`;

    // calc interest
    monthly.interest = Math.round((monthly.principle * monthlyRate) / 1000000);
    yearly.interest += monthly.interest;
    totalInterest += monthly.interest;

    // adjust last payment amount, if app.
    if (monthly.principle + monthly.interest < monthly.payment) {
      monthly.payment = monthly.principle + monthly.interest;
    }

    // calc principle paid & remaining balance
    monthly.real = monthly.payment - monthly.interest;
    monthly.principle -= monthly.real;
    yearly.real += monthly.real;
    yearly.principle = monthly.principle;

    numRows = table.rows.length;

    if (isGroupByYear) {
      if (monthly.month === 11 || n === numPayments) {
        tableRow = table.insertRow(numRows);
        for (i = 0; i < columns.length; i += 1) {
          tableData = tableRow.insertCell(i);

          if (i === 0) {
            tableData.innerHTML = yearly[columns[i]];
          } else if (i === 1) {
            tableData.innerHTML = `<span>${placeholders?.principalPaid || 'Principal Paid'}</span><span>${formatAsMoney(yearly[columns[i]] / 100)}</span>`;
          } else if (i === 2) {
            tableData.innerHTML = `<span>${placeholders?.interestPaid || 'Interest Paid'}</span><span>${formatAsMoney(yearly[columns[i]] / 100)}</span>`;
          } else if (i === 3) {
            tableData.innerHTML = `<span>${placeholders?.remainingBalance || 'Remaining Balance'}</span><span>${formatAsMoney(yearly[columns[i]] / 100)}</span>`;
          }
        }
      }
    } else {
      tableRow = table.insertRow(numRows);
      for (i = 0; i < columns.length; i += 1) {
        tableData = tableRow.insertCell(i);
        if (i === 0) {
          tableData.innerHTML = monthly[columns[i]];
        } else if (i === 1) {
          tableData.innerHTML = `<span>${placeholders?.principalPaid || 'Principal Paid'}</span><span>${formatAsMoney(monthly[columns[i]] / 100)}</span>`;
        } else if (i === 2) {
          tableData.innerHTML = `<span>${placeholders?.interestPaid || 'Interest Paid'}</span><span>${formatAsMoney(monthly[columns[i]] / 100)}</span>`;
        } else if (i === 3) {
          tableData.innerHTML = `<span>${placeholders?.remainingBalance || 'Remaining Balance'}</span><span>${formatAsMoney(monthly[columns[i]] / 100)}</span>`;
        }
      }
    }

    monthly.month += 1;
  }

  // display totals
  thisform.querySelector('.monthlyPayment').innerHTML = formatAsMoney(payment / 100);
  thisform.querySelector('.totalYearlyPayment').innerHTML = formatAsMoney((payment * 12) / 100);
  thisform.querySelector('.totalLifetimePayments').innerHTML = formatAsMoney((principle + totalInterest) / 100);
  thisform.querySelector('.totalLifetimeInterest').innerHTML = formatAsMoney(totalInterest / 100);
}

function Calculate() {
  const principle = cleanAndRound(thisform.querySelector('[name="loanAmount"]').value);
  const term = cleanAndRound(thisform.querySelector('[name="loanTerm"]').value);
  const rate = cleanAndRound(thisform.querySelector('[name="annualInterestRate"]').value);
  const start = thisform.querySelector('[name="dateOfFirstPayment"]').value;
  const table = thisform.querySelector('[data-table="amortizationdata"]');
  let numRows = table.rows.length;
  const isLoanAmount = (principle > 0);
  const isDateOfFirstPayment = (start !== '' && start !== undefined);

  thisform.setAttribute('data-calculated', 'true');

  while (numRows > 0) {
    table.deleteRow(numRows - 1);
    numRows = table.rows.length;
  }

  if (isLoanAmount && isDateOfFirstPayment) {
    printSchedule(principle, term, rate, start);
    thisform.querySelector('#amortizationFormResults').classList.remove('hidden');
  } else {
    thisform.querySelector('#amortizationFormResults').classList.add('hidden');
  }
}

export default function amortizationCalc(evt) {
  let valid = true;

  evt.preventDefault();
  thisform = evt.currentTarget;

  thisform.querySelectorAll('input').forEach((input) => {
    if (document.querySelector(`#${input.getAttribute('id')}-errormessage`)) {
      document.querySelector(`#${input.getAttribute('id')}-errormessage`).remove();
    }

    input.classList.remove('invalid');

    if (!input.checkValidity()) {
      valid = false;
      input.classList.add('invalid');
      if (!document.querySelector(`#${input.getAttribute('id')}-errormessage`)) {
        input.insertAdjacentHTML('afterend', `<span class='inputerrormessage' id="${input.getAttribute('id')}-errormessage"> ${input.getAttribute('data-error-message')}</span>`);
      }
    }
  });

  if (valid) {
    Calculate();
  }
}

export function loanAmountUpdate(evt) {
  evt.currentTarget.value = formatAsMoney(cleanNumber(evt.currentTarget.value));
}

export function loanScheduleUpdate(evt) {
  if (evt.currentTarget.dataset.value === 'true') {
    document.getElementById('groupByYear').checked = true;
  } else {
    document.getElementById('groupByYear').checked = false;
  }

  document.querySelector('.togglefield-controls > div[data-selected]').removeAttribute('data-selected');
  evt.currentTarget.setAttribute('data-selected', 'true');

  Calculate();
}

export function print() {
  window.print();
}
