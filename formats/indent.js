import Parchment from 'parchment';

class IdentAttributor extends Parchment.Attributor.Class {
  add(node, value, editorRegistry) {
    if (value === '+1' || value === '-1') {
      const indent = this.value(node, editorRegistry) || 0;
      value = value === '+1' ? indent + 1 : indent - 1;
    }
    if (value === 0) {
      this.remove(node);
      return true;
    }
    return super.add(node, value, editorRegistry);
  }

  canAdd(node, value, editorRegistry) {
    return super.canAdd(node, value, editorRegistry) || super.canAdd(node, parseInt(value, 10), editorRegistry);
  }

  value(node, editorRegistry) {
    return parseInt(super.value(node, editorRegistry), 10) || undefined; // Don't return NaN
  }
}

const IndentClass = new IdentAttributor('indent', 'ql-indent', {
  scope: Parchment.Scope.BLOCK,
  whitelist: [1, 2, 3, 4, 5, 6, 7, 8],
});

export default IndentClass;
