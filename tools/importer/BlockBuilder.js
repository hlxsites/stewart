/* eslint-disable newline-per-chained-call, no-restricted-syntax, no-console */

/**
 * A utility for processing the blocks in a document based on the builder pattern.
 */
export default class BlockBuilder {
  /**
   * construct the builder.
   *
   * @param {Document} document the page's DOM
   * @param {Object} pageMetadata the page metadata,
   * used when replaceChildren is called to build the page metadata block
   */
  constructor(document, pageMetadata = {}) {
    this.doc = document;
    this.root = document.createElement('div');
    this.pageMetadata = pageMetadata;
  }

  /**
   * Jump the current location to a given element
   * @param {Element} e the element to jump to
   * @returns the builder
   */
  jumpTo(e) {
    this.current = e;
    return this;
  }

  /**
   * move the current location to the parent node
   * @returns the builder
   */
  up() { return this.jumpTo(this.current?.parentElement); }

  /**
   * move the current location to an ancestor node with the given tag name
   * @param {String} tag the name of the tag to go to
   * @returns the builder
   */
  upToTag(tag) {
    const cur = this.current;
    while (this.current && this.current?.tagName !== tag.toUpperCase()) this.up();
    return this.jumpTo(this.current || cur);
  }

  /**
   * append the content at the current location
   * @param {Element|String} e the elemnt or string to append
   * @returns the builder
   */
  append(e) { return (this.current ? this.current.append(e) : this.root.append(e), this); }

  /**
   * Replace a DOM element, using a callback to generate the replcaement content.
   * @param {Element} e the element to replace
   * @param {Function} f a function that appends the replacement using the builder
   * @returns the builder
   */
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
    return (this.endBlock().element('table', tableAttrs).element('tr').element('th', { colspan })
      .text(name), createRow ? this.row() : this);
  }

  row(attrs = {}) { return this.upToTag('table').element('tr').element('td', attrs); }

  column(attrs = {}) { return this.upToTag('tr').element('td', attrs); }

  endBlock() { return this.jumpTo(undefined); }

  metaBlock(name, meta) {
    if (meta && Object.entries(meta).length > 0) {
      this.block(name, 2, false);
      for (const [k, v] of Object.entries(meta)) {
        if (v && v.children) {
          this.row().text(k).column().append(v);
        } else {
          this.row().text(k).column().text(v);
        }
      }
      this.endBlock();
    }
    return this;
  }

  #writeSectionMeta() { return this.metaBlock('Section Metadata', this.sectionMeta).withSectionMetadata(undefined); }
}
