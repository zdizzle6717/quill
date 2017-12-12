import { EditorRegistry } from 'parchment';
import equal from 'deep-equal';
import Quill from '../unit';
import CodeBlock from '../../formats/code';

const div = document.createElement('div');
div.id = 'test-container';
document.body.appendChild(div);

window.onerror = function(msg) {
  return msg === 'Script error.';
};

beforeEach(function() {
  jasmine.addMatchers({
    toEqualHTML() {
      return { compare: compareHTML };
    },
    toBeApproximately() {
      return { compare: compareApproximately };
    },
  });

  div.innerHTML = '<div></div>';
  this.container = div.firstChild;
  this.editorRegistry = new EditorRegistry();
  this.initialize = initialize.bind(this);
});

function compareApproximately(actual, expected, tolerance) {
  const pass = Math.abs(actual - expected) <= tolerance;
  return {
    pass,
    message: `${actual} is ${pass ? '' : 'not'} approximately ${expected}`,
  };
}

function compareHTML(actual, expected, ignoreClassId) {
  const [div1, div2] = [actual, expected].map(function(html) {
    if (html instanceof HTMLElement) {
      html = html.innerHTML;
    }
    const container = document.createElement('div');
    container.innerHTML = html.replace(/\n\s*/g, '');
    return container;
  });
  let ignoredAttributes = ['width', 'height'];
  if (ignoreClassId) {
    ignoredAttributes = ignoredAttributes.concat(['class', 'id']);
  }
  const message = compareNodes(div1, div2, ignoredAttributes);
  if (message != null) {
    console.error(div1.innerHTML); // eslint-disable-line no-console
    console.error(div2.innerHTML); // eslint-disable-line no-console
    return { pass: false, message };
  }
  return { pass: true, message: 'HTMLs equal' };
}

function compareNodes(node1, node2, ignoredAttributes = []) {
  if (node1.nodeType !== node2.nodeType) {
    return `Expected nodeType '${node1.nodeType}' to equal '${node2.nodeType}'`;
  }
  if (node1.nodeType === node1.ELEMENT_NODE) {
    if (node1.tagName !== node2.tagName) {
      return `Expected tagName '${node1.tagName}' to equal '${node2.tagName}'`;
    }
    const [attr1, attr2] = [node1, node2].map(function(node) {
      return [].reduce.call(
        node.attributes || {},
        function(attr, elem) {
          if (ignoredAttributes.indexOf(elem.name) < 0) {
            attr[elem.name] =
              elem.name === 'style' ? elem.value.trim() : elem.value;
          }
          return attr;
        },
        {},
      );
    });
    if (!equal(attr1, attr2)) {
      return `Expected attributes ${jasmine.pp(attr1)} to equal ${jasmine.pp(
        attr2,
      )}`;
    }
    if (node1.childNodes.length !== node2.childNodes.length) {
      return `Expected node childNodes length '${node1.childNodes
        .length}' to equal '${node2.childNodes.length}'`;
    }
    if (node1.childNodes.length === 0) return null;
    let message = '';
    if (
      [].some.call(node1.childNodes, function(child1, i) {
        message = compareNodes(child1, node2.childNodes[i], ignoredAttributes);
        return message;
      })
    ) {
      return message;
    }
  } else if (node1.data !== node2.data) {
    return `Expected node text '${node1.data}' to equal '${node2.data}'`;
  }
  return null;
}

function initialize(klass, html, container = this.container, editorRegistry = this.editorRegistry) {
  if (typeof html === 'object') {
    container.innerHTML = html.html;
  } else {
    container.innerHTML = html.replace(/\n\s*/g, '');
  }
  if (klass === HTMLElement) return container;
  if (klass === Quill) {
    const quillInstance = new Quill(container, {}, editorRegistry);
    quillInstance.register(CodeBlock, true);
    return quillInstance;
  };
  return null;
}
