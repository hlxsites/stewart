import { createElement } from '../../scripts/scripts.js';

let tId;
function debounce(method, delay) {
  clearTimeout(tId);
  tId = setTimeout(() => {
    method();
  }, delay);
}

function incrementSlide(slideWrapper, increment) {
  const slideCount = Number(slideWrapper.dataset.slideCount);
  const curSlideIndex = Number(slideWrapper.dataset.slideIndex);
  let newSideIndex = curSlideIndex + increment;
  if (newSideIndex < 0) newSideIndex = slideCount - 1;
  if (newSideIndex >= slideCount) newSideIndex = 0;

  const toSlide = slideWrapper.querySelector(`.carousel-slide:nth-child(${newSideIndex + 1})`);
  slideWrapper.scrollTo({ top: 0, left: toSlide.offsetLeft - toSlide.parentNode.offsetLeft, behavior: 'smooth' });
  slideWrapper.dataset.slideIndex = newSideIndex;
}

export default function decorate(block) {
  const images = block.querySelectorAll('picture');
  const wrapper = createElement('div', {
    class: 'carousel-slides-wrapper',
    'data-slide-index': 0,
    'data-slide-count': images.length,
  });

  images.forEach((pic) => {
    const slide = createElement('div', {
      class: 'carousel-slide',
    }, pic);
    wrapper.append(slide);
  });
  block.replaceChildren(wrapper);

  block.append(createElement('div', { class: 'carousel-slide-controls' }, [
    createElement('button', { class: ['carousel-slide-control', 'carousel-slide-prev'], 'aria-label': 'Previous' }),
    createElement('button', { class: ['carousel-slide-control', 'carousel-slide-next'], 'aria-label': 'Next' }),
  ]));

  block.querySelectorAll('.carousel-slide-control').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isNext = btn.classList.contains('carousel-slide-next');
      incrementSlide(wrapper, isNext ? 1 : -1);
    });
  });

  wrapper.addEventListener('scroll', () => {
    debounce(() => {
      const position = wrapper.scrollLeft;
      const slideWidth = block.querySelector('.carousel-slide').scrollWidth;
      let slide = 0;
      let sum = slideWidth / 2;
      while (sum < position) {
        sum += slideWidth;
        slide += 1;
      }
      wrapper.dataset.slideIndex = slide;
    }, 200);
  });
}
