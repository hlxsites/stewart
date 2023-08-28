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
  return false;
}
  
function registerForm(form) {
    const actionUrl = form.getAttribute('action');
    // strip off the first part of the url before /forms
    const action = actionUrl.substring(actionUrl.indexOf('/forms'));
    const registerAction = `https://admin.hlx.page/form/hlxsites/stewart/main${action}`;
    // Set form action to register action
    form.setAttribute('action', registerAction);
    // Trigger form submission
    try {
        form.setAttribute('target', '_blank');
        form.setAttribute('method', 'POST');
        form.submit();
    } finally {
        // Reset form action
        form.setAttribute('action', action);
    }
}

function registerForms() {
    const buttonStyle = 'width: 10em; background-color: var(--clr-green); border-radius: 5px; color: var(--clr-white); margin-left: 0.5em;width: 150px; height: 50px; color: white';

    window.top.document.querySelectorAll('form').forEach(form => {
        if (form.isRegistered) return;
        // Locate the submit button
        const submitButton = form.querySelector('button[type="submit"],input[type="submit"]');
        // Append a button to trigger auto-fill
        const autoFillButton = document.createElement('button');
        autoFillButton.innerText = 'Auto-fill';
        autoFillButton.onclick = () => autofillForm(form);
        autoFillButton.style.cssText = buttonStyle;
        submitButton.parentElement.append(autoFillButton);
        // Append a button to trigger form registration
        const registerButton = document.createElement('button');
        registerButton.innerText = 'Register Franklin';
        registerButton.onclick = () => registerForm(form);
        registerButton.style.cssText = buttonStyle;
        submitButton.parentElement.append(registerButton);
        form.isRegistered = true;
    });
}


async function init() {
    const registerFormButton = document.createElement('button');
    registerFormButton.onclick = registerForms;
    registerFormButton.innerText = 'Register forms';
    document.body.appendChild(registerFormButton);
}

init();