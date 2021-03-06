import Embed from '../blots/embed';

class Formula extends Embed {
  static create(value) {
    const node = super.create(value);
    if (typeof value === 'string') {
      window.katex.render(value, node, {
        throwOnError: false,
        errorColor: '#f00',
      });
      node.setAttribute('data-value', value);
    }
    return node;
  }

  static register() {
    if (window.katex == null) {
      throw new Error('Formula module requires KaTeX.');
    }
  }

  static value(domNode) {
    return domNode.getAttribute('data-value');
  }
}
Formula.blotName = 'formula';
Formula.className = 'ql-formula';
Formula.tagName = 'SPAN';

export default Formula;
