/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable newline-per-chained-call */
/* eslint-disable no-restricted-syntax */
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
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

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

  append(e) {
    this.current ? this.current.append(e) : this.root.append(e);
    return this;
  }

  replace(e, f) {
    const old = this.current;
    if (e) {
      const oldRoot = this.root;
      this.root = this.doc.createElement('div');
      this.jumpTo(this.root);
      f();
      e.parentElement.replaceChild(this.root, e);
      this.root = oldRoot;
    }
    return this.jumpTo(old);
  }

  replaceChildren(parent) {
    this.#writeSectionMeta().metaBlock('Metadata', this.pageMetadata);
    return parent.replaceChildren(...this.root.children);
  }

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
    this.endBlock().element('table').element('tr').element('th', { colspan }).text(name);
    return createRow ? this.row() : this;
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

const getMetadata = (document, prop) => {
  const metaElement = document.querySelector(`head meta[property='${prop}']`) || document.querySelector(`head meta[name='${prop}']`);
  return metaElement?.content;
};

const extractMetadata = (document) => {
  const metadata = {};
  /* for a list of metadata properties, build a metadata map using getMetdata to obtain their values */
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
  return metadata;
};

const getBackgroundImage = (section) => {
  const backgroundDiv = section.querySelector('.has-background');
  if (backgroundDiv) {
    return backgroundDiv.getAttribute('style').replace(/.*?url\((['"])?(.*?)(['"])?\).*/gi, '$2').split(',')[0];
  }
  return undefined;
};

const fixEmptyLinks = (document) => {
  // Find any links with no attributes and replace them with their children
  document.querySelectorAll('a:not([href])').forEach((link) => {
    const div = document.createElement('div');
    div.append(...link.children);
    link.parentElement.replaceChild(div, link);
  });
};

const buildExperienceFragment = (builder, section) => {
  builder.block('embed').text('Fragment').column().text(section.children[0].getAttribute('id'));
};

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
        console.log('Unknown embed type: ', embed.innerHTML);
      }
    });
  });

  section.querySelectorAll('.application').forEach((app) => {
    builder.replace(app, () => {
      builder.element('tt').withText(`APP:${app.id}`);
    });
  });
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

const buildColumnsBlock = (builder, section) => {
  const rows = getGridRows(section);
  if (rows.length === 0) {
    return;
  }

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
                name += ' (66-33)';
              } else if (cols[0].classList.contains('col-md-9')) {
                name += ' (75-25)';
              } else if (cols[0].classList.contains('col-md-4') && cols.length === 3) {
                name += ' (33-33-33)';
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
              col.querySelectorAll('.cmp-carousel__item img').forEach((img) => {
                builder.append(img);
              });
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
      carousel.querySelectorAll('.cmp-carousel__item').forEach((slide) => {
        builder.row().append(slide);
      });
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
        const img = teaser.querySelector('.page-teaser_image');
        const content = teaser.querySelector('.page-teaser_content');
        builder.row().append(img).column().append(content);
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
      // Move children dom nodes into the new div -- This isn't getting icons for some reason though.
      builder.block(name, 1, false);
      list.querySelectorAll('li').forEach((listItem) => {
        builder.row().append(...listItem.children);
      });
      // Loop over all list items -- there is a lot of variance and for some reason the DOM isn't right when this code executes!
      // list.querySelectorAll('li').forEach((li) => {
      //   const href = li.querySelector('a')?.getAttribute('href');
      //   const icon = li.querySelector('i')?.classList.filter((c) => c.startsWith('fa-')).join(' ');
      //   const text = li.querySelector('a')?.textContent;
      //   // Create column for icon and one for the link text
      //   builder.row().text(icon || '???');
      //   if (href) {
      //     builder.column().element('a', { href }).text(text);
      //   } else {
      //     builder.column().append(...li.childNodes);
      //   }
      // });
    });
  });
};

const buildSectionContent = (builder, section) => {
  buildEmbed(builder, section);
  buildGenericLists(builder, section);
  buildTeaserLists(builder, section);
  buildColumnsBlock(builder, section);
  // Carousels inside columns are a special case, so do standalone carousels last
  buildCarousel(builder, section);
  builder.append(section);
};

const translateClassNames = (className) => {
  switch (className) {
    case 'ss-contentcontainerwidth-narrow': return 'narrow';
    case 'ss-contentcontainerwidth-wide': return 'wide';
    case 'ss-margin-0': return 'no margin';
    case 'ss-backgroundbrightness-dark': return 'dark background';
    case 'ss-overlayopacity-90': return 'dark overlay';
    case 'ss-overlay-right': return 'overlay right';
    // These all get ignored
    case 'contentbreak':
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
  if (classes.length > 0) {
    builder.section({ style: classes.join(', ') });
  } else {
    builder.section();
  }
  buildSectionContent(builder, section);
};

const buildBackgroundableSection = (builder, section) => {
  const img = getBackgroundImage(section);
  buildGenericSection(builder, section);
  if (img) {
    builder.withSectionMetadata(builder.sectionMeta || {});
    builder.sectionMeta.background = builder.doc.createElement('img');
    builder.sectionMeta.background.src = img;
  }
};

const buildContentBreakSection = (builder, section) => {
  // These are effectively the same as generic sections but we might want to tag them differently in the future
  buildGenericSection(builder, section);
};

const buildHeroSection = (builder, hero) => {
  const meta = {};
  const img = getBackgroundImage(hero);
  if (img) {
    builder.element('img', { src: img, class: 'hero-img' }).up();
  } else {
    builder.withSectionMetadata({ style: 'no-background' });
  }
  // Rely on importer to strip out extra divs, etc.
  // buildSectionContent(builder, hero);
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

const ICON_PARENT_SELECTOR = '.pagesection li';
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
    const iconName = [...icon.classList].filter((c) => c.startsWith('fa-')).join(' ').replace('fa-', '');
    if (iconName) {
      const newIcon = document.createTextNode(`{${iconName}} `);
      if (li.querySelector('a')) {
        li.querySelector('a').prepend(newIcon);
      } else {
        li.prepend(newIcon);
      }
      console.log('Added icon: ', newIcon.textContent, ' to ', li.innerHTML);
    }
  });
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
  transformDOM: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // Extract metadata
    const metadata = extractMetadata(document);

    // define the main element: the one that will be transformed to Markdown
    const builder = new BlockBuilder(document, metadata);

    const parser = new DOMParser();
    const originalDoc = parser.parseFromString(html, 'text/html');

    // Restore markup that was stripped out by the importer
    restoreIcons(document, originalDoc);

    // Strip out header and footers that are not needed
    document.querySelector('page-header')?.remove();
    document.querySelector('page-footer')?.remove();

    // Create sections of the page
    document.querySelectorAll('.pagesection').forEach((section) => buildSection(builder, section));

    // General markup fix-ups
    // fixEmptyLinks(document);

    // Build document and store into main element
    builder.replaceChildren(document.body);

    return document.body;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
  generateDocumentPath: ({
    document, url, html, params,
  }) => WebImporter.FileUtils.sanitizePath(new URL(url).pathname.replace(/\.html$/, '').replace(/\/$/, '')),
};
