import Emitter from '../../../core/emitter';
import { Range } from '../../../core/selection';
import Cursor from '../../../blots/cursor';
import Quill from '../../../core/quill';

describe('Scroll', function() {
  it('initialize empty document', function() {
    const { scroll } = this.initialize(Quill, '');
    expect(scroll.domNode).toEqualHTML('<p><br></p>');
  });

  it('api change', function() {
    const { scroll } = this.initialize(Quill, '<p>Hello World!</p>');
    spyOn(scroll.emitter, 'emit').and.callThrough();
    scroll.insertAt(5, '!');
    expect(scroll.emitter.emit).toHaveBeenCalledWith(
      Emitter.events.SCROLL_OPTIMIZE,
      jasmine.any(Array),
      jasmine.any(Object)
    );
  });

  it('user change', function(done) {
    const { scroll } = this.initialize(Quill, '<p>Hello World!</p>');
    spyOn(scroll.emitter, 'emit').and.callThrough();
    scroll.domNode.firstChild.appendChild(document.createTextNode('!'));
    setTimeout(function() {
      expect(scroll.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.SCROLL_OPTIMIZE,
        jasmine.any(Array),
        jasmine.any(Object)
      );
      expect(scroll.emitter.emit).toHaveBeenCalledWith(
        Emitter.events.SCROLL_UPDATE,
        Emitter.sources.USER,
        jasmine.any(Array)
      );
      done();
    }, 1);
  });

  it('whitelist', function() {
    const quill = this.initialize(Quill, '');
    const scroll = quill.editorRegistry.create('scroll', {
      emitter: new Emitter(),
      whitelist: ['bold']
    });
    scroll.insertAt(0, 'Hello World!');
    scroll.formatAt(0, 5, 'bold', true);
    scroll.formatAt(6, 5, 'italic', true);
    expect(scroll.domNode.firstChild).toEqualHTML(
      '<strong>Hello</strong> World!'
    );
  });

  describe('leaf()', function() {
    it('text', function() {
      const { scroll } = this.initialize(Quill, '<p>Tests</p>');
      const [leaf, offset] = scroll.leaf(2);
      expect(leaf.value()).toEqual('Tests');
      expect(offset).toEqual(2);
    });

    it('precise', function() {
      const { scroll } = this.initialize(
        Quill,
        '<p><u>0</u><s>1</s><u>2</u><s>3</s><u>4</u></p>'
      );
      const [leaf, offset] = scroll.leaf(3);
      expect(leaf.value()).toEqual("2");
      expect(offset).toEqual(1);
    });

    it('newline', function() {
      const { scroll } = this.initialize(Quill, '<p>0123</p><p>5678</p>');
      const [leaf, offset] = scroll.leaf(4);
      expect(leaf.value()).toEqual('0123');
      expect(offset).toEqual(4);
    });

    it('cursor', function() {
      const { selection } = this.initialize(Quill, '<p><u>0</u>1<u>2</u></p>');
      selection.setRange(new Range(2));
      selection.format('strike', true);
      const [leaf, offset] = selection.scroll.leaf(2);
      expect(leaf instanceof Cursor).toBe(true);
      expect(offset).toEqual(0);
    });

    it('beyond document', function() {
      const { scroll } = this.initialize(Quill, '<p>Test</p>');
      const [leaf, offset] = scroll.leaf(10);
      expect(leaf).toEqual(null);
      expect(offset).toEqual(-1);
    });
  });
});
