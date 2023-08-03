// eslint-disable-next-line import/no-cycle
import { sampleRUM, fetchPlaceholders, loadScript, getMetadata } from './lib-franklin.js';

function loadGoogleTagManager(placeholders) {
  // google tag manager
  const { gtmId } = placeholders;
  if (gtmId) {
    // eslint-disable-next-line
    (function (w, d, s, l, i) { w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }); var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f); })(window, document, 'script', 'dataLayer', gtmId);
  }
}

function OTLoaded() {
  if (window.OnetrustActiveGroups) {
    const activeGroups = window.OnetrustActiveGroups.split(',');
    // eslint-disable-next-line no-console
    console.log(`OneTrust Loaded. Active groups: ${activeGroups}`);
    // use active groups to determine what else is loaded
    // down the line, if blocks need to rely on this, e.g marketo form block
    // we could send an event here that blocks could listen on to trigger their loading.
  }
}

async function loadOneTrust(placeholders) {
  const otId = placeholders.onetrustId;
  if (otId) {
    window.OptanonWrapper = OTLoaded;

    await loadScript('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', {
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

  let section = getMetadata('section');
  let sectionL2 = getMetadata('sectionL2');
  if (!section) {
    const nameParts = window.location.pathname.split('/');
    section = nameParts[nameParts.length - 1];
  }
  if (!sectionL2) {
    sectionL2 = section;
  }

  const pageInfo = {
    shortUrl: window.location.pathname,
    pageName: document.querySelector('title').textContent,
    section,
    sectionL2,
    userId: '1ASN3A52', // user id is always anon, so ???
  };
  window.dataLayer.push(pageInfo);
}

async function runDelayed() {
  // Core Web Vitals RUM collection
  sampleRUM('cwv');

  initDataLayer();
  const placeholders = await fetchPlaceholders();
  // add more delayed functionality here
  await loadOneTrust(placeholders);
  loadGoogleTagManager(placeholders);
}

runDelayed();
