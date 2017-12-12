import Parchment from 'parchment';

const config = {
  scope: Parchment.Scope.INLINE,
  whitelist: ['serif', 'monospace'],
};

const FontClass = new Parchment.Attributor.Class('font', 'ql-font', config);

class FontStyleAttributor extends Parchment.Attributor.Style {
  value(node, editorRegistry) {
    return super.value(node, editorRegistry).replace(/["']/g, '');
  }
}

const FontStyle = new FontStyleAttributor('font', 'font-family', config);

export { FontStyle, FontClass };
