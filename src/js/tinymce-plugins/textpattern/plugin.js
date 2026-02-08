/**
 * Text pattern plugin for TinyMCE 6 (local fallback; not in npm package).
 * Markdown-style patterns: *bold*, _italic_, # h1, ## h2, -, *, 1. lists, etc.
 * Based on TinyMCE textpattern behavior; compatible with TinyMCE 6 API.
 */
(function () {
  'use strict';

  function escapeRegExp(s) {
    return s.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  }

  tinymce.PluginManager.add('textpattern', function (editor) {
    const VK = tinymce.util.VK;
    const settings = editor.getParam('textpattern_patterns') || {};
    const flatPatterns = editor.getParam('text_patterns');

    let spacePatterns = settings.space || [
      { regExp: /^[*-]\s/, cmd: 'InsertUnorderedList' },
      { regExp: /^1[.)]\s/, cmd: 'InsertOrderedList' }
    ];
    let enterPatterns = settings.enter || [
      { start: '## ', format: 'h2' },
      { start: '### ', format: 'h3' },
      { start: '#### ', format: 'h4' },
      { start: '##### ', format: 'h5' },
      { start: '###### ', format: 'h6' },
      { start: '> ', format: 'blockquote' },
      { regExp: /^(-){3,}\s?$/, element: 'hr' }
    ];

    if (flatPatterns && Array.isArray(flatPatterns)) {
      spacePatterns = [];
      enterPatterns = [];
      flatPatterns.forEach(function (item) {
        if (!item.start) return;
        var startEsc = escapeRegExp(item.start);
        var spaceRegExp = new RegExp('^' + startEsc);
        if (item.cmd === 'InsertUnorderedList' || item.cmd === 'InsertOrderedList') {
          spacePatterns.push({ regExp: spaceRegExp, cmd: item.cmd });
        } else if (item.cmd === 'InsertHorizontalRule') {
          enterPatterns.push({ start: item.start, cmd: item.cmd });
        } else if (item.format) {
          enterPatterns.push({ start: item.start, format: item.format });
        }
      });
      if (spacePatterns.length === 0) {
        spacePatterns = [
          { regExp: /^[*-]\s/, cmd: 'InsertUnorderedList' },
          { regExp: /^1[.)]\s/, cmd: 'InsertOrderedList' }
        ];
      }
      if (enterPatterns.length === 0) {
        enterPatterns = [
          { start: '## ', format: 'h2' },
          { start: '### ', format: 'h3' },
          { start: '#### ', format: 'h4' },
          { start: '##### ', format: 'h5' },
          { start: '###### ', format: 'h6' },
          { start: '> ', format: 'blockquote' },
          { regExp: /^(-){3,}\s?$/, element: 'hr' }
        ];
      }
    }

    const inlinePatterns = settings.inline || [
      { delimiter: '**', format: 'bold' },
      { delimiter: '*', format: 'italic' },
      { delimiter: '`', format: 'code' }
    ];

    let canUndo;

    editor.on('selectionchange', function () {
      canUndo = null;
    });

    editor.on('keydown', function (e) {
      if ((canUndo && e.keyCode === 27) || (canUndo === 'space' && e.keyCode === VK.BACKSPACE)) {
        editor.undoManager.undo();
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (VK.metaKeyPressed(e)) return;
      if (e.keyCode === VK.ENTER) {
        enter();
      } else if (e.keyCode === VK.SPACEBAR) {
        setTimeout(space, 0);
      } else if (e.keyCode > 47 && !(e.keyCode >= 91 && e.keyCode <= 93)) {
        setTimeout(inline, 0);
      }
    }, true);

    function inline() {
      const rng = editor.selection.getRng();
      let node = rng.startContainer;
      const offset = rng.startOffset;
      let startOffset, endOffset, pattern, zero;

      if (!node || node.nodeType !== 3 || !node.data.length || !offset) return;
      const string = node.data.slice(0, offset);
      const lastChar = node.data.charAt(offset - 1);

      for (let i = 0; i < inlinePatterns.length; i++) {
        const p = inlinePatterns[i];
        if (lastChar !== p.delimiter.slice(-1)) continue;
        const escDelimiter = escapeRegExp(p.delimiter);
        const delimiterFirstChar = p.delimiter.charAt(0);
        const regExp = new RegExp('(.*)' + escDelimiter + '.+' + escDelimiter + '$');
        const match = string.match(regExp);
        if (!match) continue;
        startOffset = match[1].length;
        endOffset = offset - p.delimiter.length;
        const before = string.charAt(startOffset - 1);
        const after = string.charAt(startOffset + p.delimiter.length);
        if (startOffset && /\S/.test(before)) {
          if (/\s/.test(after) || before === delimiterFirstChar) continue;
        }
        if (new RegExp('^[\\s' + escapeRegExp(delimiterFirstChar) + ']+$').test(string.slice(startOffset, endOffset))) continue;
        pattern = p;
        break;
      }
      if (!pattern) return;
      const format = editor.formatter.get(pattern.format);
      if (!format || !format[0].inline) return;
      editor.undoManager.add();
      editor.undoManager.transact(function () {
        node.insertData(offset, '\uFEFF');
        node = node.splitText(startOffset);
        zero = node.splitText(offset - startOffset);
        node.deleteData(0, pattern.delimiter.length);
        node.deleteData(node.data.length - pattern.delimiter.length, pattern.delimiter.length);
        editor.formatter.apply(pattern.format, {}, node);
        editor.selection.setCursorLocation(zero, 1);
      });
      setTimeout(function () {
        canUndo = 'space';
        editor.once('selectionchange', function () {
          if (zero && zero.data) {
            const idx = zero.data.indexOf('\uFEFF');
            if (idx !== -1) zero.deleteData(idx, 1);
          }
        });
      }, 0);
    }

    function firstTextNode(node) {
      let parent = editor.dom.getParent(node, 'p');
      if (!parent) return null;
      let child = parent.firstChild;
      while (child && child.nodeType !== 3) {
        parent = child;
        child = parent.firstChild;
      }
      if (!child || !child.data) {
        if (child && child.nextSibling && child.nextSibling.nodeType === 3) child = child.nextSibling;
        else child = null;
      }
      return child;
    }

    function space() {
      const rng = editor.selection.getRng();
      let node = rng.startContainer;
      if (!node || firstTextNode(node) !== node) return;
      const parent = node.parentNode;
      const text = node.data;
      for (let i = 0; i < spacePatterns.length; i++) {
        const pattern = spacePatterns[i];
        const match = text.match(pattern.regExp);
        if (!match || rng.startOffset !== match[0].length) continue;
        editor.undoManager.add();
        editor.undoManager.transact(function () {
          node.deleteData(0, match[0].length);
          if (!parent.innerHTML) parent.appendChild(editor.getDoc().createElement('br'));
          editor.selection.setCursorLocation(parent);
          editor.execCommand(pattern.cmd);
        });
        setTimeout(function () { canUndo = 'space'; }, 0);
        return;
      }
    }

    function enter() {
      const rng = editor.selection.getRng();
      const start = rng.startContainer;
      const node = firstTextNode(start);
      if (!node) return;
      const text = node.data;
      let pattern = null;
      for (let i = enterPatterns.length - 1; i >= 0; i--) {
        if (enterPatterns[i].start) {
          if (text.indexOf(enterPatterns[i].start) === 0) {
            pattern = enterPatterns[i];
            break;
          }
        } else if (enterPatterns[i].regExp && enterPatterns[i].regExp.test(text)) {
          pattern = enterPatterns[i];
          break;
        }
      }
      if (!pattern) return;
      if (node === start && tinymce.trim(text) === (pattern.start || text)) return;
      editor.once('keyup', function () {
        editor.undoManager.add();
        editor.undoManager.transact(function () {
          var startLen = (pattern.start && pattern.start.length) || 0;
          if (pattern.format) {
            editor.formatter.apply(pattern.format, {}, node);
            node.replaceData(0, node.data.length, node.data.slice(startLen).replace(/^\s+/, ''));
          } else if (pattern.element) {
            var parent = node.parentNode && node.parentNode.parentNode;
            if (parent) parent.replaceChild(editor.getDoc().createElement(pattern.element), node.parentNode);
          } else if (pattern.cmd) {
            if (startLen) node.deleteData(0, startLen);
            editor.selection.setCursorLocation(node.parentNode, 0);
            editor.execCommand(pattern.cmd);
          }
        });
        setTimeout(function () { canUndo = 'enter'; }, 0);
      });
    }
  });
})();
