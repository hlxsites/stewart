// eslint-disable-next-line import/no-cycle
import { sampleRUM, fetchPlaceholders, loadScript } from './lib-franklin.js';

function loadGoogleTagManager(placeholders) {
  // google tag manager
  const { gtmId } = placeholders;
  if (gtmId) {
    // eslint-disable-next-line
    (function (w, d, s, l, i) { w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }); var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f); })(window, document, 'script', 'dataLayer', gtmId);
  }
}

function loadOneTrust(placeholders) {
  const otId = placeholders.onetrustId;
  if (otId) {
    window.OptanonWrapper = () => { };

    loadScript('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', {
      type: 'text/javascript',
      charset: 'UTF-8',
      'data-domain-script': otId,
    });
  }
}

function initDataLayer() {
  if (typeof (window.dataLayer) !== 'object') {
    window.dataLayer = [];
  }
  const pageInfo = {
    shortUrl: window.location.pathname,
    pageName: document.querySelector('title').textContent,
    // todo check on best way to populate these values
    // section probably from metadata (using spreadsheet to set bulk based on path)
    // user id is always anon, so ???
    section: '',
    sectionL2: '',
    userId: '1ASN3A52', // revisit?
  };
  window.dataLayer.push(pageInfo);
}

async function runDelayed() {
  // Core Web Vitals RUM collection
  sampleRUM('cwv');

  initDataLayer();
  const placeholders = await fetchPlaceholders();
  // add more delayed functionality here
  loadGoogleTagManager(placeholders);
  loadOneTrust(placeholders);
}

runDelayed();
