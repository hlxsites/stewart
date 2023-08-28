/**
 * Autofill the form with test data
 * @param {FormElement} form Form to autofill
 */
function autofillForm(form) {
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
}
  
function registerForm(form) {
    const action = form.getAttribute('action');
    const registerAction = `https://admin.hlx.page/form/hlxsites/stewart/main${action}.json`;
    // Set form action to register action
    form.setAttribute('action', registerAction);
    // Trigger form submission
    try {
        form.submit();
    } finally {
        // Reset form action
        form.setAttribute('action', action);
    }
}

async function init() {
    window.top.document.querySelectorAll('form').forEach(form => {
        // Locate the submit button
        const submitButton = form.querySelector('button[type="submit"]');
        // Append a button to trigger auto-fill
        const autoFillButton = document.createElement('button');
        autoFillButton.innerText = 'Auto-fill';
        autoFillButton.onclick = () => autofillForm(form);
        submitButton.insertAdjacentElement('afterend', autoFillButton);
        // Append a button to trigger form registration
        const registerButton = document.createElement('button');
        registerButton.innerText = 'Register Franklin';
        registerButton.onclick = () => registerForm(form);
        submitButton.insertAdjacentElement('afterend', registerButton);
    });
}

init();