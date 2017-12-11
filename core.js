import Quill from './core/quill';

// Default blots
import Block, { BlockEmbed } from './blots/block';
import Break from './blots/break';
import Container from './blots/container';
import Cursor from './blots/cursor';
import Embed from './blots/embed';
import Inline from './blots/inline';
import Scroll from './blots/scroll';
import TextBlot from './blots/text';

// Default modules
import Clipboard from './modules/clipboard';
import History from './modules/history';
import Keyboard from './modules/keyboard';

Quill.QUILL_CORE_DEFAULTS = {
  'blots/block': Block,
  'blots/block/embed': BlockEmbed,
  'blots/break': Break,
  'blots/container': Container,
  'blots/cursor': Cursor,
  'blots/embed': Embed,
  'blots/inline': Inline,
  'blots/scroll': Scroll,
  'blots/text': TextBlot,

  'modules/clipboard': Clipboard,
  'modules/history': History,
  'modules/keyboard': Keyboard,
};

Quill.PARCHMENT_DEFAULTS = [Block, Break, Cursor, Inline, Scroll, TextBlot];

export default Quill;
