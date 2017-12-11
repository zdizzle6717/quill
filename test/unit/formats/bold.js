import Quill from '../../../core';

describe('Bold', function() {
  it('optimize and merge', function() {
    const { scroll } = this.initialize(
      Quill,
      '<p><strong>a</strong>b<strong>c</strong></p>',
    );
    const bold = document.createElement('b');
    bold.appendChild(scroll.domNode.firstChild.childNodes[1]);
    scroll.domNode.firstChild.insertBefore(
      bold,
      scroll.domNode.firstChild.lastChild,
    );
    scroll.update();
    expect(scroll.domNode).toEqualHTML('<p><strong>abc</strong></p>');
  });
});
