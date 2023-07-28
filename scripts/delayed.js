// eslint-disable-next-line import/no-cycle
import { sampleRUM, fetchPlaceholders } from './lib-franklin.js';

async function loadGoogleTagManager() {
  const placeholders = await fetchPlaceholders();
  // google tag manager
  const { gtmId } = placeholders;
  if (gtmId) {
    // eslint-disable-next-line
    (function (w, d, s, l, i) { w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }); var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f); })(window, document, 'script', 'dataLayer', gtmId);

  }
}

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here
loadGoogleTagManager();
