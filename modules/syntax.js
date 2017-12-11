import Inline from '../blots/inline';
import Quill from '../core/quill';
import Module from '../core/module';
import CodeBlock from '../formats/code';

const CODE_TOKEN_CLASS = 'ql-token';

class SyntaxCodeBlock extends CodeBlock {
  static formats(node) {
    return node.getAttribute('data-language') || true;
  }

  replaceWith(block) {
    this.domNode.textContent = this.domNode.textContent;
    this.attach();
    super.replaceWith(block);
  }

  highlight(highlight) {
    const text = this.domNode.textContent;
    if (this.cachedText !== text) {
      if (text.trim().length > 0 || this.cachedText == null) {
        const language = this.statics.formats(this.domNode);
        const subset = typeof language === 'string' ? [language] : undefined;
        this.domNode.innerHTML = highlight(text, subset);
        this.domNode.normalize();
        [].slice.call(this.domNode.querySelectorAll('span')).forEach(token => {
          token.classList.add(CODE_TOKEN_CLASS);
        });
        this.attach();
      }
      this.cachedText = text;
    }
  }
}
SyntaxCodeBlock.className = 'ql-syntax';

class CodeToken extends Inline {
  static formats(node) {
    while (node != null) {
      const parent = Quill.find(node, this.editorRegistry);
      if (parent instanceof SyntaxCodeBlock) {
        return true;
      }
      node = node.parentNode;
    }
    return null;
  }
}
CodeToken.blotName = 'code-token';
CodeToken.className = CODE_TOKEN_CLASS;

class Syntax extends Module {
  static register(quill) {
    quill.register(CodeToken, true);
    quill.register(SyntaxCodeBlock, true);
  }

  constructor(quill, options) {
    super(quill, options);
    if (typeof this.options.highlight !== 'function') {
      throw new Error(
        'Syntax module requires highlight.js. Please include the library on the page before Quill.',
      );
    }
    let timer = null;
    this.quill.on(Quill.events.SCROLL_OPTIMIZE, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.highlight();
        timer = null;
      }, this.options.interval);
    });
    this.highlight();
  }

  highlight() {
    if (this.quill.selection.composing) return;
    this.quill.update(Quill.sources.USER);
    const range = this.quill.getSelection();
    this.quill.scroll.descendants(SyntaxCodeBlock).forEach(code => {
      code.highlight(this.options.highlight);
    });
    this.quill.update(Quill.sources.SILENT);
    if (range != null) {
      this.quill.setSelection(range, Quill.sources.SILENT);
    }
  }
}
Syntax.DEFAULTS = {
  highlight: (() => {
    if (window.hljs == null) return null;
    return (text, subset) => {
      const result = window.hljs.highlightAuto(text, subset);
      return result.value;
    };
  })(),
  interval: 1000,
};

export { SyntaxCodeBlock as CodeBlock, CodeToken, Syntax as default };
