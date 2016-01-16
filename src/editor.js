import Delta from 'rich-text/lib/delta';
import Emitter from './emitter';
import Parchment from 'parchment';
import extend from 'extend';


class Editor {
  constructor(scroll, emitter) {
    this.scroll = scroll;
    this.emitter = emitter;
    this.emitter.on(Emitter.events.SCROLL_UPDATE, this.update, this);
    this.delta = this.getDelta();
    this.enable();
  }

  applyDelta(delta, source = Emitter.sources.API) {
    delta.ops.reduce((index, op) => {
      if (typeof op.delete === 'number') {
        this.scroll.deleteAt(index, op.delete);
        return index;
      }
      let length = op.retain || op.insert.length || 1;
      if (typeof op.insert === 'string') {
        this.scroll.insertAt(index, op.insert);
      } else if (typeof op.insert === 'object') {
        let key = Object.keys(op.insert)[0];
        this.scroll.insertAt(index, key, op.insert[key]);
      }
      Object.keys(op.attributes || {}).forEach((name) => {
        this.scroll.formatAt(index, op.retain, name, op.attributes[name]);
      });
      return index + length;
    }, 0);
    this.update(source);
  }

  deleteText(start, end, source = Emitter.sources.API) {
    this.scroll.deleteAt(start, end - start);
    this.update(source);
  }

  enable(enabled = true) {
    this.scroll.domNode.setAttribute('contenteditable', enabled);
  }

  formatLine(start, end, formats = {}, source = Emitter.sources.API) {
    Object.keys(formats).forEach((format) => {
      this.scroll.getLines(start, end - start).forEach(function(line) {
        line.format(format, formats[format]);
      });
    });
    this.update(source);
  }

  formatText(start, end, formats = {}, source = Emitter.sources.API) {
    Object.keys(formats).forEach((format) => {
      this.scroll.formatAt(start, end - start, format, formats[format]);
    });
    this.update(source);
  }

  getContents(start, end) {
    return this.delta.slice(start, end);
  }

  getDelta() {
    return this.scroll.getLines().reduce((delta, line) => {
      line.getDescendants(Parchment.Leaf).forEach((blot) => {
        if (blot.getLength() === 0) return delta;
        let attributes = {};
        let value = blot.getValue();
        while (blot != line) {
          attributes = extend({}, blot.getFormat(), attributes);
          blot = blot.parent;
        }
        delta.insert(value, attributes);
      });
      return delta.insert('\n', line.getFormat());
    }, new Delta());
  }

  getFormat(start, end) {
    let blockFormats = {}, inlineFormats = {};
    let combine = function(formats1, formats2) {
      return Object.keys(formats2).reduce(function(formats2, name) {
        if (formats1[name] != null && formats1[name] !== formats2[name]) {
          if (Array.isArray(formats1[name])) {
            if (formats1[name].indexOf(formats2[name]) < 0) {
              formats1[name].push(formats2[name]);
            }
          } else {
            formats1[name] = [formats1[name], formats2[name]];
          }
        }
        return formats2;
      }, formats2);
    }
    this.scroll.getLines().every(function(line, i) {
      if (i === 0) {
        blockFormats = line.getFormat();
      } else if (Object.keys(lineFormats).length > 0) {
        blockFormats = combine(line.getFormat(), blockFormats);
      }
      if (i == 0 || Object.keys(inlineFormats).length > 0) {
        line.getDescendants(Parchment.Leaf).every(function(leafFormats, blot, j) {
          let formats = {};
          while (blot.parent instanceof Parchment.Inline) {
            formats = extend(format, blot.parent.getFormat());
            blot = blot.parent;
          }
          if (i === 0 && j === 0) {
            inlineFormats = formats;
          } else {
            inlineFormats = combine(formats, inlineFormats);
          }
          return Object.keys(inlineFormats).length > 0;
        });
      }
      return Object.keys(blockFormats).length !== 0 && Object.keys(inlineFormats).length !== 0;
    });
    return extend(blockFormats, inlineFormats);
  }

  getHTML() {
    return this.delta.toHTML();
  }

  getText(start, end) {
    // TODO optimize
    let values = [].concat.apply([], this.scroll.getValue());
    return values.map(function(value) {
      return typeof value === 'string' ? value : '';   // Exclude embeds
    }).join('').slice(start, end);
  }

  insertEmbed(index, embed, value, formats = {}, source = Emitter.sources.API) {
    this.scroll.insertAt(index, embed, value);
    this.formatText(index, index + 1, formats, source);
  }

  insertText(index, text, formats = {}, source = Emitter.sources.API) {
    this.scroll.insertAt(index, text);
    this.formatText(index, index + text.length, formats, source);
  }

  update(source = Emitter.sources.USER) {
    let oldDelta = this.delta;
    this.delta = this.getDelta();
    let change = oldDelta.diff(this.delta);
    if (change.length() > 0) {
      this.emitter.emit(Emitter.events.TEXT_CHANGE, change, source);
    }
  }
}


export { Editor as default };