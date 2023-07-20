export default function decorate(block) {
  const elementContainer = block.querySelector(':scope > div > div');

  const heroWrapper = document.createElement('div');
  if (elementContainer.querySelector('picture')) {
    heroWrapper.append(elementContainer.querySelector('picture'));
  }
  if (elementContainer.querySelector('h1')) {
    heroWrapper.append(elementContainer.querySelector('h1'));
  }
  if (elementContainer.querySelector('h2')) {
    heroWrapper.append(elementContainer.querySelector('h2'));
  }
  if (elementContainer.querySelector('a')) {
    const anchorWrapper = document.createElement('div');
    anchorWrapper.classList.add('align-end');
    anchorWrapper.append(elementContainer.querySelector('a'));
    heroWrapper.append(anchorWrapper);
  }

  block.append(heroWrapper);

  elementContainer.parentElement.remove();
}
