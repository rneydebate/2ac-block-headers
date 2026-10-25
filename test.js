// Run with: node test.js
const assert = require('assert');
const { authorFromCite, summarize, shortClaim, negateClaim, buildHeaders, toHtml, toText } = require('./plugin.js');

const s = (kind, text) => ({ kind, text, source: 'cmsrc1.x' });

assert.strictEqual(authorFromCite('Garcia 23'), 'Garcia');
assert.strictEqual(authorFromCite('Stein & Smith 23'), 'Stein & Smith');
assert.strictEqual(authorFromCite("Lee '23"), 'Lee');
assert.strictEqual(authorFromCite('Zhao, 2024'), 'Zhao');
assert.strictEqual(authorFromCite('Lee 23b'), 'Lee');
assert.strictEqual(authorFromCite('C4ADS 22'), 'C4ADS');
assert.strictEqual(authorFromCite('Garcia 23', true), 'Garcia 23');
assert.strictEqual(authorFromCite('Garcia 23 - Professor of Law at Yale', true), 'Garcia 23');
assert.strictEqual(authorFromCite('Garcia 23 – Professor', true), 'Garcia 23');
assert.strictEqual(authorFromCite('Garcia 23-', true), 'Garcia 23');
assert.strictEqual(authorFromCite('Garcia-Lopez 23', true), 'Garcia-Lopez 23');
assert.strictEqual(authorFromCite('Garcia 23 (Prof)', true), 'Garcia 23');
assert.strictEqual(authorFromCite('Garcia - Professor', true), 'Garcia');

assert.strictEqual(
  summarize('Emboldenment inevitable – US mutual defense treaty, alliance commitments, and regional troop presence create the same moral hazard', 3),
  'Emboldenment Inevitable',
);
assert.strictEqual(summarize('No allied buy-in, so the plan never gets implemented.', 3), 'No Allied Buy-In');
assert.strictEqual(summarize('The plan doesn’t solve because China defects', 3), 'Plan Doesn’t Solve');
assert.strictEqual(summarize('Perm do both---shields the link', 3), 'Perm Do Both');

assert.strictEqual(shortClaim('China won’t preempt---it only sanctions.', 10), 'China won’t preempt');
assert.strictEqual(shortClaim('Allies say no. Japan and Korea both refuse.', 10), 'Allies say no');
assert.strictEqual(
  shortClaim('Tactical nuclear deployment in East Asia causes a Chinese first strike on US bases', 6),
  'Tactical nuclear deployment in East Asia...',
);
assert.strictEqual(shortClaim('The "realism" frame fails', 10), "The 'realism' frame fails");

const items = [
  s('block', '1NC---TNW DA'),
  s('tag', 'China preempts TNW deployment---extinction.'),
  s('cite', 'Garcia 23'),
  s('undertag', 'read this second'),
  s('analytic', 'No allied buy-in, so the plan never gets implemented.'),
  s('tag', 'Pentagon is warming to tactical nukes'),
  s('tag', 'Japan will revise the non-nuclear principles'),
  s('cite', 'Takaichi 26'),
  s('block', '1NC---Consult CP'),
  s('tag', 'Consultation is binding and solves'),
  s('cite', 'Kihara 25'),
];

const headers = buildHeaders(items, {});
assert.deepStrictEqual(headers, [
  { block: '2AC---AT: Garcia 23', analytic: "[1NC 1] China doesn't preempt TNW deployment:" },
  { block: '2AC---AT: No Allied Buy-In', analytic: '[1NC 2] Allies buy in:' },
  { block: '2AC---AT: Pentagon Warming Tactical', analytic: "[1NC 3] Pentagon isn't warming to tactical nukes:" },
  { block: '2AC---AT: Takaichi 26', analytic: "[1NC 4] Japan won't revise the non-nuclear principles:" },
  { block: '2AC---AT: Kihara 25', analytic: "[1NC 5] Consultation doesn't solve:" },
]);

const quoted = buildHeaders(items, { answerStyle: 'Quote the claim + "is wrong"' });
assert.strictEqual(quoted[0].analytic, '[1NC 1] "China preempts TNW deployment" is wrong:');

const restarted = buildHeaders(items, { restartPerBlock: true, speech: '1AR', answering: '2NC' });
assert.strictEqual(restarted[4].analytic, "[2NC 1] Consultation doesn't solve:");

const flips = [
  ['Emboldenment inevitable – US mutual defense treaty, alliance commitments', "Emboldenment isn't inevitable"],
  ['Alt causes to US-China relations', 'No alt causes to relations'],
  ['China won’t preempt TNWs', 'China will preempt TNWs'],
  ['Allies don’t accept TNWs', 'Allies accept TNWs'],
  ['Sanctions cause war', "Sanctions don't cause war"],
  ['Relations high', 'Relations low'],
  ['Thumpers', 'No thumpers'],
  ['China has collapsed', "China hasn't collapsed"],
  ['US credibility shot', "US credibility isn't shot"],
  ['Perm do both---shields the link', null],
  ['The CP is competitive and solves the case', "The CP doesn't solve the case"],
  ['Relations high and rising', 'Relations low'],
  ['China will retaliate and escalate to nuclear war', "China won't retaliate"],
  ['The US and China cooperate', null],
  ['No Chinese retaliation', 'China retaliates'],
  ['No US follow-through', 'The US follows through'],
  ['No solvency', 'Yes solvency'],
];
for (const [claim, want] of flips) assert.strictEqual(negateClaim(claim, 10), want, claim);
assert.strictEqual(restarted[0].block, '1AR---AT: Garcia 23');

const noYear = buildHeaders(items, { includeYear: false });
assert.strictEqual(noYear[0].block, '2AC---AT: Garcia');

const html = toHtml([{ block: '2AC---AT: A & B', analytic: '[1NC 1] "x < y" is wrong:' }]);
assert.strictEqual(
  html,
  '<h3 class="pmd-block">2AC---AT: A &amp; B</h3><div class="pmd-analytic-unit"><p class="pmd-analytic Analytic">[1NC 1] &quot;x &lt; y&quot; is wrong:</p></div>',
);

const { normalizeRepo, batchName } = require('./plugin.js');
assert.strictEqual(normalizeRepo('rneydebate/card-inbox'), 'rneydebate/card-inbox');
assert.strictEqual(normalizeRepo('https://github.com/rneydebate/card-inbox.git'), 'rneydebate/card-inbox');
assert.strictEqual(normalizeRepo('nope'), '');
assert.strictEqual(batchName('<!--batch: Cards 10-25-2026 15-10-->\n<div class="pmd-card">'), 'Cards 10-25-2026 15-10');
assert.strictEqual(batchName('<div class="pmd-card">'), '');

console.log(toText(headers));
console.log('\nAll tests passed.');
