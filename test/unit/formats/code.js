import Delta from 'quill-delta';
import Quill from '../../../core';

describe('Code', function() {
  it('newline', function() {
    const quill = this.initialize(
      Quill,
      `
      <pre></pre>
      <p><br></p>
      <pre>\n</pre>
      <p><br></p>
      <pre>\n\n</pre>
      <p><br></p>
    `,
    );
    expect(quill.editor.scroll.domNode).toEqualHTML(`
      <pre>\n</pre>
      <p><br></p>
      <pre>\n</pre>
      <p><br></p>
      <pre>\n\n</pre>
      <p><br></p>
    `);
  });

  it('default child', function() {
    const { editor } = this.initialize(Quill, '<p><br></p>');
    editor.formatLine(0, 1, { 'code-block': true });
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<pre spellcheck="false">\n</pre>',
    );
  });

  it('merge', function() {
    const { editor } = this.initialize(
      Quill,
      `
      <pre>0</pre>
      <pre>0</pre>
      <p><br></p>
      <pre>0</pre>
      <pre>1\n</pre>
      <p><br></p>
      <pre>0</pre>
      <pre>2\n\n</pre>
      <p><br></p>
      <pre>1\n</pre>
      <pre>0</pre>
      <p><br></p>
      <pre>1\n</pre>
      <pre>1\n</pre>
      <p><br></p>
      <pre>1\n</pre>
      <pre>2\n\n</pre>
      <p><br></p>
      <pre>2\n\n</pre>
      <pre>0</pre>
      <p><br></p>
      <pre>2\n\n</pre>
      <pre>1\n</pre>
      <p><br></p>
      <pre>2\n\n</pre>
      <pre>2\n\n</pre>
    `,
    );
    editor.scroll.lines().forEach(function(line) {
      line.optimize();
    });
    expect(editor.scroll.domNode).toEqualHTML(`
      <pre>0\n0\n</pre>
      <p><br></p>
      <pre>0\n1\n</pre>
      <p><br></p>
      <pre>0\n2\n\n</pre>
      <p><br></p>
      <pre>1\n0\n</pre>
      <p><br></p>
      <pre>1\n1\n</pre>
      <p><br></p>
      <pre>1\n2\n\n</pre>
      <p><br></p>
      <pre>2\n\n0\n</pre>
      <p><br></p>
      <pre>2\n\n1\n</pre>
      <p><br></p>
      <pre>2\n\n2\n\n</pre>
    `);
  });

  it('merge multiple', function() {
    const { editor } = this.initialize(
      Quill,
      `
      <pre>0</pre>
      <pre>1</pre>
      <pre>2</pre>
      <pre>3</pre>
    `,
    );
    editor.scroll.children.head.optimize();
    expect(editor.scroll.domNode).toEqualHTML(`
      <pre>0\n1\n2\n3\n</pre>
    `);
  });

  it('add', function() {
    const { editor } = this.initialize(Quill, '<p><em>0123</em></p><p>5678</p>');
    editor.formatLine(2, 5, { 'code-block': true });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('0123')
        .insert('\n', { 'code-block': true })
        .insert('5678')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<pre spellcheck="false">0123\n5678\n</pre>',
    );
  });

  it('remove', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>0123\n</pre>' });
    editor.formatText(4, 1, { 'code-block': false });
    expect(editor.getDelta()).toEqual(new Delta().insert('0123\n'));
    expect(editor.scroll.domNode).toEqualHTML('<p>0123</p>');
  });

  it('delete last', function() {
    const { editor } = this.initialize(Quill, {
      html: '<p>0123</p><pre>\n</pre><p>5678</p>',
    });
    editor.deleteText(4, 1);
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('0123')
        .insert('\n', { 'code-block': true })
        .insert('5678\n'),
    );
    expect(editor.scroll.domNode).toEqualHTML('<pre>0123</pre><p>5678</p>');
  });

  it('delete merge before', function() {
    const { editor } = this.initialize(Quill, {
      html: '<h1>0123</h1><pre>4567\n</pre>',
    });
    editor.deleteText(4, 1);
    expect(editor.getDelta()).toEqual(
      new Delta().insert('01234567').insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode).toEqualHTML('<pre>01234567\n</pre>');
  });

  it('delete merge after', function() {
    const { editor } = this.initialize(Quill, {
      html: '<pre>0123\n</pre><h1>4567</h1>',
    });
    editor.deleteText(4, 1);
    expect(editor.getDelta()).toEqual(
      new Delta().insert('01234567').insert('\n', { header: 1 }),
    );
    expect(editor.scroll.domNode).toEqualHTML('<h1>01234567</h1>');
  });

  it('delete across before partial merge', function() {
    const { editor } = this.initialize(Quill, {
      html: '<pre>01\n34\n67\n</pre><h1>90</h1>',
    });
    editor.deleteText(7, 3);
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { 'code-block': true })
        .insert('34')
        .insert('\n', { 'code-block': true })
        .insert('60')
        .insert('\n', { header: 1 }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqualHTML(
      '<pre>01\n34\n</pre><h1>60</h1>',
    );
  });

  it('delete across before no merge', function() {
    const { editor } = this.initialize(Quill, {
      html: '<pre>01\n34\n</pre><h1>6789</h1>',
    });
    editor.deleteText(3, 5);
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { 'code-block': true })
        .insert('89')
        .insert('\n', { header: 1 }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqualHTML(
      '<pre>01\n</pre><h1>89</h1>',
    );
  });

  it('delete across after', function() {
    const { editor } = this.initialize(Quill, {
      html: '<h1>0123</h1><pre>56\n89\n</pre>',
    });
    editor.deleteText(2, 4);
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('016')
        .insert('\n', { 'code-block': true })
        .insert('89')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqualHTML('<pre>016\n89\n</pre>');
  });

  it('replace', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>0123\n</pre>' });
    editor.formatText(4, 1, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta().insert('0123').insert('\n', { header: 1 }),
    );
    expect(editor.scroll.domNode).toEqualHTML('<h1>0123</h1>');
  });

  it('replace multiple', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>01\n23\n</pre>' });
    editor.formatText(0, 6, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { header: 1 })
        .insert('23')
        .insert('\n', { header: 1 }),
    );
    expect(editor.scroll.domNode).toEqualHTML('<h1>01</h1><h1>23</h1>');
  });

  it('format interior line', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>01\n23\n45\n</pre>' });
    editor.formatText(5, 1, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { 'code-block': true })
        .insert('23')
        .insert('\n', { header: 1 })
        .insert('45')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<pre>01\n</pre><h1>23</h1><pre>45\n</pre>',
    );
  });

  it('format imprecise bounds', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>01\n23\n45\n</pre>' });
    editor.formatText(1, 6, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { header: 1 })
        .insert('23')
        .insert('\n', { header: 1 })
        .insert('45')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<h1>01</h1><h1>23</h1><pre>45\n</pre>',
    );
  });

  it('format without newline', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>01\n23\n45\n</pre>' });
    editor.formatText(3, 1, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { 'code-block': true })
        .insert('23')
        .insert('\n', { 'code-block': true })
        .insert('45')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqual('<pre>01\n23\n45\n</pre>');
  });

  it('format line', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>01\n23\n45\n</pre>' });
    editor.formatLine(3, 1, { header: 1 });
    expect(editor.getDelta()).toEqual(
      new Delta()
        .insert('01')
        .insert('\n', { 'code-block': true })
        .insert('23')
        .insert('\n', { header: 1 })
        .insert('45')
        .insert('\n', { 'code-block': true }),
    );
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<pre>01\n</pre><h1>23</h1><pre>45\n</pre>',
    );
  });

  it('ignore formatAt', function() {
    const quill = this.initialize(Quill, '<pre>0123</pre>');
    quill.editor.formatText(1, 1, { bold: true });
    expect(quill.editor.getDelta()).toEqual(
      new Delta().insert('0123').insert('\n', { 'code-block': true }),
    );
    expect(quill.editor.scroll.domNode).toEqualHTML('<pre>0123</pre>');
  });

  it('partial block modification applyDelta', function() {
    const { editor } = this.initialize(Quill, { html: '<pre>a\nb\n\n</pre>' });
    const delta = new Delta()
      .retain(3)
      .insert('\n', { 'code-block': true })
      .delete(1)
      .retain(1, { 'code-block': null });
    editor.applyDelta(delta);
    expect(editor.scroll.domNode.innerHTML).toEqual(
      '<pre>a\nb\n</pre><p><br></p>',
    );
  });
});
