const blockName = 'teaser-list';

const classNames = {
  teaser: `${blockName}-item`,
  teaserImage: `${blockName}-item-image`,
  teaserContent: `${blockName}-item-content`,
  teaserTitle: `${blockName}-item-title`,
  teaserLink: `${blockName}-item-link`,
  teaserSubhead: `${blockName}-item-subhead`,
};

const assignContainerClasses = (teaser) => {
  const selectors = ['img', 'h3'];
  const classes = {
    img: classNames.teaserImage,
    h3: classNames.teaserContent,
  };

  [...teaser.children].forEach((child) => {
    const selector = selectors.find((className) => child.querySelector(className));
    child.classList.add(classes[selector]);
  });
};

const assignContentClasses = (teaser) => {
  const title = teaser.querySelector('h3');
  title.classList.add(classNames.teaserTitle);

  const teaserContent = teaser.querySelector(`.${classNames.teaserContent}`);
  const cta = teaserContent.querySelector(':scope a:not(h3 *)');
  cta.classList.add(classNames.teaserLink);
  cta.classList.remove('button');

  const subhead = teaserContent.querySelector('p:first-child');

  if (subhead) {
    subhead.classList.add(classNames.teaserSubhead);
  }
};

export default async function decorate(block) {
  const teaserPromises = [...block.children].map(async (teaser) => {
    teaser.classList.add(classNames.teaser);

    const pic = teaser.querySelector('picture');
    const link = teaser.querySelector('a');
    if (link && !pic) {
      // todo build teaser from page content
      // undecided if this should be done via query index or by fetching page directly.
      // fetching page directly is probably faster
      // const teaserPageResp = await fetch(link.href);
      // if (teaserPageResp.ok) {
      //   const content = await teaserPageResp.text();
      //   const parser = new DOMParser();
      //   const contentDoc = parser.parseFromString(content, 'text/html');
      // }
    }

    assignContainerClasses(teaser);
    assignContentClasses(teaser);
  });

  await Promise.all(teaserPromises);
}
