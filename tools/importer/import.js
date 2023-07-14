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
    this.children = [];
    this.pageMetadata = pageMetadata;
  }

  jumpTo(e) {
    this.current = e;
    return this;
  }

  up() { return this.jumpTo(this.current?.parentElement); }

  upToTag(tag) {
    while (this.current && this.current?.tagName !== tag.toUpperCase()) this.up();
    return this;
  }

  append(e) {
    this.current ? this.current.append(e) : this.children.push(e);
    return this;
  }

  replaceChildren(parent) {
    this.#writeSectionMeta().metaBlock('Metadata', this.pageMetadata);
    return parent.replaceChildren(...this.children);
  }

  element(tag, attrs = {}) {
    const e = this.doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return this.append(e).jumpTo(e);
  }

  text(text) { return this.append(this.doc.createTextNode(text)); }

  withText(text) { return this.text(text).up(); }

  section(meta = {}) { return (this.children.length ? this.#writeSectionMeta().jumpTo(undefined).element('hr').up() : this).withSectionMetadata(meta); }

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
  // If this isn't the page footer, leave a hint what is supposed to be here
  if (!section.classList.contains('page-footer')) {
    builder.section().block('embed').text('Fragment').column().text(section.children[0].getAttribute('id'));
  }
};

const buildEmbed = (builder, section) => {
  // Find any embeds and convert as needed, for now youtube links
  section.querySelectorAll('.embed').forEach((embed) => {
    const src = embed.querySelector('iframe')?.getAttribute('src');
    const previous = builder.current;
    builder.jumpTo(embed);
    builder.element('a', { href: src }).text(src).up();
    builder.jumpTo(previous);
    embed.querySelector('div').remove();
  });
};

const buildTable = (builder, section) => {
  // check if section has .cmp-columnrow with more than one child
  const columnrow = section.querySelector('.cmp-columnrow');
  if (columnrow && columnrow.childElementCount > 1) {
    let name = 'Columns';
    // For each child, use builder to create a row and column
    let cols = columnrow.querySelectorAll('.aem-Grid > .columnRow > .row > .cmp-columnrow__item');
    if (cols.length === 0) {
      cols = columnrow.querySelectorAll('.aem-Grid > .aem-GridColumn > .cmp-container > .columnrow > .row > .cmp-columnrow__item');
    }

    if (cols.length === 0) {
      builder.element('h3').withText('Error: No columns found in columnrow!');
      return false;
    }
    if (cols[0].classList.contains('col-md-8')) {
      name += ' (66-33)';
    } else if (cols[0].classList.contains('col-md-9')) {
      name += ' (75-25)';
    } else if (columnrow.querySelector('.carousel')) {
      name += ' (Carousel)';
    }

    builder.block(name, cols.length, true);
    let isFirst = true;
    let newRow = false;
    cols.forEach((col) => {
      if (newRow) {
        builder.row();
        newRow = false;
      } else if (!isFirst) {
        builder.column();
      }
      isFirst = false;
      if (col.classList.contains('col-12') || col.classList.contains('col')) {
        newRow = true;
      }

      if (col.querySelector('.carousel')) {
        builder.element('div');
        col.querySelectorAll('.cmp-carousel__item .image img').forEach((img) => {
          builder.append(img);
        });
        col.querySelector('.carousel').remove();
      } else {
        builder.append(col);
      }
    });
    builder.jumpTo(undefined);
    return true;
  }
  return false;
};

const buildCarousel = (builder, section) => {
  section.querySelectorAll('.carousel')?.forEach((carousel) => {
    const previous = builder.current;
    builder.jumpTo(carousel);
    builder.block('Carousel', 1, false);
    carousel.querySelectorAll('.cmp-carousel__item').forEach((slide) => {
      builder.row().append(slide);
    });
    builder.jumpTo(previous);
    carousel.querySelector('.carousel > .cmp-carousel').remove();
  });
};

const buildTeaserLists = (builder, section) => {
  // Loop over all teaserlist divs
  section.querySelectorAll('.teaserlist').forEach((list) => {
    const teasers = list.querySelectorAll('.page-teaser');
    list.replaceChildren();
    builder.block('Teaser List', 2, false);
    // For each teaser, build a block with the image and text
    teasers.forEach((teaser) => {
      const img = teaser.querySelector('.page-teaser_image');
      const content = teaser.querySelector('.page-teaser_content');
      builder.row().append(img).column().append(content);
    });
  });
};

const buildGenericLists = (builder, section) => {
  // Loop over all genericlist divs
  section.querySelectorAll('.genericlist').forEach((list) => {
    let name = 'List';
    if (list.classList.contains('ss-layout-twocolumn')) {
      name += ' (2-col)';
    }
    // Create a table
    builder.block(name, 1, true).append(list);
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
    // Remove from dom
    // list.remove();
  });
};

const buildSectionContent = (builder, section) => {
  // Since embeds might show inside tables and carousels, do this first!
  buildEmbed(builder, section);
  if (!buildTable(builder, section)) {
    builder.append(section);
    buildGenericLists(builder, section);
  }
  buildTeaserLists(builder, section);
  // Important this is called after table because table has a special carousel mode
  buildCarousel(builder, section);
};

const buildGenericSection = (builder, section) => {
  let classes = section.classList.value.split(' ');
  // remove classes named pagesection or start with aem
  classes = classes.filter((c) => !c.startsWith('aem-') && c !== 'pagesection' && c !== 'genericpagesection');
  if (classes.length > 0) {
    builder.section({ style: classes.join(', ') });
  } else {
    builder.section();
  }
  buildSectionContent(builder, section);
};

const buildBackgroundableSection = (builder, section) => {
  const img = getBackgroundImage(section);
  if (img) {
    builder.section({ style: 'Content break, image' });
    builder.element('img', { src: img, class: 'background-img' }).up();
    buildSectionContent(builder, section);
  } else {
    buildGenericSection(builder, section);
  }
};

const buildContentBreakSection = (builder, section) => {
  // check if section has ss-backgroundcolor style and if so extract it
  const classes = section.classList.value.split(' ');
  const style = classes.filter((c) => c.startsWith('ss-backgroundcolor')).join(', ');
  if (style) {
    builder.section({ style: `Content break, ${style.replace('ss-backgroundcolor-', '')}` });
  } else {
    builder.section({ style: 'Content break' });
  }
  buildSectionContent(builder, section);
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

    // Create sections of the page
    document.querySelectorAll('.pagesection').forEach((section) => buildSection(builder, section));

    // Build document and store into main element
    builder.replaceChildren(document.body);

    // General markup fix-ups
    fixEmptyLinks(document);

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
