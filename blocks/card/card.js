export default function decorate(block) {
  if (block.closest('.section').classList.contains('has-bg-image')) {
    block.classList.add('opacity');
    if (block.closest('.section').classList.contains('dark')) block.classList.add('dark');
  }
}
