import { readBlockConfig, fetchPlaceholders, loadScript } from '../../scripts/lib-franklin.js';

/**
 * decorate the block
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const cfg = readBlockConfig(block);

  const placeholders = await fetchPlaceholders();
  const formId = cfg['form-id'];
  const { munchkinId } = placeholders;
  const redirectUrl = cfg.redirect || placeholders.formRedirect;

  block.innerHTML = `<form id="mktoForm_${formId}"></form>`;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();

      loadScript(`https://${munchkinId}.mktoweb.com/js/forms2/js/forms2.min.js`).then(() => {
        // eslint-disable-next-line no-undef
        MktoForms2.loadForm(
          `https://${munchkinId}.mktoweb.com`,
          munchkinId,
          formId,
          (form) => {
            if (form) {
              form.onSuccess(() => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                  event: 'mkto_form_submit',
                  eventCallback: () => {
                    if (redirectUrl) {
                      window.location.pathname = redirectUrl;
                    } else {
                      block.insertAdjacentHTML('afterbegin', '<div class="alert alert-success"><p><strong>Success:</strong> Your information was submitted successfully.</p></div>');
                    }
                  },
                });
              });
            }
            return false;
          },
        );
      });
    }
  });
  observer.observe(block);
}
