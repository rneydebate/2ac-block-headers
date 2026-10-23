// plugin.js - 2AC Block Headers for CardMirror.
//
// Select a run of 1NC cards and analytics, run "Copy 2AC block headers",
// and paste. Each argument becomes a Block plus an Analytic:
//
//   2AC---AT: Garcia 23                   (block)
//   [1NC 1] "China won't preempt" is wrong:   (analytic)
//
// Cards are named by the short cite's author and date; analytics and
// uncited tags by a 1-3 word summary of their lead clause. The clipboard carries CardMirror-native
// HTML (pmd-* classes), so a paste back into CardMirror lands as real
// blocks and analytics, plus a plain-text fallback.
(function () {
  'use strict';

  var PLUGIN_ID = 'cardmirror-2ac-headers';

  var DEFAULTS = {
    speech: '2AC',
    answering: '1NC',
    includeYear: true,
    claimWords: 10,
    blockWords: 3,
    restartPerBlock: false,
  };

  /** A dash that separates clauses: "---", a spaced hyphen, or an en or
   *  em dash. A hyphen inside a word ("Garcia-Lopez", "buy-in") is not. */
  var CLAUSE_DASH = /\s*-{2,}\s*|\s+-\s*|\s*-\s+|\s*[–—]\s*/;

  /** "Garcia 23 - Professor of Law" -> "Garcia 23" (or "Garcia" without
   *  the year). Keeps the author and the first digit-led token (the
   *  date) and drops whatever the cite carries after them. */
  function authorFromCite(cite, includeYear) {
    var text = String(cite || '').replace(/\s+/g, ' ').trim();
    var m = /^(.*?)[\s,]+(['‘’]?\d\S*?)(?=[\s,;:–—-]|$)/.exec(text);
    var author = m ? m[1] : text;
    var year = m ? m[2].replace(/[.,;:]+$/, '') : '';
    author = author.split(CLAUSE_DASH)[0].split(/\s*[([]/)[0].replace(/[\s,;:]+$/, '');
    if (!author) return text;
    return includeYear && year ? author + ' ' + year : author;
  }

  /** Words a 1-3 word block name can do without. Negations stay. */
  var FILLER = /^(a|an|the|this|that|these|those|its|their|our|of|to|in|on|at|for|with|by|from|and|or|is|are|was|were|be|been|will|would|can|could|should)$/i;

  /** "Emboldenment inevitable – US mutual defense treaty..." ->
   *  "Emboldenment Inevitable": the lead clause, filler words dropped,
   *  at most `maxWords` words, title-cased. */
  function summarize(text, maxWords) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    s = s.split(CLAUSE_DASH)[0];
    s = s.split(/[,:;!?()[\]]|(?<![A-Z])\.(?=\s|$)/)[0];
    s = s.split(/\s+(?:because|since|so|which|while|but|unless|given|as|when|if)\s+/i)[0];
    var words = s.replace(/["“”]/g, '').split(' ').filter(Boolean);
    var content = words.filter(function (w) { return !FILLER.test(w); });
    if (content.length > 0) words = content;
    return words
      .slice(0, maxWords)
      .map(function (w) { return w.replace(/(^|-)([a-z])/g, function (_, p, c) { return p + c.toUpperCase(); }); })
      .join(' ')
      .replace(/[\s.,;:!?'‘’]+$/, '');
  }

  /** Cut an argument down to a short reference: the first sentence or
   *  clause, capped at `maxWords`, with trailing punctuation removed. */
  function shortClaim(text, maxWords) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    // Debate tags chain clauses with dashes or end a sentence early.
    s = s.split(CLAUSE_DASH)[0].split(/(?<=[.!?])\s+/)[0] || s;
    var words = s.split(' ');
    var cut = words.length > maxWords;
    s = words.slice(0, maxWords).join(' ');
    s = s.replace(/[\s.,;:!?]+$/, '');
    if (cut) s += '...';
    // The claim sits inside double quotes; keep inner quotes from closing it.
    return s.replace(/["“”]/g, "'");
  }

  /** Group extracted items into arguments. A tag opens a card and takes
   *  the next cite; an analytic stands alone. Undertags are skipped, and
   *  pocket/hat/block headings only matter for restarting the count. */
  function groupArguments(items) {
    var args = [];
    var current = null;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.kind === 'tag') {
        current = { kind: 'card', claim: item.text, cite: null };
        args.push(current);
      } else if (item.kind === 'cite') {
        if (current && current.kind === 'card' && current.cite === null) {
          current.cite = item.text;
        }
      } else if (item.kind === 'analytic') {
        current = { kind: 'analytic', claim: item.text, cite: null };
        args.push(current);
      } else if (item.kind === 'pocket' || item.kind === 'hat' || item.kind === 'block') {
        current = null;
        args.push({ kind: 'section' });
      }
    }
    return args;
  }

  /** Turn extracted items into header lines: [{ block, analytic }]. */
  function buildHeaders(items, opts) {
    var o = {};
    for (var k in DEFAULTS) o[k] = opts && opts[k] !== undefined ? opts[k] : DEFAULTS[k];
    var claimWords = clampWords(o.claimWords, DEFAULTS.claimWords);
    var blockWords = Math.min(clampWords(o.blockWords, DEFAULTS.blockWords), 3);
    var speech = String(o.speech).trim() || DEFAULTS.speech;
    var answering = String(o.answering).trim() || DEFAULTS.answering;

    var out = [];
    var n = 0;
    var args = groupArguments(items);
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (arg.kind === 'section') {
        if (o.restartPerBlock) n = 0;
        continue;
      }
      n++;
      var ref = arg.cite
        ? authorFromCite(arg.cite, o.includeYear)
        : summarize(arg.claim, blockWords);
      out.push({
        block: speech + '---AT: ' + ref,
        analytic: '[' + answering + ' ' + n + '] "' + shortClaim(arg.claim, claimWords) + '" is wrong:',
      });
    }
    return out;
  }

  function clampWords(value, fallback) {
    var v = Math.floor(Number(value));
    if (!isFinite(v) || v < 1) return fallback;
    return Math.min(v, 60);
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** CardMirror's own clipboard shape: a block is h3.pmd-block, an
   *  analytic lives in div.pmd-analytic-unit > p.pmd-analytic. The extra
   *  "Analytic" class names Verbatim's style for pastes into Word. */
  function toHtml(headers) {
    var parts = [];
    for (var i = 0; i < headers.length; i++) {
      parts.push(
        '<h3 class="pmd-block">' + escapeHtml(headers[i].block) + '</h3>' +
          '<div class="pmd-analytic-unit"><p class="pmd-analytic Analytic">' +
          escapeHtml(headers[i].analytic) + '</p></div>',
      );
    }
    return parts.join('');
  }

  function toText(headers) {
    return headers.map(function (h) { return h.block + '\n' + h.analytic; }).join('\n\n');
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /** Same ladder CardMirror's own copy commands use: the desktop
   *  main-process clipboard, then navigator.clipboard with retries (the
   *  Windows clipboard lock is often briefly held), then text-only
   *  execCommand. Resolves true on success. */
  async function writeClipboard(html, text) {
    var host = typeof window !== 'undefined' ? window.electronAPI : undefined;
    var delays = [100, 250, 500];
    for (var attempt = 0; attempt <= delays.length; attempt++) {
      try {
        if (host && typeof host.clipboardWriteHtml === 'function') {
          if ((await host.clipboardWriteHtml(html, text)) === true) return true;
        }
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              'text/plain': new Blob([text], { type: 'text/plain' }),
            }),
          ]);
          return true;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        break;
      } catch (err) {
        if (attempt === delays.length) console.error('[' + PLUGIN_ID + '] clipboard write failed', err);
        else await delay(delays[attempt]);
      }
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand('copy');
    } catch (e) {
      return false;
    } finally {
      ta.remove();
    }
  }

  var EXTRACT_ERRORS = {
    'no-active-doc': 'Open a document first.',
    'no-heading-at-cursor': 'Select the 1NC cards and analytics you want to answer.',
    'empty-selection': 'No cards or analytics in the selection.',
  };

  async function copyHeaders(api) {
    var result = api.extractSelection();
    if (!result.ok) {
      api.showToast(EXTRACT_ERRORS[result.error] || 'Could not read the selection: ' + result.error);
      return;
    }
    var opts = {};
    for (var k in DEFAULTS) {
      var v = api.settings.get(k);
      if (v !== undefined) opts[k] = v;
    }
    var headers = buildHeaders(result.items, opts);
    if (headers.length === 0) {
      api.showToast('No cards or analytics in the selection.');
      return;
    }
    var ok = await writeClipboard(toHtml(headers), toText(headers));
    if (!ok) {
      api.showToast("Couldn't copy. The clipboard was busy. Try again.");
      return;
    }
    var n = headers.length;
    api.showToast('Copied ' + n + ' 2AC block header' + (n === 1 ? '' : 's') + '.');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { authorFromCite: authorFromCite, summarize: summarize, shortClaim: shortClaim, buildHeaders: buildHeaders, toHtml: toHtml, toText: toText };
  }

  if (typeof window === 'undefined' || !window.__registerCardMirrorPlugin) return;

  window.__registerCardMirrorPlugin({
    id: PLUGIN_ID,
    name: '2AC Block Headers',
    apiVersion: 1,
    settings: [
      {
        key: 'speech',
        label: 'Answering speech',
        type: 'text',
        default: DEFAULTS.speech,
        description: 'Starts each block, as in "2AC---AT: Garcia 23".',
      },
      {
        key: 'answering',
        label: 'Speech being answered',
        type: 'text',
        default: DEFAULTS.answering,
        description: 'Used in the number, as in "[1NC 1]".',
      },
      {
        key: 'includeYear',
        label: 'Keep the year in author names',
        type: 'boolean',
        default: DEFAULTS.includeYear,
        description: 'On: "AT: Garcia 23". Off: "AT: Garcia".',
      },
      {
        key: 'claimWords',
        label: 'Most words in the quoted claim',
        type: 'number',
        default: DEFAULTS.claimWords,
      },
      {
        key: 'blockWords',
        label: 'Most words in a block name with no author (1 to 3)',
        type: 'number',
        default: DEFAULTS.blockWords,
        description: 'For analytics and tags without a cite, as in "2AC---AT: Emboldenment Inevitable".',
      },
      {
        key: 'restartPerBlock',
        label: 'Restart numbering at each block in the selection',
        type: 'boolean',
        default: DEFAULTS.restartPerBlock,
        description: 'For a selection that spans several off-case positions.',
      },
    ],
    commands: [
      {
        id: PLUGIN_ID + '.copyHeaders',
        label: 'Copy 2AC block headers',
        keywords: ['2AC', 'block', 'header', 'answer', 'AT', '1NC', 'frontline'],
        defaultKey: null,
        run: copyHeaders,
      },
    ],
  });
})();
