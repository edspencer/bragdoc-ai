// The screenshot rules (shared/rules/screenshot.ts) on text alone: the traps from the Found spike (aliases, times that
// look like initials, your own name without praise, your own messages, bare acks), OCR's misreadings, and the whole
// labelled dataset as a perfect OCR would read it. test/ocr.test.ts runs the same rules on what real OCR reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileRules, describeMatch, normaliseOcr, MAX_TEXT } from '../shared/rules/screenshot.ts';
import { ALEX, DATASET, datasetShot } from './screenshots.ts';

const rules = compileRules(ALEX);
const pass = (t: string) => rules(t).pass;
/** A Slack window: a channel title and one message under an author line. */
const slack = (author: string, body: string, channel = 'eng') => `# ${channel}\n${author} 10:42 AM\n${body}`;

test('praise that names you passes, with the rules it matched, a quote, who said it and where', () => {
  const r = rules(slack('Dana Whitfield', 'Kudos to @Alex Marlowe for the billing cutover.\nNot a single customer-facing error.', 'eng-billing'));
  assert.equal(r.pass, true);
  assert.deepEqual(
    r.matched.filter((m) => m.rule !== 'chat'),
    [
      { rule: 'name', text: '@Alex Marlowe' },
      { rule: 'praise', text: 'Kudos' },
    ],
  );
  assert.ok(r.matched.some((m) => m.rule === 'chat' && m.text === '# eng-billing'));
  assert.equal(r.quote, 'Kudos to @Alex Marlowe for the billing cutover. Not a single customer-facing error.');
  assert.equal(r.from, 'Dana Whitfield');
  assert.equal(r.where, '#eng-billing');
});

test("a quote leaves out the reaction row and the reply count", () => {
  const r = rules('# eng\nDana Whitfield 4:52 PM\nKudos @Alex Marlowe, the cutover saved 3 hours.\nB22 In 8\n12 replies');
  assert.equal(r.quote, 'Kudos @Alex Marlowe, the cutover saved 3 hours.');
});

test('every form of your name counts: full name, first, last, handle, aliases, GitHub login', () => {
  for (const name of ['Alex Marlowe', 'Alex', 'Marlowe', '@alex.m', 'alex.m', "Alex's", 'ALEX', 'AlexMarlowe']) assert.ok(pass(slack('Dana Whitfield', `Kudos to ${name} for the cutover`)), name);
  const r = compileRules({ name: 'Sam Okafor', githubLogin: 'sokafor', aliases: ['Sammy'] });
  assert.ok(r(slack('Lee Chen', 'shoutout to sokafor')).pass);
  assert.ok(r(slack('Lee Chen', 'shoutout to Sammy')).pass);
});

test('alias traps: notMe names, and names that only start like yours, are not you', () => {
  assert.ok(!pass(slack('Morgan Diaz', 'Kudos to Alex P for the icons, amazing')));
  assert.ok(!pass(slack('Morgan Diaz', 'Kudos to Alex P. for the icons, amazing')));
  assert.ok(!pass(slack('Morgan Diaz', 'Kudos to Alexandra for the icons, amazing')));
  assert.ok(!pass(slack('Morgan Diaz', 'Kudos to Alexander for the icons, amazing')));
  assert.ok(!pass(slack('Morgan Diaz', 'Amazing work from the Marlowes team')));
  assert.match(rules(slack('Morgan Diaz', 'Kudos to Alex P for the icons')).notes.join(), /not you: "Alex P"/);
  // but "Alex P" excluded doesn't exclude "Alex" elsewhere in the same message, or "Alex Platform"
  assert.ok(pass(slack('Morgan Diaz', 'Kudos to Alex P and Alex for the icons')));
  assert.ok(pass(slack('Morgan Diaz', 'Amazing work by Alex Platform team')));
});

test('initials are case-sensitive and never a time', () => {
  assert.ok(pass(slack('Chris Alvarez', "Battery use dropped 18% with AM's sync batching. Amazing")));
  assert.ok(pass(slack('Chris Alvarez', 'Credit to AM for the sync engine')));
  for (const t of ['See you at 9 AM, great', 'standup 9:30 AM, great', 'at 10AM, great', 'great, AM PT folks welcome', 'AM/PM, great', 'AM or PM, great', 'from 9 AM - 5 PM great', 'am I right? great', 'kickoff 9 § AM great'])
    assert.ok(!pass(slack('Dana Whitfield', t)), t);
  assert.match(rules(slack('Dana Whitfield', 'Standup is at 9 AM. Great')).notes.join(), /a time, not your initials/);
  // a heading in capitals isn't initials either
  assert.ok(!pass(slack('Dana Whitfield', 'I AM SO PROUD OF THIS TEAM TODAY')));
});

test('your own name without praise or impact fails', () => {
  for (const t of ["I'm OOO tomorrow, Alex is covering search on-call", '@alex.m can you join the search sync at 3?', 'Alex Marlowe you are IC for the next rotation'])
    assert.ok(!pass(slack('Jordan Kim', t)), t);
});

test('praise with no name of yours fails, and so does your own message praising someone else', () => {
  assert.ok(!pass(slack('Lee Chen', 'Massive kudos to the SRE team for the zero-downtime upgrade')));
  const own = rules(slack('Alex Marlowe', 'Huge shoutout to @Taylor Nguyen for shipping dark mode. Proud of you!'));
  assert.equal(own.pass, false);
  assert.match(own.notes.join(), /your own message/);
  // OCR may read the avatar's initials in front of the author line
  assert.ok(!pass('# kudos\nAM Alex Marlowe 3:12 PM\nHuge shoutout to Taylor, amazing work'));
  assert.equal(rules('Thread # eng\nAM Alex Marlowe 3:12 PM\nRFC\n1 reply\nJK Jordan Kim 3:20 PM\nGreat work').from, 'Jordan Kim');
  // a bot's message is never praise
  assert.ok(!pass('# deploys\ndeploybot 10:00 AM\nCanary healthy: v2.32 (by alex.m), promoting to 100%. Amazing'));
  assert.ok(!pass('# deploys\nJira APP 10:00 AM\nKudos! Alex Marlowe closed 12 tickets'));
});

test('a bare acknowledgement is dropped, unless it states an impact', () => {
  for (const t of ['thx AM', 'Thanks Alex 👍', 'thank you! 😊', 'Thanks AM — 9 AM works for me', 'ty @alex.m', 'cheers alex']) assert.ok(!pass(slack('Sam Okafor', t)), t);
  assert.match(rules(slack('Sam Okafor', 'thx AM')).notes.join(), /just an acknowledgement/);
  assert.ok(pass(slack('Sam Okafor', 'thanks AM, saved us 2 hours')));
  // the avatar's initials read into the message don't stop it being a bare ack
  assert.ok(!pass('# payments\nSam Okafor 11:00 AM\nSO\nthx AM'));
});

test('weak praise and impact need a chat window (d); strong praise does not', () => {
  assert.ok(pass(slack('Lee Chen', 'thanks @Alex Marlowe for the review on the ledger PR')));
  assert.ok(pass(slack('Lee Chen', "Alex's re-ranker lifted click-through by 12%")));
  // not a chat: no channel, no author lines, no timestamps
  assert.ok(!pass('Revenue overview    Alex Marlowe\nMRR $1.24M  +12% vs last month\nChurn 2.1%'));
  assert.ok(!pass('Alex Marlowe, 3 days ago\nreturn rows.length; // nice and simple'));
  assert.ok(pass('Hi Alex,\nThe migration was fantastic work.\nThank you, Dana'));
});

test('without author lines, the name and the praise must be near each other', () => {
  assert.ok(pass('Alex Marlowe\nfantastic work on the migration'));
  assert.ok(!pass(`Alex Marlowe\n${'filler line\n'.repeat(6)}fantastic weather today`));
});

test('a reply under your own message in a thread counts, unless it names someone else', () => {
  const thread = (reply: string) => `Thread # search-team\nAlex Marlowe 10:02 AM\nRFC: one ranking stage instead of three\n2 replies\nJordan Kim 10:30 AM\n${reply}`;
  const r = rules(thread('+1, this design is way simpler. Great work'));
  assert.equal(r.pass, true);
  assert.deepEqual(r.matched[0], { rule: 'reply', text: 'a reply to Alex Marlowe' });
  assert.equal(r.from, 'Jordan Kim');
  assert.ok(!pass(thread('Great work @Taylor Nguyen, nice one')));
  // another author on screen, named in the reply: the praise is for them
  assert.ok(!pass(`Thread # search-team\nAlex Marlowe 10:02 AM\nRFC is up\n2 replies\nPriya Raman 10:10 AM\nI took the benchmarks\nJordan Kim 10:30 AM\nGreat work Priya, amazing benchmarks`));
  assert.ok(!pass(thread('ty')));
  // not a thread: a later message in a channel isn't a reply to you
  assert.ok(!pass('# search-team\nAlex Marlowe 10:02 AM\nRFC is up\nJordan Kim 10:30 AM\nGreat work everyone'));
});

test('OCR misreadings: confusable letters, a © for an @, curly quotes, ligatures, odd spacing', () => {
  assert.ok(pass('AIex MarIowe — the kud0s are deserved'));
  assert.ok(pass('©Alex Marlowe ﬁnally shipped it, amazing'));
  assert.ok(pass('Shout​out to Alex  Marlowe'));
  assert.ok(pass('Alex’s rewrite was incredib1e'));
  assert.equal(normaliseOcr('a  b  \r\n\n\n\nc ​'), 'a b\n\nc');
  assert.equal(normaliseOcr('“quoted” ‘single’ ﬁ'), '"quoted" \'single\' fi');
});

test('blank, junk and very long text: no pass, no crash, bounded time', () => {
  assert.deepEqual(rules(''), { pass: false, matched: [], notes: [] });
  assert.equal(pass('|||  [] — ~~ ..'), false);
  const big = ('lorem ipsum Alex dolor sit amet great '.repeat(2000) + '\n').repeat(5);
  const t = Date.now();
  rules(big);
  assert.ok(Date.now() - t < 2000, `took ${Date.now() - t} ms`);
  assert.ok(normaliseOcr(big).length <= MAX_TEXT);
});

test('a profile with a one-word name, and no aliases, still works', () => {
  const r = compileRules({ name: 'Prince' });
  assert.ok(r('Kudos to Prince for the launch').pass);
  assert.ok(!r('Kudos to Princess for the launch').pass);
});

test('matches in words, for a Found card', () => {
  assert.equal(describeMatch({ rule: 'name', text: 'Alex' }), 'Says your name: "Alex"');
  assert.equal(describeMatch({ rule: 'initials', text: 'AM' }), 'Your initials: "AM"');
  assert.equal(describeMatch({ rule: 'reply', text: 'x' }), 'Replies to your message');
  assert.equal(describeMatch({ rule: 'praise', text: 'kudos' }), 'Praise: "kudos"');
  assert.equal(describeMatch({ rule: 'impact', text: '12%' }), 'Impact: "12%"');
  assert.equal(describeMatch({ rule: 'chat', text: '#eng' }), 'Looks like a chat: "#eng"');
});

// The Found spike's 218 labelled messages, drawn as screenshots and read perfectly. These floors are what the rules do
// today (npm run eval:screenshots prints the detail): recall 83%, the misses being DMs that never name you; nothing
// from your own messages or plain chatter; sarcasm passes, by design.
test("the Found spike's dataset, as a perfect OCR would read it", () => {
  const by = new Map<string, { n: number; passed: number }>();
  for (const m of DATASET.messages) {
    const s = by.get(m.label) ?? { n: 0, passed: 0 };
    s.n++;
    if (pass(datasetShot(m).text)) s.passed++;
    by.set(m.label, s);
  }
  const rate = (l: string) => by.get(l)!.passed / by.get(l)!.n;
  assert.equal(DATASET.messages.length, 218);
  assert.ok(rate('win_alex') >= 0.8, `recall ${rate('win_alex')}`);
  assert.equal(by.get('alex_praising')!.passed, 0, 'your own messages never pass');
  assert.equal(by.get('neutral')!.passed, 0, 'chatter that names you never passes');
  assert.ok(by.get('passing_thanks')!.passed <= 1, `passing thanks: ${by.get('passing_thanks')!.passed}`);
  assert.ok(by.get('praise_other')!.passed <= 2, `praise for others: ${by.get('praise_other')!.passed}`);
  assert.ok(rate('sarcasm') >= 0.8, 'sarcasm passes: rules cannot read tone (documented)');
});

// From the independent review: each of these was wrong once.
test('review regressions: short thanks that praise, surnames ending in "bot", short names, a PR number', () => {
  assert.ok(pass(slack('Dana Whitfield', 'Thanks Alex for the great review!')), 'more than a bare thanks');
  assert.ok(pass(slack('Dana Whitfield', 'thanks alex, you are a legend')), 'strong praise after the thanks');
  assert.ok(!pass(slack('Dana Whitfield', 'thanks for organizing')), 'still a bare thanks');
  assert.ok(pass(slack('Ryan Talbot', 'Amazing work Alex on the launch')), 'Talbot is a person');
  assert.ok(!pass(slack('deploybot', 'Amazing work Alex')), 'deploybot is a bot');
  const li = compileRules({ name: 'Al Li' });
  assert.ok(!li('# eng\n11 replies\nAmazing launch everyone').pass, '"11" is not "Li"');
  assert.ok(!li(slack('Dana Whitfield', 'The new AI feature is amazing')).pass, '"AI" is not "Al"');
  assert.ok(li(slack('Dana Whitfield', 'Amazing work Al!')).pass);
  const pr = rules('Merged PR #412: saved 3 hours. Alex Marlowe, great');
  assert.equal(pr.pass, false, 'a #number is not a channel, so impact and "great" stay weak');
  assert.equal(pr.where, undefined);
});
