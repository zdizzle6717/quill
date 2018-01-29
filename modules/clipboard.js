import extend from 'extend';
import Delta from 'quill-delta';
import Parchment from 'parchment';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';

import { AlignAttribute, AlignStyle } from '../formats/align';
import { BackgroundStyle } from '../formats/background';
import CodeBlock from '../formats/code';
import { ColorStyle } from '../formats/color';
import { DirectionAttribute, DirectionStyle } from '../formats/direction';
import { FontStyle } from '../formats/font';
import { SizeStyle } from '../formats/size';

const debug = logger('quill:clipboard');

const DOM_KEY = '__ql-matcher';

const CLIPBOARD_CONFIG = [
  [Node.TEXT_NODE, matchText],
  [Node.TEXT_NODE, matchNewline],
  ['br', matchBreak],
  [Node.ELEMENT_NODE, matchNewline],
  [Node.ELEMENT_NODE, matchBlot],
  [Node.ELEMENT_NODE, matchAttributor],
  [Node.ELEMENT_NODE, matchStyles],
  ['li', matchIndent],
  ['b', matchAlias.bind(matchAlias, 'bold')],
  ['i', matchAlias.bind(matchAlias, 'italic')],
  ['style', matchIgnore],
];

const ATTRIBUTE_ATTRIBUTORS = [AlignAttribute, DirectionAttribute].reduce(
  (memo, attr) => {
    memo[attr.keyName] = attr;
    return memo;
  },
  {},
);

const STYLE_ATTRIBUTORS = [
  AlignStyle,
  BackgroundStyle,
  ColorStyle,
  DirectionStyle,
  FontStyle,
  SizeStyle,
].reduce((memo, attr) => {
  memo[attr.keyName] = attr;
  return memo;
}, {});

class Clipboard extends Module {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('paste', this.onCapturePaste.bind(this));
    this.container = this.quill.addContainer('ql-clipboard');
    this.container.setAttribute('contenteditable', true);
    this.container.setAttribute('tabindex', -1);
    this.matchers = [];
    CLIPBOARD_CONFIG.concat(this.options.matchers).forEach(
      ([selector, matcher]) => {
        this.addMatcher(selector, matcher);
      },
    );
  }

  addMatcher(selector, matcher) {
    this.matchers.push([selector, matcher]);
  }

  convert(html) {
    if (typeof html === 'string') {
      this.container.innerHTML = html.replace(/>\r?\n +</g, '><'); // Remove spaces between tags
      return this.convert();
    }
    const formats = this.quill.getFormat(this.quill.selection.savedRange.index);
    if (formats[CodeBlock.blotName]) {
      const text = this.container.innerText;
      return new Delta().insert(text, {
        [CodeBlock.blotName]: formats[CodeBlock.blotName],
      });
    }
    const [elementMatchers, textMatchers] = this.prepareMatching();
    let delta = traverse(this.container, elementMatchers, textMatchers, this.quill.editorRegistry);
    // Remove trailing newline
    if (
      deltaEndsWith(delta, '\n') &&
      delta.ops[delta.ops.length - 1].attributes == null
    ) {
      delta = delta.compose(new Delta().retain(delta.length() - 1).delete(1));
    }
    debug.log('convert', this.container.innerHTML, delta);
    this.container.innerHTML = '';
    return delta;
  }

  dangerouslyPasteHTML(index, html, source = Quill.sources.API) {
    if (typeof index === 'string') {
      this.quill.setContents(this.convert(index), html);
      this.quill.setSelection(0, Quill.sources.SILENT);
    } else {
      const paste = this.convert(html);
      this.quill.updateContents(
        new Delta().retain(index).concat(paste),
        source,
      );
      this.quill.setSelection(index + paste.length(), Quill.sources.SILENT);
    }
  }

  onCapturePaste(e) {
    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    const { scrollTop } = this.quill.scrollingContainer;
    const range = this.quill.getSelection();
    this.container.focus();
    this.quill.selection.update(Quill.sources.SILENT);
    setTimeout(() => {
      this.onPaste(e, range);
      this.quill.scrollingContainer.scrollTop = scrollTop;
      this.quill.focus();
      this.container.innerHTML = '';
    }, 1);
  }

  onPaste(e, range) {
    let delta = new Delta().retain(range.index);
    delta = delta.concat(this.convert()).delete(range.length);
    this.quill.updateContents(delta, Quill.sources.USER);
    // range.length contributes to delta.length()
    this.quill.setSelection(
      delta.length() - range.length,
      Quill.sources.SILENT,
    );
  }

  prepareMatching() {
    const elementMatchers = [];
    const textMatchers = [];
    this.matchers.forEach(pair => {
      const [selector, matcher] = pair;
      switch (selector) {
        case Node.TEXT_NODE:
          textMatchers.push(matcher);
          break;
        case Node.ELEMENT_NODE:
          elementMatchers.push(matcher);
          break;
        default:
          [].forEach.call(this.container.querySelectorAll(selector), node => {
            // TODO use weakmap
            node[DOM_KEY] = node[DOM_KEY] || [];
            node[DOM_KEY].push(matcher);
          });
          break;
      }
    });
    return [elementMatchers, textMatchers];
  }
}
Clipboard.DEFAULTS = {
  matchers: [],
  matchVisual: false,
};

function applyFormat(delta, format, value) {
  if (typeof format === 'object') {
    return Object.keys(format).reduce((newDelta, key) => {
      return applyFormat(newDelta, key, format[key]);
    }, delta);
  }
  return delta.reduce((newDelta, op) => {
    if (op.attributes && op.attributes[format]) {
      return newDelta.push(op);
    }
    return newDelta.insert(
      op.insert,
      extend({}, { [format]: value }, op.attributes),
    );
  }, new Delta());
}

function computeStyle(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return {};
  const key = '__ql-computed-style';
  if (node[key] == null) {
    node[key] = window.getComputedStyle(node);
  }
  return node[key];
}

function deltaEndsWith(delta, text) {
  let endText = '';
  for (
    let i = delta.ops.length - 1;
    i >= 0 && endText.length < text.length;
    --i // eslint-disable-line no-plusplus
  ) {
    const op = delta.ops[i];
    if (typeof op.insert !== 'string') break;
    endText = op.insert + endText;
  }
  return endText.slice(-1 * text.length) === text;
}

function isLine(node) {
  if (node.childNodes.length === 0) return false; // Exclude embed blocks
  const style = computeStyle(node);
  return ['block', 'list-item'].indexOf(style.display) > -1;
}

function traverse(node, elementMatchers, textMatchers, editorRegistry) {
  // Post-order
  if (node.nodeType === node.TEXT_NODE) {
    return textMatchers.reduce((delta, matcher) => {
      return matcher(node, delta, editorRegistry);
    }, new Delta());
  } else if (node.nodeType === node.ELEMENT_NODE) {
    return [].reduce.call(
      node.childNodes || [],
      (delta, childNode) => {
        let childrenDelta = traverse(childNode, elementMatchers, textMatchers, editorRegistry);
        if (childNode.nodeType === node.ELEMENT_NODE) {
          childrenDelta = elementMatchers.reduce((reducedDelta, matcher) => {
            return matcher(childNode, reducedDelta, editorRegistry);
          }, childrenDelta);
          childrenDelta = (childNode[DOM_KEY] || []
          ).reduce((reducedDelta, matcher) => {
            return matcher(childNode, reducedDelta, editorRegistry);
          }, childrenDelta);
        }
        return delta.concat(childrenDelta);
      },
      new Delta(),
    );
  }
  return new Delta();
}

function matchAlias(format, node, delta) {
  return applyFormat(delta, format, true);
}

function matchAttributor(node, delta, editorRegistry) {
  const attributes = Parchment.Attributor.Attribute.keys(node);
  const classes = Parchment.Attributor.Class.keys(node);
  const styles = Parchment.Attributor.Style.keys(node);
  const formats = {};
  attributes
    .concat(classes)
    .concat(styles)
    .forEach(name => {
      let attr = editorRegistry.query(name, Parchment.Scope.ATTRIBUTE);
      if (attr != null) {
        formats[attr.attrName] = attr.value(node, editorRegistry);
        if (formats[attr.attrName]) return;
      }
      attr = ATTRIBUTE_ATTRIBUTORS[name];
      if (attr != null && (attr.attrName === name || attr.keyName === name)) {
        formats[attr.attrName] = attr.value(node, editorRegistry) || undefined;
      }
      attr = STYLE_ATTRIBUTORS[name];
      if (attr != null && (attr.attrName === name || attr.keyName === name)) {
        attr = STYLE_ATTRIBUTORS[name];
        formats[attr.attrName] = attr.value(node, editorRegistry) || undefined;
      }
    });
  if (Object.keys(formats).length > 0) {
    return applyFormat(delta, formats);
  }
  return delta;
}

function matchBlot(node, delta, editorRegistry) {
  const match = editorRegistry.query(node);
  if (match == null) return delta;
  if (match.prototype instanceof Parchment.Embed) {
    const embed = {};
    const value = match.value(node);
    if (value != null) {
      embed[match.blotName] = value;
      return new Delta().insert(embed, match.formats(node, editorRegistry));
    }
  } else if (typeof match.formats === 'function') {
    return applyFormat(delta, match.blotName, match.formats(node, editorRegistry));
  }
  return delta;
}

function matchBreak(node, delta) {
  if (!deltaEndsWith(delta, '\n')) {
    delta.insert('\n');
  }
  return delta;
}

function matchIgnore() {
  return new Delta();
}

function matchIndent(node, delta, editorRegistry) {
  const match = editorRegistry.query(node);
  if (
    match == null ||
    match.blotName !== 'list-item' ||
    !deltaEndsWith(delta, '\n')
  ) {
    return delta;
  }
  let indent = -1;
  let parent = node.parentNode;
  while (!parent.classList.contains('ql-clipboard')) {
    if ((editorRegistry.query(parent) || {}).blotName === 'list') {
      indent += 1;
    }
    parent = parent.parentNode;
  }
  if (indent <= 0) return delta;
  return delta.compose(
    new Delta().retain(delta.length() - 1).retain(1, { indent }),
  );
}

function matchNewline(node, delta) {
  if (!deltaEndsWith(delta, '\n')) {
    if (
      isLine(node) ||
      (delta.length() > 0 && node.nextSibling && isLine(node.nextSibling))
    ) {
      delta.insert('\n');
    }
  }
  return delta;
}

function matchStyles(node, delta) {
  const formats = {};
  const style = node.style || {};
  if (style.fontStyle && computeStyle(node).fontStyle === 'italic') {
    formats.italic = true;
  }
  if (
    style.fontWeight &&
    (computeStyle(node).fontWeight.startsWith('bold') ||
      parseInt(computeStyle(node).fontWeight, 10) >= 700)
  ) {
    formats.bold = true;
  }
  if (Object.keys(formats).length > 0) {
    delta = applyFormat(delta, formats);
  }
  if (parseFloat(style.textIndent || 0) > 0) {
    // Could be 0.5in
    return new Delta().insert('\t').concat(delta);
  }
  return delta;
}

function matchText(node, delta) {
  let text = node.data;
  // Word represents empty line with <o:p>&nbsp;</o:p>
  if (node.parentNode.tagName === 'O:P') {
    return delta.insert(text.trim());
  }
  if (
    text.trim().length === 0 &&
    node.parentNode.classList.contains('ql-clipboard')
  ) {
    return delta;
  }
  if (!computeStyle(node.parentNode).whiteSpace.startsWith('pre')) {
    const replacer = (collapse, match) => {
      const replaced = match.replace(/[^\u00a0]/g, ''); // \u00a0 is nbsp;
      return replaced.length < 1 && collapse ? ' ' : replaced;
    };
    text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
    text = text.replace(/\s\s+/g, replacer.bind(replacer, true)); // collapse whitespace
    if (
      (node.previousSibling == null && isLine(node.parentNode)) ||
      (node.previousSibling != null && isLine(node.previousSibling))
    ) {
      text = text.replace(/^\s+/, replacer.bind(replacer, false));
    }
    if (
      (node.nextSibling == null && isLine(node.parentNode)) ||
      (node.nextSibling != null && isLine(node.nextSibling))
    ) {
      text = text.replace(/\s+$/, replacer.bind(replacer, false));
    }
  }
  return delta.insert(text);
}

export {
  Clipboard as default,
  matchAttributor,
  matchBlot,
  matchNewline,
  matchText,
};
