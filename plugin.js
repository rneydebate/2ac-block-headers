// plugin.js - 2AC Block Headers for CardMirror.
//
// Select a run of 1NC cards and analytics, run "Copy 2AC block headers",
// and paste. Each argument becomes a Block plus an Analytic:
//
//   2AC---AT: Garcia 23                   (block)
//   [1NC 1] China will preempt:           (analytic)
//
// Cards are named by the short cite's author and date; analytics and
// uncited tags by a 1-3 word summary of their lead clause. The analytic
// line flips the 1NC's claim into the 2AC's answer, falling back to
// '"claim" is wrong' when it can't. The clipboard carries CardMirror-native
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
    answerStyle: 'Flip the claim',
  };

  /** The analytic line: the 2AC's answer phrase, or the 1NC's claim in
   *  quotes followed by "is wrong". */
  var ANSWER_STYLES = ['Flip the claim', 'Quote the claim + "is wrong"'];

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

  /** The claim an argument leads with: the text before the first clause
   *  dash, comma, colon, sentence end, or "because"-style conjunction. */
  function leadClause(text) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    s = s.split(CLAUSE_DASH)[0];
    s = s.split(/[,:;!?()[\]]|(?<![A-Z])\.(?=\s|$)/)[0];
    s = s.split(/\s+(?:because|since|so|which|while|but|unless|given|as|when|if)\s+/i)[0];
    return s.trim();
  }

  /** Words a 1-3 word block name can do without. Negations stay. */
  var FILLER = /^(a|an|the|this|that|these|those|its|their|our|of|to|in|on|at|for|with|by|from|and|or|is|are|was|were|be|been|will|would|can|could|should)$/i;

  /** "Emboldenment inevitable – US mutual defense treaty..." ->
   *  "Emboldenment Inevitable": the lead clause, filler words dropped,
   *  at most `maxWords` words, title-cased. */
  function summarize(text, maxWords) {
    var words = leadClause(text).replace(/["“”]/g, '').split(' ').filter(Boolean);
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

  // ---- The 2AC answer phrase -------------------------------------------
  //
  // Rule-based, not AI: plugins have no model to call. negateClaim takes
  // the lead clause and flips it in the first way that fits:
  //   "No allied buy-in"            -> "Allies buy in"
  //   "No solvency"                 -> "Yes solvency"
  //   "CP is binding and solves"    -> "CP doesn't solve"
  //   "China won't preempt"         -> "China will preempt"
  //   "Japan will revise X"         -> "Japan won't revise X"
  //   "China preempts X"            -> "China doesn't preempt X"
  //   "Relations high"              -> "Relations low"
  //   "Emboldenment inevitable"     -> "Emboldenment isn't inevitable"
  //   "Alt causes to US-China relations" -> "No alt causes to relations"
  // and returns null when it can't read the sentence, so the caller falls
  // back to '"claim" is wrong'.

  /** Negative auxiliaries and what they become with the "not" removed. */
  var NEG_AUX = {
    "won't": 'will', "can't": 'can', cannot: 'can', "isn't": 'is', "aren't": 'are',
    "wasn't": 'was', "weren't": 'were', "wouldn't": 'would', "couldn't": 'could',
    "shouldn't": 'should', "didn't": 'did', "hasn't": 'has', "haven't": 'have', "ain't": 'is',
  };
  /** Positive auxiliaries and their negations. "May"/"might" claims are
   *  answered flatly ("won't"), the way a 2AC would say it. */
  var POS_AUX = {
    is: "isn't", are: "aren't", was: "wasn't", were: "weren't", will: "won't", can: "can't",
    would: "wouldn't", could: "couldn't", should: "shouldn't", did: "didn't",
    does: "doesn't", do: "don't", may: "won't", might: "won't",
  };
  /** Verbs debate claims are built on, in their base form. A word only
   *  counts as the main verb if it is one of these (or an auxiliary). */
  var VERBS = new Set(('cause solve outweigh turn trigger lead kill boost spill fail collapse crush ' +
    'undermine increase decrease reduce escalate prevent ensure guarantee mean make take link ' +
    'matter require destroy hurt help save deter provoke embolden reassure create drive spark risk ' +
    'threaten preempt overwhelm outpace cost block stop end start need want accept reject support ' +
    'oppose back win lose check shield swamp spur fuel doom derail override invade attack strike ' +
    'retaliate respond react defect comply cooperate follow sanction push pull signal send prove ' +
    'show say apply go do have get grow rise fall decline happen occur exist work last arrive come ' +
    'continue remain stay outlast destabilize stabilize resolve answer moot obviate justify ' +
    'legitimize normalize spill-over escalate deploy share host allow block counter balance ' +
    'bandwagon hedge contain coerce compel induce spillover trade').split(' '));
  /** Words before a noun, so the "-s" word after them is a plural noun
   *  ("alt causes", "the risks"), not a verb. */
  var DETERMINERS = /^(a|an|the|its|their|our|his|her|no|any|some|all|these|those|alt|alternate|alternative|multiple|many|other|several|new|more|most|both)$/i;
  var PREPOSITIONS = /^(to|for|on|of|from|with|against|between|in|over|toward|towards|about|into|under|by)$/i;
  var ANTONYMS = {
    high: 'low', low: 'high', likely: 'unlikely', unlikely: 'likely', good: 'bad', bad: 'good',
    strong: 'weak', weak: 'strong', 'true': 'false', 'false': 'true', possible: 'impossible',
    impossible: 'possible', probable: 'improbable', sustainable: 'unsustainable', stable: 'unstable',
    unstable: 'stable', sufficient: 'insufficient', insufficient: 'sufficient', effective: 'ineffective',
    ineffective: 'effective', up: 'down', down: 'up', rising: 'falling', falling: 'rising',
    increasing: 'decreasing', decreasing: 'increasing', growing: 'shrinking', resilient: 'fragile',
    fragile: 'resilient', real: 'fake', fake: 'real', necessary: 'unnecessary', unnecessary: 'necessary',
  };
  var ADJECTIVES = new Set(('inevitable key imminent certain sure fine dead alive over irrelevant robust ' +
    'existential critical crucial essential vital central final fatal marginal minimal normal legal ' +
    'illegal rational irrational global catastrophic systemic realistic unrealistic strategic ' +
    'temporary arbitrary contradictory voluntary mandatory empty inevitable ongoing reversible ' +
    'irreversible improving declining collapsing escalating happening working worsening shot gone ' +
    'done broken toast doomed').split(' '));
  /** Words that stay capitalized after "No" goes in front of them. */
  var PROPER = /^(china|russia|japan|korea|taiwan|iran|india|pakistan|israel|ukraine|europe|america|nato|congress|trump|biden|xi|putin|kim|beijing|washington|moscow|tokyo|seoul|taipei|asia|africa|pentagon|senate|house|court|i)$/i;

  /** Nouns that look like adjectives by their ending. */
  var NOT_ADJECTIVES = new Set(('objective initiative incentive executive alternative narrative directive ' +
    'perspective representative explosive offensive detective student agent talent parent percent ' +
    'event content incident precedent president opponent component intent deterrent servant migrant ' +
    'immigrant tenant merchant variant defendant participant consultant assistant applicant giant ' +
    'hundred trouble').split(' '));

  function isAdjective(w) {
    var lw = w.toLowerCase();
    if (ANTONYMS[lw] || ADJECTIVES.has(lw)) return true;
    if (NOT_ADJECTIVES.has(lw) || /ment$/.test(lw)) return false;
    return (lw.length >= 7 && /ble$/.test(lw)) ||
      /(ous|ful|less)$/.test(lw) ||
      (lw.length >= 6 && /(ive|ant|ent)$/.test(lw)) ||
      (lw.length >= 6 && /ed$/.test(lw) && !/eed$/.test(lw));
  }

  /** "causes" -> "cause", "has" -> "have"; null if it isn't a known verb. */
  function verbBase(w) {
    var lw = w.toLowerCase();
    var special = { has: 'have', does: 'do', goes: 'go' };
    if (special[lw]) return special[lw];
    var base = null;
    if (/ies$/.test(lw)) base = lw.slice(0, -3) + 'y';
    else if (/(sses|shes|ches|xes|zes|oes)$/.test(lw)) base = lw.slice(0, -2);
    else if (/[^s]s$/.test(lw)) base = lw.slice(0, -1);
    return base && VERBS.has(base) ? base : null;
  }

  /** "solve" -> "solves", "push" -> "pushes", "apply" -> "applies". */
  function thirdPerson(v) {
    var special = { have: 'has', do: 'does', go: 'goes' };
    if (special[v.toLowerCase()]) return special[v.toLowerCase()];
    if (/(s|sh|ch|x|z|o)$/i.test(v)) return v + 'es';
    if (/[^aeiou]y$/i.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }

  function isPlural(w) {
    return /[a-z][a-rt-z]s$/.test(w) && !/(us|is|ss)$/.test(w);
  }

  /** Lowercase a sentence-initial word that "No" now precedes. */
  function lowerFirst(w) {
    return /^[A-Z][a-z'-]*$/.test(w) && !PROPER.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w;
  }

  /** "to US-China relations" -> "to relations": drop proper or hyphenated
   *  modifiers from the last prepositional phrase, which the block's
   *  context already supplies. */
  function trimLastPhrase(words) {
    for (var p = words.length - 2; p >= 1; p--) {
      if (!PREPOSITIONS.test(words[p])) continue;
      var obj = words.slice(p + 1);
      var head = obj[obj.length - 1];
      if (obj.length < 2 || /[A-Z]/.test(head)) return words;
      var kept = obj.slice(0, -1).filter(function (w) { return !/[A-Z]/.test(w) && w.indexOf('-') < 0; });
      return words.slice(0, p + 1).concat(kept, [head]);
    }
    return words;
  }

  /** Who an adjective in "No <adjective> <action>" names. */
  var ACTORS = {
    allied: 'Allies', ally: 'Allies', us: 'The US', american: 'The US', chinese: 'China',
    russian: 'Russia', japanese: 'Japan', korean: 'Korea', taiwanese: 'Taiwan', iranian: 'Iran',
    indian: 'India', pakistani: 'Pakistan', israeli: 'Israel', european: 'Europe', nato: 'NATO',
    congressional: 'Congress', public: 'The public', military: 'The military', court: 'The Court',
  };
  /** Action nouns and the verb they come from, so "No allied buy-in"
   *  can become "Allies buy in". */
  var ACTIONS = {
    'buy-in': 'buy in', 'follow-through': 'follow through', pushback: 'push back', 'push-back': 'push back',
    spillover: 'spill over', 'spill-over': 'spill over', 'sign-off': 'sign off', crackdown: 'crack down',
    breakout: 'break out', retaliation: 'retaliate', response: 'respond', escalation: 'escalate',
    cooperation: 'cooperate', compliance: 'comply', intervention: 'intervene', defection: 'defect',
    resistance: 'resist', invasion: 'invade', proliferation: 'proliferate', balancing: 'balance',
    bandwagoning: 'bandwagon', hedging: 'hedge', retrenchment: 'retrench', withdrawal: 'withdraw',
    collapse: 'collapse', support: 'support it', backlash: 'push back', action: 'act',
    acceptance: 'accept it', approval: 'approve it', ratification: 'ratify it', aggression: 'escalate',
  };

  /** "No allied buy-in" -> "Allies buy in"; any other "No X" -> "Yes X". */
  function flipNo(w) {
    var actor = w.length === 3 ? ACTORS[w[1].toLowerCase()] : null;
    var action = actor ? ACTIONS[w[2].toLowerCase()] : null;
    if (!action) return ['Yes'].concat(w.slice(1));
    var verb = action.split(' ');
    if (actor !== 'Allies') verb[0] = thirdPerson(verb[0]);
    return actor.split(' ').concat(verb);
  }

  /** Flip a run of words. Returns { out, at, kind } - `at` is where the
   *  flip happened, so the caller can find the subject before it - or
   *  null when no rule fits. */
  function flipWords(w) {
    var lw = w.map(function (x) { return x.toLowerCase(); });
    if (lw[0] === 'no' && w.length > 1) return { out: flipNo(w), at: 0, kind: 'no' };
    for (var i = 0; i < w.length; i++) {
      var cur = lw[i];
      var next = lw[i + 1];
      var out = null;
      if (cur === "doesn't" || cur === "don't" || (/^(does|do)$/.test(cur) && next === 'not')) {
        // "doesn't solve" -> "solves"; "don't accept" -> "accept"
        var skip = cur === 'does' || cur === 'do' ? 2 : 1;
        var verb = w[i + skip];
        if (!verb) return null;
        var flipped = /^does/.test(cur) ? thirdPerson(verb) : verb;
        out = w.slice(0, i).concat([flipped], w.slice(i + skip + 1));
      } else if (NEG_AUX[cur]) {
        out = w.slice(0, i).concat([NEG_AUX[cur]], w.slice(i + 1));
      } else if ((cur === 'not' || cur === 'never') && i > 0) {
        out = w.slice(0, i).concat(w.slice(i + 1));
      } else if (POS_AUX[cur] && i > 0 &&
          // "do" is only an auxiliary in front of a verb ("Allies do accept"), not in "Perm do both".
          (!/^(do|does|did)$/.test(cur) || next === 'not' || next === 'never' || VERBS.has(next))) {
        out = next === 'not' || next === 'never'
          ? w.slice(0, i + 1).concat(w.slice(i + 2))
          : w.slice(0, i).concat([POS_AUX[cur]], w.slice(i + 1));
      } else if (i > 0 && !DETERMINERS.test(w[i - 1])) {
        var base = verbBase(cur);
        if (base === 'have' && next && /(ed|en)$/.test(next)) {
          out = w.slice(0, i).concat(["hasn't"], w.slice(i + 1));
        } else if (base) {
          out = w.slice(0, i).concat(["doesn't", base], w.slice(i + 1));
        } else if (VERBS.has(cur) && isPlural(w[i - 1])) {
          out = w.slice(0, i).concat(["don't"], w.slice(i));
        }
      }
      if (out) return { out: out, at: i, kind: 'verb' };
    }
    if (w.length >= 2 && isAdjective(w[w.length - 1])) {
      // Verbless predicate: "Relations high", "Emboldenment inevitable".
      var adj = lw[w.length - 1];
      var subject = w.slice(0, -1);
      return {
        out: ANTONYMS[adj]
          ? subject.concat([ANTONYMS[adj]])
          : subject.concat([isPlural(subject[subject.length - 1]) ? "aren't" : "isn't", w[w.length - 1]]),
        at: w.length - 1,
        kind: 'adjective',
      };
    }
    var hasVerb = lw.slice(1).some(function (x) { return VERBS.has(x) || POS_AUX[x]; });
    if (!hasVerb && (w.length <= 3 || w.slice(1, 4).some(function (x) { return PREPOSITIONS.test(x); }))) {
      // A bare noun phrase: "Thumpers", "Alt causes to relations".
      return { out: ['No', lowerFirst(w[0])].concat(w.slice(1)), at: -1, kind: 'noun' };
    }
    return null;
  }

  /** The lead clause flipped into what the 2AC says back, or null.
   *  With two clauses joined by "and", only the first is flipped and the
   *  second dropped - unless the second is "solves", the claim a 2AC
   *  answers ("Consultation is binding and solves" -> "Consultation
   *  doesn't solve"). */
  function negateClaim(text, maxWords) {
    var lead = leadClause(text).replace(/[‘’]/g, "'").replace(/["“”]/g, '');
    var w = lead.split(' ').filter(Boolean);
    if (w.length === 0 || w.length > maxWords) return null;
    var res = null;
    var k = w.map(function (x) { return x.toLowerCase(); }).findIndex(function (x) { return x === 'and' || x === '&'; });
    if (k >= 2) {
      // A first part that only flips as a noun phrase ("The US and China
      // cooperate") isn't a clause, so the whole lead is flipped instead.
      var first = flipWords(w.slice(0, k));
      if (first && first.kind !== 'noun') {
        var second = w.slice(k + 1);
        if (first.kind !== 'no' && /^solves?$/i.test(second[0] || '')) {
          res = flipWords(w.slice(0, first.at).concat(second));
        }
        res = res || first;
      }
    }
    res = res || flipWords(w);
    if (!res) return null;
    var out = trimLastPhrase(res.out);
    var s = out.join(' ').replace(/[\s.,;:!?']+$/, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
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
      var answer = o.answerStyle === ANSWER_STYLES[0] ? negateClaim(arg.claim, claimWords) : null;
      out.push({
        block: speech + '---AT: ' + ref,
        analytic: '[' + answering + ' ' + n + '] ' +
          (answer || '"' + shortClaim(arg.claim, claimWords) + '" is wrong') + ':',
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
    module.exports = { authorFromCite: authorFromCite, summarize: summarize, shortClaim: shortClaim, negateClaim: negateClaim, buildHeaders: buildHeaders, toHtml: toHtml, toText: toText };
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
        key: 'answerStyle',
        label: 'Analytic line',
        type: 'select',
        options: ANSWER_STYLES,
        default: DEFAULTS.answerStyle,
        description: 'Flip: "[1NC 1] Emboldenment isn\'t inevitable:". Claims it can\'t flip get the quote style.',
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
