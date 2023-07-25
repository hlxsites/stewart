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
    return (this.endBlock().element('table').element('tr').element('th', { colspan }).text(name), createRow ? this.row() : this);
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

const getMetadata = (document, prop) => document.querySelector(`head meta[property='${prop}'], head meta[name='${prop}']`)?.content;

const pressReleaseDateFormat1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[A-Za-z]*\.?\s?[0-9]{1,2}, [12][0-9]{3}/i;
const pressReleaseDateFormat2 = /[0-9]{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[A-Za-z]*\.?\s?[12][0-9]{3}/i;
const getPublishDate = (document) => {
  const publishDate = document.querySelector('.contentcontainer > .cmp-container')?.textContent;
  if (publishDate && publishDate.match(pressReleaseDateFormat1)) { return publishDate.match(pressReleaseDateFormat1)[0]; }
  if (publishDate && publishDate.match(pressReleaseDateFormat2)) { return publishDate.match(pressReleaseDateFormat2)[0]; }
  return document.querySelector('.referenceprojection .calendarattributeprojection .projection-value');
};

const extractMetadata = (document) => {
  const metadata = {};
  const metadataProperties = ['og:title', 'description', 'keywords', 'og:image', 'template'];
  metadataProperties.forEach((prop) => {
    const val = getMetadata(document, prop);
    if (val) {
      metadata[prop.replaceAll('og:', '')] = val;
    }
  });
  if (metadata.image) {
    const img = document.createElement('img');
    img.src = metadata.image;
    metadata.image = img;
  }
  const publishDate = getPublishDate(document);
  if (publishDate) { metadata['Publish Date'] = publishDate; }
  const author = document.querySelector(".cmp-singlesimpleattributeprojection[property='author']");
  if (author) { metadata.Author = author.textContent.replaceAll(/^\s*By\s*/ig, ''); }
  return metadata;
};

const getBackgroundImage = (section) => section.querySelector('.has-background')?.getAttribute('style').replace(/.*?url\((['"])?(.*?)(['"])?\).*/gi, '$2').split(',')[0];

const buildExperienceFragment = (builder, section) => builder.block('embed').text('Fragment').column().text(section.children[0].getAttribute('id'));

const buildEmbed = (builder, section) => {
  // Find any embeds and convert as needed, for now youtube links
  section.querySelectorAll('.embed').forEach((embed) => {
    builder.replace(embed, () => {
      const src = embed.querySelector('iframe')?.getAttribute('src');
      if (src) {
        builder.element('a', { href: src }).text(src).up();
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

const buildTables = (builder, section) => section.querySelectorAll('table').forEach((table) => builder.replace(table, () => builder.block('Table', 1, true).append(table.cloneNode(true))));

const buildColumnsBlock = (builder, section) => {
  const rows = getGridRows(section);
  if (rows.length === 0) { return; }

  const numColumns = countColumns(rows);
  const { parentElement } = rows[0];
  builder.replace(parentElement, () => {
    let inTable = false;
    // for each child of parent element, append if it is not a column
    for (const child of [...parentElement.children]) {
      if (child.classList.contains('columnrow')) {
        // First make sure we don't try to render nested columns
        child.querySelectorAll('.cmp-columnrow__item .cmp-columnrow__item').forEach((nested) => nested.classList.remove('cmp-columnrow__item'));
        const cols = child.querySelectorAll('.cmp-columnrow__item');
        let newRow = true;
        for (const col of [...cols]) {
          if (isHeading(col) || ((col.classList.contains('col-12') || col.querySelector('.col-12')) && newRow) || (cols.length === 1 && !inTable)) {
            if (inTable) {
              builder.jumpTo(undefined);
              inTable = false;
            }
            builder.append(col);
          } else {
            if (!inTable) {
              let name = 'Columns';
              if (cols[0].classList.contains('col-md-8')) {
                name += ' (Split 66-33)';
              } else if (cols[0].classList.contains('col-md-9')) {
                name += ' (Split 75-25)';
              } else if (cols[0].classList.contains('col-md-4') && cols.length === 3) {
                name += ' (Split 33-33-33)';
              } else if (child.querySelector('.carousel')) {
                name += ' (Carousel)';
              }

              builder.block(name, numColumns, false);
              newRow = true;
              inTable = true;
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
        const img = teaser.querySelector('.page-teaser_image') || '';
        const content = teaser.querySelector('.page-teaser_content');
        builder.row().append(img).column().append(content);
      });
    });
  });
};

const buildAccordions = (builder, section) => {
  section.querySelectorAll('.accordion')?.forEach((accordion) => {
    builder.replace(accordion, () => {
      builder.block('Accordion', 2, false);
      accordion.querySelectorAll('.cmp-accordion__item').forEach((accordionItem) => {
        const header = accordionItem.querySelector('.cmp-accordion__header');
        const panelContent = accordionItem.querySelector('.cmp-accordion__panel');
        builder.row().append(header).column().append(panelContent);
      });
    });
  });
};

const buildGenericLists = (builder, section) => {
  // Loop over all genericlist divs
  section.querySelectorAll('.genericlist').forEach((list) => {
    builder.replace(list, () => {
      let name = 'List';
      if (!list.classList.contains('ss-layout-twocolumn')) {
        name += ' (1-col)';
      }
      builder.block(name, 1, false);
      list.querySelectorAll('li').forEach((listItem) => builder.row().append(...listItem.children));
    });
  });
};

const buildButtons = (builder, section) => {
  section.querySelectorAll('.btn').forEach((button) => {
    const parent = button.parentElement;

    if (parent.classList.contains('ss-buttonstyle-secondary')) {
      const em = builder.doc.createElement('em');
      em.textContent = button.textContent;
      button.textContent = '';
      button.append(em);
    } if (parent.classList.contains('ss-buttonstyle-tertiary')) {
      const strong = builder.doc.createElement('strong');
      strong.textContent = button.textContent;
      button.textContent = '';
      button.append(strong);
    }
  });
};

const buildSectionContent = (builder, section) => {
  buildTables(builder, section);
  buildEmbed(builder, section);
  buildGenericLists(builder, section);
  buildTeaserLists(builder, section);
  buildColumnsBlock(builder, section);
  // Carousels inside columns are a special case, so do standalone carousels last
  buildCarousel(builder, section);
  buildAccordions(builder, section);
  buildButtons(builder, section);
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
    case 'contentbreak': return 'Content break';
    // These all get ignored
    case 'ss-overlay-left':
    case 'ss-margin-0':
    case 'ss-margin-bottom-small':
    case 'backgroundablepagehero':
    case 'pagehero':
    case 'pagesection':
    case 'genericpagesection':
    case 'ss-sectiontype-banner':
    case 'aem-GridColumn':
    case 'aem-GridColumn--default--12':
    case 'backgroundablepagesection':
      return undefined;
    // Otherwise pass-thru (this includes colors)
    default: return className.replace('ss-backgroundcolor-', '');
  }
};

const buildGenericSection = (builder, section) => {
  let classes = section.classList.value.split(' ');
  // remove classes named pagesection or start with aem
  classes = classes.map(translateClassNames).filter((e) => !(!e));
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

// Same thing for now
const buildContentBreakSection = buildGenericSection;

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
  } else if (section.classList.contains('contentbreak')) {
    buildContentBreakSection(builder, section);
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
}) => WebImporter.FileUtils.sanitizePath(new URL(url).pathname.replace(/\.html$/, '').replace(/\/$/, ''));

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
    const builder = new BlockBuilder(document, extractMetadata(document));

    const parser = new DOMParser();
    const originalDoc = parser.parseFromString(html, 'text/html');

    // Restore markup that was stripped out by the importer
    restoreIcons(document, originalDoc);

    // Strip out header and footers that are not needed
    document.querySelector('page-header, page-footer')?.remove();

    // Create sections of the page
    document.querySelectorAll('.pagesection').forEach((section) => buildSection(builder, section));

    // Build document and store into main element
    builder.replaceChildren(document.body);

    // make all links absolute
    document.querySelectorAll('a').forEach((a) => {
      let { href } = a;
      if (href.startsWith('/')) {
        href = `https://www.stewart.com${href}`;
      }
      const aURL = new URL(href);
      console.log(aURL.pathname);
      console.log(aURL.hostname);

      if (aURL.hostname === 'www.stewart.com') {
        // sanitze local links
        aURL.pathname = aURL.pathname.replace('.html', '').replace(/\/$/, '').replace(' ', '-').toLowerCase();
      }
      a.href = aURL.toString();
    });

    // Note the classes used for each section
    console.log('Hero style combinations:', sessionStorage.getItem('allHeroClasses'));
    console.log('Section style combinations:', sessionStorage.getItem('allSectionClasses'));

    const blocks = [...document.querySelectorAll('table')]
      .map((table) => {
        const header = table.querySelector('tr > th');
        if (header) {
          return header.textContent;
        }

        return '';
      })
      .filter((blockName) => !['', 'section metadata', 'metadata'].includes(blockName.toLowerCase()))
      .join(', ');

    return [{
      element: document.body,
      path: generateDocumentPath({
        document,
        url,
        html,
        params,
      }),
      report: {
        blocks,
      },
    }];
  },
};
