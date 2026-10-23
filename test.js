// Run with: node test.js
const assert = require('assert');
const { authorFromCite, summarize, shortClaim, buildHeaders, toHtml, toText } = require('./plugin.js');

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
  { block: '2AC---AT: Garcia 23', analytic: '[1NC 1] "China preempts TNW deployment" is wrong:' },
  { block: '2AC---AT: No Allied Buy-In', analytic: '[1NC 2] "No allied buy-in, so the plan never gets implemented" is wrong:' },
  { block: '2AC---AT: Pentagon Warming Tactical', analytic: '[1NC 3] "Pentagon is warming to tactical nukes" is wrong:' },
  { block: '2AC---AT: Takaichi 26', analytic: '[1NC 4] "Japan will revise the non-nuclear principles" is wrong:' },
  { block: '2AC---AT: Kihara 25', analytic: '[1NC 5] "Consultation is binding and solves" is wrong:' },
]);

const restarted = buildHeaders(items, { restartPerBlock: true, speech: '1AR', answering: '2NC' });
assert.strictEqual(restarted[4].analytic, '[2NC 1] "Consultation is binding and solves" is wrong:');
assert.strictEqual(restarted[0].block, '1AR---AT: Garcia 23');

const noYear = buildHeaders(items, { includeYear: false });
assert.strictEqual(noYear[0].block, '2AC---AT: Garcia');

const html = toHtml([{ block: '2AC---AT: A & B', analytic: '[1NC 1] "x < y" is wrong:' }]);
assert.strictEqual(
  html,
  '<h3 class="pmd-block">2AC---AT: A &amp; B</h3><div class="pmd-analytic-unit"><p class="pmd-analytic Analytic">[1NC 1] &quot;x &lt; y&quot; is wrong:</p></div>',
);

console.log(toText(headers));
console.log('\nAll tests passed.');
