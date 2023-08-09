import { readBlockConfig } from '../../scripts/lib-franklin.js';

export default function decorate(block) {
  const cfg = readBlockConfig(block);
  if (cfg.name) {
    block.innerHTML = `<span 
    class="fa fa-icon fa-question"
    ></span>
    <div class="tooltip">
      <h2>${cfg.name}</h2>
      <p>${cfg.description}</p>
    </div>
    `;

    const tooltip = block.querySelector('.tooltip');
    tooltip.setAttribute('aria-expanded', 'false');
    block.querySelector('.fa-question').addEventListener('click', () => {
      const expanded = tooltip.getAttribute('aria-expanded') === 'true';
      tooltip.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  }
}
