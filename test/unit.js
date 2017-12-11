/* eslint-disable */

import Quill from '../quill.js';
import CodeBlock from '../formats/code';

// TODO: Determine whether this is still necessary
// Quill.register(CodeBlock, true); // Syntax version will otherwise be registered
Quill.QUILL_EXTRA_DEFAULTS = Object.assign(Quill.QUILL_EXTRA_DEFAULTS, {
  'formats/code-block': CodeBlock
});

import './helpers/unit';

import './unit/blots/scroll';
import './unit/blots/block';
import './unit/blots/block-embed';
import './unit/blots/inline';

import './unit/core/editor';
import './unit/core/selection';
import './unit/core/quill';

import './unit/formats/color';
import './unit/formats/link';
import './unit/formats/script';
import './unit/formats/align';
import './unit/formats/code';
import './unit/formats/header';
import './unit/formats/indent';
import './unit/formats/list';
import './unit/formats/bold';

import './unit/modules/clipboard';
import './unit/modules/history';
import './unit/modules/keyboard';
import './unit/modules/syntax';
import './unit/modules/toolbar';

import './unit/ui/picker';
import './unit/theme/base/tooltip';

export default Quill;
