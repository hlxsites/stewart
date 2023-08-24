const recaptchaUrl = '//www.google.com/recaptcha/api.js?render=6Lc8rwYaAAAAAGsJKqZhD-FjPHtuq1D56kx47AnM';
const siteKey = '6Lc8rwYaAAAAAGsJKqZhD-FjPHtuq1D56kx47AnM';
let recaptchaToken = '';

function loadScript() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = recaptchaUrl;
  document.head.append(script);
}

export async function executeGrecaptcha() {
  return new Promise((resolve) => {
    if (!recaptchaToken) {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action: 'submit' })
          .then((token) => resolve(token))
          .catch(() => resolve(''));
      });
    } else {
      resolve(recaptchaToken);
    }
  });
}

export default function initGrecaptcha(tokenField) {
  loadScript();

  if (tokenField instanceof HTMLElement) {
    if (tokenField.nodeName === 'INPUT') {
      recaptchaToken = tokenField.value;
    } else {
      recaptchaToken = tokenField.innerText;
    }
  }
}
