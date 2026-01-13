# BragDoc Email Templates (Loops.so)

Email sequence for new signups who haven't fully activated.

## Sequence Overview

| # | Email | When | Goal |
|---|-------|------|------|
| 1 | Welcome | Immediate (Day 0) | Get them to install CLI |
| 2 | The problem | Day 3 | Educate, build urgency |
| 3 | Quick win | Day 7 | Show value, re-engage |
| 4 | Check-in | Day 14 | Catch stragglers |

---

## Email 1: Welcome

**Trigger:** Immediate after signup (Day 0)

**Subject:** You're in. Here's how to get started.

**Body:**

```
Hey,

Thanks for signing up for BragDoc.

The fastest way to get value: install the CLI and run your first extraction. Takes about 2 minutes.

npm install -g @bragdoc/cli
bragdoc login
bragdoc extract --since 3m

That pulls the last 3 months of your Git history and turns it into documented achievements. Your code stays local - only the summaries sync.

Once you've extracted, you can see your achievements in the dashboard, watch them cluster into workstreams, and eventually generate performance review docs from them.

Questions? Just reply to this email.

- The BragDoc team
```

**Notes:**
- Short
- One clear CTA (install and extract)
- Addresses privacy concern upfront
- "Reply to this email" feels personal

---

## Email 2: The Problem

**Trigger:** Day 3 after signup

**Subject:** The thing about performance reviews

**Body:**

```
Quick story.

Every review cycle, engineers scramble to remember what they did. They scroll through 6 months of commits, skim old PRs, and try to reconstruct their impact from memory.

The result? They undersell themselves. They forget the hard stuff. They write vague bullet points like "contributed to several projects" and hope their manager fills in the gaps.

Managers don't fill in the gaps. They're busy. They have 8 other people to review. They rely on what you tell them.

This is the visibility gap - and it's why engineers who document well get promoted faster than engineers who just do good work.

BragDoc fixes this by capturing your work as it happens. Your Git history already contains the evidence. We just make it usable.

If you haven't run your first extraction yet:

bragdoc extract --since 6m

Takes 2 minutes. You'll have 6 months of achievements documented before your next meeting.

- BragDoc
```

**Notes:**
- Storytelling, not feature list
- Hits the emotional pain point (underselling yourself)
- Reinforces the CTA without being pushy

---

## Email 3: Quick Win

**Trigger:** Day 7 after signup

**Subject:** One thing you can do today

**Body:**

```
If you've already extracted your achievements - nice. You're ahead of most engineers.

Here's what to do next: look at your workstreams.

BragDoc automatically groups your achievements into themes. So instead of a flat list of 50 things you did, you get 5-8 named workstreams like "Payment System Refactor" or "API Performance."

This matters because review conversations aren't about individual commits. They're about patterns. "I led three major infrastructure initiatives this year" lands better than "I made 200 commits."

Check your workstreams in the dashboard. If they don't look right, you can rename or reorganize them.

And if you haven't extracted yet - now's a good time. Review season is coming.

bragdoc extract --since 6m

- BragDoc
```

**Notes:**
- Assumes some users engaged, acknowledges them
- Teaches something (workstreams = patterns = better story)
- Gentle nudge for non-extractors
- Seasonal urgency without being salesy

---

## Email 4: Check-in

**Trigger:** Day 14 after signup

**Subject:** Quick question

**Body:**

```
Hey,

Noticed you signed up a couple weeks ago. Just wanted to check in.

Did you get a chance to run an extraction? If something didn't work or wasn't clear, I'd like to know.

If you're waiting for a better time - review season is coming up fast. Most engineers wish they'd started documenting earlier. Now's a good window.

Either way, no pressure. Just reply if you have questions.

- Natalia
```

**Notes:**
- Plain text (no design, feels personal)
- Short
- From a person's name, not "The Team"
- Asks a question (invites reply)
- Soft urgency without desperation

---

## Segmentation Strategy

After Day 14:
- **Engaged users (extracted):** Move to product update / feature announcement list
- **Non-engaged users:** Move to monthly newsletter (lower frequency)
- **Non-openers:** Consider sunset after 60 days of no opens

---

## Key Events to Track in Loops

1. `user.signed_up` - triggers welcome sequence
2. `user.extracted` - marks activation, stops nudge emails
3. `user.generated_review` - high-value action
4. `user.inactive_14d` - triggers check-in

---

## Seasonal Campaigns (Outside Core Sequence)

**Q4 (Oct-Dec) and Q1 (Jan-Feb):** Performance review season
- Increase email frequency
- Focus on review generation feature
- Subject lines referencing "review season"

**Example seasonal subject lines:**
- "Review season is here"
- "Your Q4 achievements, documented"
- "Before your next 1:1"
