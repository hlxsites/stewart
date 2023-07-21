export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  const rowCount = [...block.children].length;

  // setup image columns
  [...block.children].forEach((row, rdx) => {
    /*
    The columns of first row should occupy full width when more than one row exists.
    "row" class is used to set the column width. So, not adding "row" class for the first row.
    */
    if (rowCount > 1 && rdx === 0) {
      row.className = `row-${rdx + 1}`;
    } else {
      row.className = `row row-${rdx + 1}`;
    }
    [...row.children].forEach((col, cdx) => {
      col.className = `column column-${cdx + 1}`;
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}
