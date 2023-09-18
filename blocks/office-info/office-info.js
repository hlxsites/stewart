import { readBlockConfig } from '../../scripts/lib-franklin.js';
import { getLocalePlaceholders } from '../../scripts/scripts.js';

export default function decorate(block) {
  const cfg = readBlockConfig(block);
  const placeholders = getLocalePlaceholders();
  const mapsLink = encodeURIComponent([cfg['street-address'], cfg['street-address-2'], cfg.city, cfg.state, cfg.zip].join('+'));
  block.innerHTML = `
    <div class="officeinformation">
      <h2>${cfg.name}</h2>
      <div class="address-info">
        <address class="postal-address">
          <span class="street-address" property="street-address">${cfg['street-address']}</span><br>
          <span class="street-address2" property="street-address2">${cfg['street-address-2']}</span><br>
          <span class="citystatezip">${cfg.city}, ${cfg.state} ${cfg.zip}</span>
        </address>
        <div class="telephone-numbers">
          <div property="telephone">${placeholders?.phonePrefix || 'ph.'} ${cfg.telephone}</div>
          <div property="faxNumber">${placeholders?.faxPrefix || 'fx.'} ${cfg.fax}</div>
        </div>
        <div class="map-link">
          <a href="https://www.google.com/maps/place/${mapsLink}" aria-label="${placeholders?.viewOnMap || 'View on Map'} ${cfg.name}" title="${placeholders?.viewOnMap || 'View on Map'}" target="_blank">${placeholders?.viewOnMap || 'View on Map'}</a>
        </div>
        <div class="hours-of-operation">
          <h4>${placeholders?.officeHours || 'Office Hours'}</h4>
          <ul>
            <li>${cfg.hours}</li>
          </ul>
        </div>
      </div>
      <div class="additional-info">
        <div class="row align-items-center">
          <div class="left">
            <h4>${placeholders?.moreInfo || 'More Info'}</h4>
            <p>${placeholders?.checkWebsite || 'To explore our services, tools and resources, check out our website.'}</p>
          </div>
          <div class="right">
            <a href="${cfg['website-link']}" aria-label="${placeholders?.visitWebsite || 'Visit Website'} ${cfg.name}" class="btn btn-secondary">${placeholders?.visitWebsite || 'Visit Website'}</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
