/* global WebImporter */
/* eslint-disable no-unused-expressions, max-len, no-unused-vars, newline-per-chained-call, no-restricted-syntax, no-console, class-methods-use-this */
/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

class BlockBuilder {
  constructor(document, pageMetadata = {}) {
    this.doc = document;
    this.root = document.createElement('div');
    this.pageMetadata = pageMetadata;
  }

  jumpTo(e) {
    this.current = e;
    return this;
  }

  up() { return this.jumpTo(this.current?.parentElement); }

  upToTag(tag) {
    const cur = this.current;
    while (this.current && this.current?.tagName !== tag.toUpperCase()) this.up();
    return this.jumpTo(this.current || cur);
  }

  append(e) { return (this.current ? this.current.append(e) : this.root.append(e), this); }

  replace(e, f) {
    if (!e) { return; }
    const old = this.current;
    const oldRoot = this.root;
    this.root = this.doc.createElement('div');
    this.jumpTo(this.root);
    f();
    e.parentElement.replaceChild(this.root, e);
    this.root = oldRoot;
    this.jumpTo(old);
  }

  replaceChildren(parent) { return (this.#writeSectionMeta().metaBlock('Metadata', this.pageMetadata), parent.replaceChildren(...this.root.children)); }

  element(tag, attrs = {}) {
    const e = this.doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return this.append(e).jumpTo(e);
  }

  text(text) { return this.append(this.doc.createTextNode(text)); }

  withText(text) { return this.text(text).up(); }

  section(meta = {}) { return (this.root.children.length ? this.#writeSectionMeta().jumpTo(undefined).element('hr').up() : this).withSectionMetadata(meta); }

  withSectionMetadata(meta) {
    this.sectionMeta = meta;
    return this;
  }

  addSectionMetadata(key, value) {
    (this.sectionMeta = this.sectionMeta || {})[key] = value;
    return this;
  }

  block(name, colspan = 2, createRow = true) {
    const tableAttrs = {
    };
    const variantIndex = name.indexOf('(');
    if (variantIndex > -1) {
      // block name has variants, so
      // eslint-disable-next-line prefer-destructuring
      tableAttrs['data-block'] = name.slice(0, variantIndex - 1);
      // eslint-disable-next-line prefer-destructuring
      tableAttrs['data-block-variants'] = name.slice(variantIndex + 1, -1);
    } else {
      tableAttrs['data-block'] = name;
    }
    return (this.endBlock().element('table', tableAttrs).element('tr').element('th', { colspan }).text(name), createRow ? this.row() : this);
  }

  row(attrs = {}) { return this.upToTag('table').element('tr').element('td', attrs); }

  column(attrs = {}) { return this.upToTag('tr').element('td', attrs); }

  endBlock() { return this.jumpTo(undefined); }

  metaBlock(name, meta) {
    if (meta && Object.entries(meta).length > 0) {
      this.block(name, 2, false);
      for (const [k, v] of Object.entries(meta)) (v && v.children) ? this.row().text(k).column().append(v) : this.row().text(k).column().text(v);
      this.endBlock();
    }
    return this;
  }

  #writeSectionMeta() { return this.metaBlock('Section Metadata', this.sectionMeta).withSectionMetadata(undefined); }
}

const capitalizeWord = (word) => `${word[0].toUpperCase()}${word.slice(1)}`;

const getMetadata = (document, prop) => document.querySelector(`head meta[property='${prop}'], head meta[name='${prop}']`)?.content;

const pressReleaseDateFormat1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[A-Za-z]*\.?\s?([0-9]{1,2}), ([12][0-9]{3})/i;
const pressReleaseDateFormat2 = /([0-9]{1,2}) (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[A-Za-z]*\.?\s?([12][0-9]{3})/i;
const getPublishDate = (document) => {
  let month;
  let day;
  let year;
  let date;

  const calProjection = document.querySelector('.referenceprojection .calendarattributeprojection [property="datePublished"]');
  if (calProjection) {
    date = new Date(Date.parse(calProjection.querySelector('.projection-value').textContent));
    calProjection.remove();
  } else {
    const publishDate = document.querySelector('.contentcontainer > .cmp-container')?.textContent;
    if (publishDate && publishDate.match(pressReleaseDateFormat1)) {
      date = new Date(Date.parse(publishDate.match(pressReleaseDateFormat1)[0]));
    }
    if (publishDate && publishDate.match(pressReleaseDateFormat2)) {
      date = new Date(Date.parse(publishDate.match(pressReleaseDateFormat2)[0]));
    }
  }

  if (date) {
    month = date.getUTCMonth() + 1;
    year = date.getUTCFullYear();
    day = date.getUTCDate();
    if (day < 10) day = `0${day}`;
    if (month < 10) month = `0${month}`;

    return `${month}/${day}/${year}`;
  }

  return '';
};

const translateTemplateName = (templateName) => {
  switch (templateName) {
    case 'stewart-homepage': return 'Home Page';
    case 'blog-article-page': return 'Blog Article Page';
    case 'press-release-page': return 'Press Release Page';
    case 'market-landing-page': return 'Market Landing Page';
    case 'primary-site-section-landing-page': return 'Section Landing Page';
    case 'landing-page-template': return 'Landing Page';
    case 'state-template': return 'State Landing Page';
    case 'primary-site-subsection-landing-page':
    case 'detail-content-page':
      return 'Section Page';
    // These all get ignored
    case 'content-page':
    case 'general-webpage':
    case 'web-calculators-page':
    case 'content-search':
      return '';
    // end ignored
    default:
      return templateName;
  }
};

const extractMetadata = (document, url) => {
  const metadata = {};
  const metadataProperties = ['og:title', 'description', 'keywords', 'og:image', 'template', 'robots'];
  metadataProperties.forEach((prop) => {
    const val = getMetadata(document, prop);
    if (val) {
      if (prop === 'keywords') {
        metadata.Tags = val;
      } else if (prop === 'template') {
        const templateName = translateTemplateName(val);
        if (templateName) {
          metadata.Template = templateName;
        }
      } else {
        let propName = prop.replaceAll('og:', '');
        propName = capitalizeWord(propName);
        metadata[propName] = val;
      }
    }
  });

  let navTitle = [...document.querySelectorAll('nav a')].find((a) => {
    const docUrl = new URL(url);
    const linkUrl = new URL(a.href, 'https://www.stewart.com');

    return docUrl.pathname === linkUrl.pathname;
  })?.textContent;
  if (!navTitle) {
    navTitle = document.querySelector('h1')?.textContent;
  }
  if (navTitle) {
    metadata['Navigation Title'] = navTitle;
  }

  if (metadata.Image) {
    const img = document.createElement('img');
    img.src = metadata.Image;
    metadata.Image = img;
  }
  const publishDate = getPublishDate(document);
  if (publishDate) { metadata['Publication Date'] = publishDate; }
  const author = document.querySelector(".cmp-singlesimpleattributeprojection[property='author']");
  if (author) {
    metadata.Author = author.textContent.replaceAll(/^\s*By\s*/ig, '');
    author.remove();
  }
  return metadata;
};

const getBackgroundImage = (section) => section.querySelector('.has-background')?.getAttribute('style').replace(/.*?url\((['"])?(.*?)(['"])?\).*/gi, '$2').split(',')[0];

const buildExperienceFragment = (builder, section) => builder.block('embed').text('Fragment').column().text(section.children[0].getAttribute('id'));

const buildPersonDetailCards = (builder, section) => {
  section.querySelectorAll('.cmp-container#person-detail-card').forEach((card) => {
    const content = card.querySelector('.contentcontainer');
    const image = card.querySelector('.cmp-imageattributeprojection img');
    const jobTitle = content.querySelector('[property="jobTitle"]');
    if (jobTitle) {
      jobTitle.parentElement.innerHTML = `<h4 class='title'>${jobTitle.innerHTML.replace(/<br(.*?)[/]?>/gi, "</h4><h4 class='title'>")}</h4>`;
    }
    builder.replace(card, () => {
      builder.block('Person Detail Card', 2, true).append(image).column().append(content);
    });
  });
};

const buildEmbed = (builder, section) => {
  // Find any embeds and convert as needed, for now youtube links
  section.querySelectorAll('.embed').forEach((embed) => {
    builder.replace(embed, () => {
      const src = embed.querySelector('iframe')?.getAttribute('src');
      if (src) {
        if (src.includes('youtube.com')) {
          builder.element('a', { href: src }).text(src).up();
        } else {
          builder.block('Embed', 1).element('a', { href: src }).text(src).up();
        }
      } else if (embed.querySelector('.mktoForm')) {
        const formId = embed.querySelector('.mktoForm').id.split('_')[1];
        builder.block('Marketo Form', 2).append('Form Id').column().append(formId);
      } else if (embed.querySelector('form')) {
        builder.element('tt').withText(`${embed.querySelector('form').id}`);
      } else {
        builder.append(...embed.children);
        console.log('Unknown embed type: ', embed.outerHTML);
      }
    });
  });

  section.querySelectorAll('.application').forEach((app) => builder.replace(app, () => builder.element('tt').withText(`APP:${app.id}`)));
};

const getGridRows = (grid) => {
  // Either we have immediate columnrow children or we have a single column with a columnrow child
  let rows = grid.querySelectorAll('.aem-Grid > .columnrow');
  if (rows.length === 0) {
    rows = grid.querySelectorAll('.aem-Grid > .aem-GridColumn > .cmp-container > .columnrow');
  }
  return rows;
};

// Get max of column (cmp-columnrow__item) children for all rows
const countColumns = (rows) => Math.max.apply(null, Array.from(rows).map((row) => row.querySelectorAll('.cmp-columnrow__item').length));

const isHeading = (col) => col.querySelector('.heading') && col.querySelector('.heading').nextElementSibling === null;

const buildSearchResults = (builder, section) => {
  section.querySelectorAll('.cmp-contentsearchresults').forEach((sr) => {
    builder.replace(sr, () => {
      builder.block('Search Results', 1, false);
    });
  });
};

const buildOfficeInfos = (builder, section) => {
  section.querySelectorAll('.cmp-officeinformation').forEach((office) => {
    builder.replace(office, () => {
      // todo how do we get office id?
      const address = office.querySelector('address');
      builder.block('Office Info', 1, true).append(address);
    });
  });
};

const buildForms = (builder, section) => {
  section.querySelectorAll('.formcontainer').forEach((form) => {
    builder.replace(form, () => {
      builder.block('Form', 1, false);
    });
  });
};

const buildTables = (builder, section) => {
  section.querySelectorAll('table:not([data-block])').forEach((table) => {
    let maxCols = 1;
    table.querySelectorAll('tr').forEach((tr) => {
      const cols = tr.querySelectorAll('td');
      if (cols.length > maxCols) maxCols = cols.length;
    });

    builder.replace(table, () => {
      builder.block('Table', maxCols, false).upToTag('table');
      [...table.querySelectorAll('tr')].forEach((tr) => {
        builder.append(tr);
      });
    });
  });
};

const buildColumnsBlock = (builder, section) => {
  const rows = getGridRows(section);
  if (rows.length === 0) { return; }

  const numColumns = countColumns(rows);
  const { parentElement } = rows[0];
  builder.replace(parentElement, () => {
    let inTable = false;
    // for each child of parent element, append if it is not a column
    for (const child of [...parentElement.children]) {
      if (child.classList.contains('columnrow') || child.querySelector('.columnrow')) { // Few columns present inside container component
        // First make sure we don't try to render nested columns
        child.querySelectorAll('.cmp-columnrow__item .cmp-columnrow__item').forEach((nested) => nested.classList.remove('cmp-columnrow__item'));
        const cols = child.querySelectorAll('.cmp-columnrow__item');
        let newRow = true;
        for (const [index, col] of [...cols].entries()) {
          if (isHeading(col) || ((col.classList.contains('col-12') || col.querySelector('.col-12')) && newRow) || (cols.length === 1 && !inTable)) {
            if (inTable) {
              builder.jumpTo(undefined);
              inTable = false;
            }
            builder.append(col);
          } else {
            if (!inTable) {
              const blockName = 'Columns';
              const variants = new Set();
              if (child.querySelector('.carousel')) {
                variants.add('Carousel');
              }

              if (cols.length === 2) {
                if (cols[0].classList.contains('col-md-8') || cols[0].classList.contains('col-lg-8') || cols[0].classList.contains('col-xl-8')) {
                  variants.add('Split 66-33');
                } else if (cols[0].classList.contains('col-md-4') || cols[0].classList.contains('col-lg-4') || cols[0].classList.contains('col-xl-4')) {
                  variants.add('Split 33-66');
                } else if (cols[0].classList.contains('col-md-9') || cols[0].classList.contains('col-lg-9') || cols[0].classList.contains('col-xl-9')) {
                  variants.add('Split 75-25');
                } else if (cols[0].classList.contains('col-md-3') || cols[0].classList.contains('col-lg-3') || cols[0].classList.contains('col-xl-3')) {
                  variants.add('Split 25-75');
                }
              }

              /* When a new variation added, update blocks/columns.js to support that - START */

              if (col.querySelector('.ss-containerpresentationtype-box')) {
                variants.add('Card', 'Gray');
              }

              if (col.querySelector('.ss-containerpresentationtype-card')) {
                if (col.querySelectorAll('[class*="ss-container-black-opacity"]').length > 0) {
                  variants.add('Card', 'Dark');
                } else if (col.querySelector('.ss-cardtype-peoplecard')) {
                  variants.add('People Card');
                } else {
                  variants.add('Card');
                }
              }

              /* When a new variation added, update blocks/columns.js to support that - END */
              let name = blockName;
              if (variants.size > 0) {
                name += ` (${[...variants].join(', ')})`;
              }
              builder.block(name, numColumns, false);
              newRow = true;
              inTable = true;
            }

            if (cols.length > 2 && (index % 2) === 0
              && (col.classList.contains('col-md-6') || col.classList.contains('col-lg-6') || col.classList.contains('col-xl-6'))) {
              // Move the additional columns into a new row if more than 2 columns(50%) exist in a row
              newRow = true;
            }

            if (newRow) {
              builder.row();
              newRow = false;
            } else {
              builder.column();
            }

            if (col.querySelector('.carousel')) {
              builder.element('div');
              col.querySelectorAll('.cmp-carousel__item img').forEach((img) => builder.append(img));
              col.querySelector('.carousel').remove();
            } else {
              builder.append(col);
            }
          }
        }
      } else {
        if (inTable) {
          builder.jumpTo(undefined);
          inTable = false;
        }
        builder.append(child);
      }
    }
  });
};

const buildCarousel = (builder, section) => {
  section.querySelectorAll('.carousel')?.forEach((carousel) => {
    builder.replace(carousel, () => {
      builder.block('Carousel', 1, false);
      carousel.querySelectorAll('.cmp-carousel__item').forEach((slide) => builder.row().append(slide));
    });
  });
};

const buildTeaserLists = (builder, section) => {
  // Loop over all teaserlist divs
  section.querySelectorAll('.teaserlist').forEach((list) => {
    builder.replace(list, () => {
      builder.block('Teaser List', 2, false);
      // For each teaser, build a block with the image and text
      list.querySelectorAll('.page-teaser').forEach((teaser) => {
        const link = teaser.querySelector('.page-teaser_content-title a');
        if (link.href.startsWith('/')) {
          builder.row().append(link);
        } else {
          const img = teaser.querySelector('.page-teaser_image') || '';
          const content = teaser.querySelector('.page-teaser_content');
          builder.row().append(img).column().append(content);
        }
      });
    });
  });
};

const buildAccordions = (builder, section) => {
  // first merge all subsequent accordions to one
  const firstAcc = section.querySelector('.accordion');
  let nextAccordion = firstAcc?.nextElementSibling;
  while (nextAccordion && nextAccordion.classList.contains('accordion')) {
    const items = nextAccordion.querySelectorAll('.cmp-accordion__item');
    firstAcc.append(...items);
    const nextNext = nextAccordion.nextElementSibling;
    nextAccordion.remove();
    nextAccordion = nextNext;
  }

  section.querySelectorAll('.accordion')?.forEach((accordion) => {
    const accDiv = builder.doc.createElement('div');
    accDiv.insertAdjacentHTML('beforeend', '<hr/>');
    accordion.querySelectorAll('.cmp-accordion__item').forEach((accordionItem) => {
      const title = accordionItem.querySelector('.cmp-accordion__title');
      const content = accordionItem.querySelector('.cmp-accordion__panel');

      accDiv.insertAdjacentHTML('beforeend', `<h2>${title.textContent}</h2`);
      accDiv.insertAdjacentHTML('beforeend', content.innerHTML);
    });
    accDiv.insertAdjacentHTML('beforeend', `
    <table>
    <tr>
      <th colspan="2">Section Metadata</th>
    </tr>
    <tr>
      <td>Style</td>
      <td>Accordion</td>
    </tr>
  </table>
    `);
    accDiv.insertAdjacentHTML('beforeend', '<hr/>');
    accordion.replaceWith(accDiv);
  });
};

const buildGenericLists = (builder, section) => {
  // Loop over all genericlist divs
  section.querySelectorAll('.genericlist').forEach((list) => {
    builder.replace(list, () => {
      let name = 'List';
      if (!list.classList.contains('ss-layout-twocolumn')) {
        name += ' (1 Col)';
      }
      builder.block(name, 1, false);
      list.querySelectorAll('li').forEach((listItem) => builder.row().append(...listItem.children));
    });
  });
};

const buildButtons = (builder, section) => {
  section.querySelectorAll('.linkcalltoaction').forEach((ctaDiv) => {
    const button = ctaDiv.querySelector('a.btn');
    if (button) {
      const par = builder.doc.createElement('p');
      let inner = par;
      if (ctaDiv.classList.contains('ss-buttonstyle-secondary')) {
        const em = builder.doc.createElement('em');
        inner.append(em);
        inner = em;
      }

      if (ctaDiv.classList.contains('ss-buttonstyle-tertiary')) {
        const strong = builder.doc.createElement('strong');
        inner.append(strong);
        inner = strong;
      }

      inner.append(button.cloneNode(true));
      ctaDiv.replaceWith(par);
    }
  });
};

const buildBlockQuotes = (builder, section) => {
  section.querySelectorAll('.cmp-quotation').forEach((bq) => {
    const image = bq.querySelector('.quotation-image');
    const name = bq.querySelector('.quotation-person_name');
    const title = bq.querySelector('.quotation-person_title');
    const quote = bq.querySelector('.quotation-text blockquote');
    const bqElement = builder.doc.createElement('blockquote');
    bqElement.textContent = quote.textContent;

    builder.replace(bq, () => {
      builder
        .block('Blockquote', 2, true)
        .append(image)
        .column().append(name).append(title).append(bqElement);
    });
  });
};

const buildBreadcrumbs = (builder, section) => {
  section.querySelectorAll('.breadcrumbnavigation > nav').forEach((bc) => {
    builder.replace(bc, () => {
      builder.block('Breadcrumb', 1, false);
    });
  });
};

const buildCalculators = (builder, section) => {
  section.querySelectorAll('.cmp-calculator, .cmp-shared-calc').forEach((calc) => {
    let calcName = calc.querySelector('[data-calculator]').getAttribute('data-calculator');
    if (calcName === 'mortgate') calcName = 'mortgage';
    builder.replace(calc, () => {
      builder.block(`Calculator (${capitalizeWord(calcName)})`, 1, false);
    });
  });
};

const buildSectionContent = (builder, section) => {
  buildTables(builder, section);
  buildBreadcrumbs(builder, section);
  buildEmbed(builder, section);
  buildGenericLists(builder, section);
  buildTeaserLists(builder, section);
  buildColumnsBlock(builder, section);
  // Carousels inside columns are a special case, so do standalone carousels last
  buildCarousel(builder, section);
  buildAccordions(builder, section);
  buildButtons(builder, section);
  buildBlockQuotes(builder, section);
  buildCalculators(builder, section);
  buildSearchResults(builder, section);
  buildPersonDetailCards(builder, section);
  buildOfficeInfos(builder, section);
  buildForms(builder, section);
  builder.append(section);
};

const translateClassNames = (className) => {
  switch (className) {
    case 'ss-contentcontainerwidth-narrow': return 'Narrow';
    case 'ss-contentcontainerwidth-wide': return 'Wide';
    case 'ss-backgroundbrightness-dark': return 'Dark';
    case 'ss-overlayopacity-100': return 'Opacity 100';
    case 'ss-overlayopacity-90': return 'Opacity 90';
    case 'ss-overlayopacity-80': return 'Opacity 80';
    case 'ss-overlayopacity-70': return 'Opacity 70';
    case 'ss-overlayopacity-60': return 'Opacity 60';
    case 'ss-overlayopacity-55': return 'Opacity 55';
    case 'ss-overlayopacity-50': return 'Opacity 50';
    case 'ss-overlayopacity-40': return 'Opacity 40';
    case 'ss-overlayopacity-30': return 'Opacity 30';
    case 'ss-overlayopacity-20': return 'Opacity 20';
    case 'ss-overlayopacity-10': return 'Opacity 10';
    case 'ss-overlay-gradient-disabled': return 'No gradient';
    case 'ss-overlay-right': return 'Right';
    case 'ss-sectiontype-banner': return 'Left Border';
    // These all get ignored
    case 'contentbreak':
    case 'ss-overlay-left':
    case 'ss-margin-0':
    case 'ss-margin-bottom-small':
    case 'backgroundablepagehero':
    case 'pagehero':
    case 'pagesection':
    case 'genericpagesection':
    case 'aem-GridColumn':
    case 'aem-GridColumn--default--12':
    case 'backgroundablepagesection':
      return undefined;
    // Otherwise pass-thru (this includes colors)
    default: return capitalizeWord(className.replace('ss-backgroundcolor-', ''));
  }
};

const buildGenericSection = (builder, section) => {
  let classes = section.classList.value.split(' ');
  // remove classes named pagesection or start with aem
  classes = classes.map(translateClassNames).filter((e) => !(!e));

  if (section.querySelector('.offset-lg-7, .offset-md-7')) {
    classes.push('Offset');
  }

  classes.sort();
  let allSectionClasses = {};
  if (sessionStorage.getItem('allSectionClasses') !== null) {
    allSectionClasses = JSON.parse(sessionStorage.getItem('allSectionClasses'));
  }
  const classCombo = classes.join(', ');
  allSectionClasses[classCombo || 'none'] = (allSectionClasses[classCombo || 'none'] || 0) + 1;
  sessionStorage.setItem('allSectionClasses', JSON.stringify(allSectionClasses));
  builder.section();
  if (classes.length > 0) { builder.addSectionMetadata('style', classCombo); }
  buildSectionContent(builder, section);
};

const buildBackgroundableSection = (builder, section) => {
  const img = getBackgroundImage(section);
  buildGenericSection(builder, section);
  if (img) {
    const imgTag = builder.doc.createElement('img');
    imgTag.src = img;
    builder.addSectionMetadata('background', imgTag);
  }
};

const isNarrowHero = (hero) => hero.querySelector('.col-md-7.col-lg-11.col-xl-7, .col-md-7.col-lg-9, .col-md-6.col-lg-8');
const buildHeroSection = (builder, hero) => {
  const meta = {};

  let classes = hero.classList.value.split(' ');
  // remove classes named pagesection or start with aem
  classes = classes.map(translateClassNames).filter((e) => !(!e));
  classes.sort();

  // Dark to light transformation -- Dark is default instead of Light
  if (classes.indexOf('Dark') >= 0) {
    // remove value dark from array classes
    classes.splice(classes.indexOf('Dark'), 1);
  } else {
    classes.push('Light');
  }

  if (isNarrowHero(hero)) { classes.push('Narrow'); }

  let allSectionClasses = {};
  if (sessionStorage.getItem('allHeroClasses') !== null) {
    allSectionClasses = JSON.parse(sessionStorage.getItem('allHeroClasses'));
  }
  let style = classes.join(', ');

  // if there is an alert, place it above the image
  if (hero.previousElementSibling?.classList?.contains('simplealert')) {
    builder.block('Alert', 1, true).append(hero.previousElementSibling).jumpTo(undefined);
  }

  const img = getBackgroundImage(hero);
  if (img) {
    builder.element('img', { src: img, class: 'hero-img' }).up();
  } else {
    style = style ? `${style}, No background` : 'No background';
  }
  if (style) {
    builder.withSectionMetadata({ style });
  }
  allSectionClasses[style || 'none'] = (allSectionClasses[style || 'none'] || 0) + 1;
  sessionStorage.setItem('allHeroClasses', JSON.stringify(allSectionClasses));

  // Rely on importer to strip out extra divs, etc.
  builder.append(hero);
};

/**
 * Convert and build a section from existing AEM DOM.
 * @param {BlockBuilder} builder Document builder factory
 * @param {Element} section Section to build
 */
const buildSection = (builder, section) => {
  if (section.classList.contains('pagehero')) {
    buildHeroSection(builder, section);
  } else if (section.classList.contains('backgroundablepagesection')) {
    buildBackgroundableSection(builder, section);
  } else if (section.classList.contains('experiencefragment')) {
    buildExperienceFragment(builder, section);
  } else {
    buildGenericSection(builder, section);
  }
};

const ICON_PARENT_SELECTOR = '.icon .cmp-icon';
const ICON_SELECTOR = `${ICON_PARENT_SELECTOR} i`;
const restoreIcons = (document, originalDocument) => {
  // For every li with an icon in the original document, find the corresponding li in the imported document and add the icon
  // Use the index of the li in the query selector to locate in both lists
  originalDocument.querySelectorAll(ICON_SELECTOR).forEach((icon, index) => {
    const li = document.querySelectorAll(ICON_PARENT_SELECTOR)[index];
    if (!li) {
      console.log('Could not find li for icon: ', icon.innerHTML, ' index ', index);
      return;
    }
    // Change icon to text indicating name of icon instead
    const iconName = [...icon.classList].filter((c) => c.startsWith('fa')).join(' ').replaceAll(' fa-', '-');
    if (iconName) {
      const newIcon = document.createTextNode(`:${iconName}: `);
      if (li.querySelector('a')) {
        li.querySelector('a').prepend(newIcon);
      } else {
        li.prepend(newIcon);
      }
      console.log('Added icon: ', newIcon.textContent, ' to ', li.innerHTML);
    }
  });
};

const sanitizePath = (path) => WebImporter.FileUtils.sanitizePath(path.replace(/\.html$/, '').replace(/\/$/, '').toLowerCase());

/**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
const generateDocumentPath = ({
  document, url, html, params,
}) => sanitizePath(new URL(url).pathname);

const updateLinks = (document) => {
  document.querySelectorAll('a').forEach((a) => {
    try {
      let { href } = a;
      if (href) {
        if (href.startsWith('/')) {
          href = `https://www.stewart.com${href}`;
        }
        const aURL = new URL(href);

        if (aURL.hostname === 'www.stewart.com') {
          // sanitze local links
          if (!aURL.pathname.startsWith('/content/dam/')) {
            aURL.pathname = sanitizePath(aURL.pathname);
          }
        }
        a.href = aURL.toString();
      }
    } catch (e) {
      // no op
      console.error(e);
    }
  });
};

const processHeadingIcons = (document) => {
  document.querySelectorAll('.ss-heading-icon-location').forEach((iconHeadingWrapper) => {
    const heading = iconHeadingWrapper.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.textContent = `:fal-map-marker-alt: ${heading.textContent}`;
    }
  });
  document.querySelectorAll('.ss-heading-icon-check').forEach((iconHeadingWrapper) => {
    const heading = iconHeadingWrapper.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.textContent = `:fal-check-circle: ${heading.textContent}`;
    }
  });
};

const gatherBlockNames = (document) => {
  const blocksArr = [...document.querySelectorAll('table[data-block]')]
    .map((table) => {
      const blockName = table.getAttribute('data-block');
      const variantNames = table.getAttribute('data-block-variants');
      return variantNames ? `${blockName} (${variantNames})` : blockName;
    })
    .filter((blockName) => !['', 'section metadata', 'metadata'].includes(blockName.toLowerCase()));
  const blocks = new Set(blocksArr);
  return [...blocks].join(', ');
};

const gatherAssetLinks = (document) => {
  const assetLinks = new Set();
  document.querySelectorAll('a[href*="/content/dam"]').forEach((a) => {
    assetLinks.add(a.href);
  });
  return [...assetLinks].join(', ');
};

const processFragments = (document, docPath) => {
  const fragments = [];
  const pathSegments = docPath.split('/');

  // person detail cards, regardless of location, become fragments
  document.querySelectorAll('[data-block="Person Detail Card"]').forEach((card) => {
    const div = document.createElement('div');
    const name = card.querySelector('[property="displayName"]')?.textContent;
    if (name) {
      const cardPath = sanitizePath(`/en/fragments/people/${name.replaceAll('.', '')}`);
      div.setAttribute('data-fragment-path', cardPath);
      div.append(card.cloneNode(true));
      fragments.push({
        element: div,
        path: cardPath,
        report: {
          blocks: 'Person Detail Card',
          assetLinks: 'n/a',
          fragmentPaths: 'isFragment',
          hasNestedSections: 'false',
          previewUrl: `https://main--stewart-title--stewartmarketing.hlx.page${cardPath}`,
          liveUrl: `https://main--stewart-title--stewartmarketing.hlx.live${cardPath}`,
          prodUrl: `https://www.stewart.com${cardPath}`,
        },
      });
      const link = document.createElement('a');
      link.href = `https://main--stewart-title--stewartmarketing.hlx.page${cardPath}`;
      link.textContent = `https://main--stewart-title--stewartmarketing.hlx.page${cardPath}`;
      card.replaceWith(link);
    } else {
      card.remove();
    }
  });

  // find blocks inside of columns
  let fragmentCount = 1;
  document.querySelectorAll('[data-block="Columns"] [data-block]').forEach((internalBlock) => {
    const blockName = internalBlock.getAttribute('data-block');
    const div = document.createElement('div');
    // name fragments based on site section and page name
    let path = `/en/fragments/${blockName.toLowerCase().replace(' ', '-')}/${pathSegments[2]}-${pathSegments.pop()}-${fragmentCount}`;
    if (blockName === 'Marketo Form') {
      const formId = internalBlock.querySelector('tr:nth-child(2) > td:nth-child(2)').textContent;
      path = `/en/fragments/marketo-forms/${formId}`;
    } else {
      fragmentCount += 1;
    }

    div.setAttribute('data-fragment-path', path);
    div.append(internalBlock.cloneNode(true));
    fragments.push({
      element: div,
      path,
      report: {
        blocks: blockName,
        assetLinks: 'n/a',
        fragmentPaths: 'isFragment',
        hasNestedSections: 'false',
        previewUrl: `https://main--stewart-title--stewartmarketing.hlx.page${path}`,
        liveUrl: `https://main--stewart-title--stewartmarketing.hlx.live${path}`,
        prodUrl: `https://www.stewart.com${path}`,
      },
    });
    const link = document.createElement('a');
    link.href = `https://main--stewart-title--stewartmarketing.hlx.page${path}`;
    link.textContent = `https://main--stewart-title--stewartmarketing.hlx.page${path}`;
    internalBlock.replaceWith(link);
  });

  return fragments;
};

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transform: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // define the main element: the one that will be transformed to Markdown
    const builder = new BlockBuilder(document, extractMetadata(document, url));

    const parser = new DOMParser();
    const originalDoc = parser.parseFromString(html, 'text/html');

    // Restore markup that was stripped out by the importer
    restoreIcons(document, originalDoc);

    // Strip out header and footers that are not needed
    document.querySelector('page-header, page-footer')?.remove();

    // some landing page specific stuff before we do anything else
    if (getMetadata(document, 'template') === 'landing-page-template') {
      const footer = document.querySelector('.embed .footer');
      footer?.closest('.embed')?.remove();
    }

    // deal with breadcrumbs
    const bc = document.querySelector('.breadcrumbnavigation');
    if (bc) {
      let moved = false;
      // move bc to top of the first section that isn't the hero
      document.querySelectorAll('.pagesection').forEach((section) => {
        if (!moved && !section.classList.contains('pagehero')) {
          section.prepend(bc);
          moved = true;
        }
      });
    }

    // for office projection, make those sections so they get imported
    document.querySelectorAll('.officeinformationprojection').forEach((office) => {
      office.classList.add('pagesection');
      office.classList.remove('officeinformationprojection');
    });

    // Create sections of the page
    const hasNestedSections = document.querySelector('.pagesection .pagesection') ? 'true' : 'false';
    document.querySelectorAll('.pagesection').forEach((section) => buildSection(builder, section));

    // Build document and store into main element
    builder.replaceChildren(document.body);

    // make all links absolute
    updateLinks(document);

    // add icon markup to headings with icons
    processHeadingIcons(document);

    const docPath = generateDocumentPath({
      document,
      url,
      html,
      params,
    });

    const blocks = gatherBlockNames(document) || 'n/a';
    const assetLinks = gatherAssetLinks(document) || 'n/a';
    const fragments = processFragments(document, docPath);

    // Note the classes used for each section
    console.log('Hero style combinations:', sessionStorage.getItem('allHeroClasses'));
    console.log('Section style combinations:', sessionStorage.getItem('allSectionClasses'));

    const report = {
      blocks,
      assetLinks,
      fragmentPaths: fragments.map((f) => f.path).join(', ') || 'n/a',
      hasNestedSections,
      previewUrl: `https://main--stewart-title--stewartmarketing.hlx.page${docPath}`,
      liveUrl: `https://main--stewart-title--stewartmarketing.hlx.live${docPath}`,
      prodUrl: `https://www.stewart.com${docPath}`,
    };

    fragments.push({
      element: document.body,
      path: docPath,
      report,
    });
    return fragments;
  },
};
