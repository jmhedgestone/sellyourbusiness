#!/usr/bin/env node
// scripts/schedule-nurture-sequence.mjs
//
// Reads marketing/nurture-sequence/*.html, parses each file's metadata
// from the top comment, and creates + schedules 10 Resend Broadcasts
// (one per Tuesday) targeting the SellYourBusiness Newsletter Audience.
//
// Usage:
//   node scripts/schedule-nurture-sequence.mjs                 # dry run
//   node scripts/schedule-nurture-sequence.mjs --confirm        # actually create + schedule
//   node scripts/schedule-nurture-sequence.mjs --confirm --start 2026-05-05
//                                                              # start week 1 on a specific Tuesday
//
// Required env:
//   RESEND_API_KEY       — your Resend secret key (re_...)
//   RESEND_AUDIENCE_ID   — UUID of the SellYourBusiness Newsletter audience
//
// Optional env:
//   RESEND_FROM          — default: "John Matsis <john@sellyourbusiness.com>"
//   RESEND_REPLY_TO      — default: "john.matsis@hedgestone.com"
//   RESEND_SEND_HOUR_ET  — local hour to send each Tuesday (24h, default: 9)

import { Resend } from 'resend';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEQUENCE_DIR = join(__dirname, '..', 'marketing', 'nurture-sequence');

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const startIdx = args.indexOf('--start');
const startArg = startIdx >= 0 ? args[startIdx + 1] : null;

const apiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.RESEND_AUDIENCE_ID;
const from = process.env.RESEND_FROM || 'John Matsis <john@sellyourbusiness.com>';
const replyTo = process.env.RESEND_REPLY_TO || 'john.matsis@hedgestone.com';
const sendHour = Number(process.env.RESEND_SEND_HOUR_ET || 9);

if (!apiKey) {
  console.error('Missing RESEND_API_KEY env var. Get it from https://resend.com/api-keys');
  process.exit(1);
}
if (!audienceId) {
  console.error('Missing RESEND_AUDIENCE_ID env var. Create an audience at https://resend.com/audiences and copy its ID.');
  process.exit(1);
}

// ─── Compute the start date (next Tuesday at sendHour ET, or --start override)
function nextTuesdayUtc(fromDate, hourEt) {
  // Tuesday = 2 in JS Date.getUTCDay (0=Sun…6=Sat).
  // Eastern Time is UTC-5 (EST) or UTC-4 (EDT). For scheduling, we use a fixed
  // UTC offset based on the date's actual DST status. Approximation: DST runs
  // from second Sunday in March through first Sunday in November.
  const d = new Date(fromDate);
  const day = d.getUTCDay();
  const daysUntilTue = (2 - day + 7) % 7 || 7; // always at least 1 day in the future
  const tue = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilTue));
  // Compute ET offset for that Tuesday
  const isDst = isUsDst(tue);
  const offsetHours = isDst ? 4 : 5; // EDT or EST
  tue.setUTCHours(hourEt + offsetHours, 0, 0, 0);
  return tue;
}

function isUsDst(date) {
  const y = date.getUTCFullYear();
  // Second Sunday of March, 2am ET (≈06:00 UTC during EST)
  const march = new Date(Date.UTC(y, 2, 1));
  const dstStart = new Date(Date.UTC(y, 2, 14 - ((march.getUTCDay() + 6) % 7))); // 2nd Sunday
  // First Sunday of November, 2am ET (≈06:00 UTC during EDT)
  const nov = new Date(Date.UTC(y, 10, 1));
  const dstEnd = new Date(Date.UTC(y, 10, 7 - ((nov.getUTCDay() + 6) % 7))); // 1st Sunday
  return date >= dstStart && date < dstEnd;
}

let week1Tuesday;
if (startArg) {
  // Parse YYYY-MM-DD as a Tuesday at sendHour ET
  const [y, m, d] = startArg.split('-').map(Number);
  if (!y || !m || !d) {
    console.error(`Invalid --start date: ${startArg}. Use YYYY-MM-DD.`);
    process.exit(1);
  }
  const candidate = new Date(Date.UTC(y, m - 1, d));
  if (candidate.getUTCDay() !== 2) {
    console.warn(`⚠️  --start ${startArg} is a ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][candidate.getUTCDay()]}, not a Tuesday. Proceeding anyway.`);
  }
  const offsetHours = isUsDst(candidate) ? 4 : 5;
  candidate.setUTCHours(sendHour + offsetHours, 0, 0, 0);
  week1Tuesday = candidate;
} else {
  week1Tuesday = nextTuesdayUtc(new Date(), sendHour);
}

// ─── Parse one .html file
function parseEmailFile(path) {
  const raw = readFileSync(path, 'utf8');
  const commentMatch = raw.match(/^<!--([\s\S]*?)-->/);
  if (!commentMatch) throw new Error(`No metadata comment found in ${path}`);
  const meta = {};
  for (const line of commentMatch[1].split('\n')) {
    const m = line.match(/^\s*([A-Z_]+):\s*(.+?)\s*$/);
    if (m) meta[m[1].toLowerCase()] = m[2];
  }
  const html = raw.slice(commentMatch[0].length).trim();
  if (!meta.subject) throw new Error(`Missing SUBJECT in ${path}`);
  if (!meta.week) throw new Error(`Missing WEEK in ${path}`);
  return {
    file: path,
    week: Number(meta.week),
    subject: meta.subject,
    preview: meta.preview || '',
    pillar: meta.pillar || '',
    link: meta.link || '',
    html,
  };
}

// ─── Discover and load all 10 emails in order
const files = readdirSync(SEQUENCE_DIR)
  .filter((f) => /^\d{2}-week-\d+.*\.html$/.test(f))
  .sort();

if (files.length !== 10) {
  console.warn(`⚠️  Expected 10 emails, found ${files.length}: ${files.join(', ')}`);
}

const emails = files.map((f) => parseEmailFile(join(SEQUENCE_DIR, f)))
  .sort((a, b) => a.week - b.week);

// ─── Print plan
console.log(`\n📬 SellYourBusiness nurture sequence — Resend scheduler\n`);
console.log(`From:        ${from}`);
console.log(`Reply-to:    ${replyTo}`);
console.log(`Audience:    ${audienceId}`);
console.log(`Week 1 send: ${week1Tuesday.toISOString()}  (${week1Tuesday.toUTCString()})`);
console.log(`Mode:        ${CONFIRM ? '🚀 LIVE — broadcasts will be created and scheduled' : '🧪 DRY RUN — pass --confirm to actually create them'}\n`);

const schedule = emails.map((e, i) => {
  const sendAt = new Date(week1Tuesday.getTime() + i * 7 * 24 * 60 * 60 * 1000);
  return { ...e, sendAt };
});

console.log('Plan:');
console.log('─'.repeat(86));
for (const e of schedule) {
  console.log(`  Week ${String(e.week).padStart(2)}  ${e.sendAt.toISOString().slice(0, 16).replace('T', ' ')}Z   ${e.subject}`);
}
console.log('─'.repeat(86));

if (!CONFIRM) {
  console.log(`\nDry run complete. Re-run with --confirm to create the 10 broadcasts.\n`);
  process.exit(0);
}

// ─── Create + schedule each broadcast
const resend = new Resend(apiKey);

const results = [];
for (const e of schedule) {
  process.stdout.write(`  Week ${String(e.week).padStart(2)}: creating broadcast… `);

  // Step 1: create the broadcast (draft)
  const created = await resend.broadcasts.create({
    audienceId,
    from,
    replyTo,
    subject: e.subject,
    previewText: e.preview || undefined,
    name: `Nurture Week ${e.week}: ${e.subject.slice(0, 60)}`,
    html: e.html,
  }).catch((err) => ({ error: err }));

  if (created.error || !created.data) {
    console.log('❌');
    console.error(`     create failed:`, created.error || created);
    results.push({ week: e.week, ok: false, stage: 'create', error: created.error });
    continue;
  }
  const broadcastId = created.data.id;
  process.stdout.write(`created (${broadcastId.slice(0, 8)}…), scheduling… `);

  // Step 2: schedule it
  const sent = await resend.broadcasts.send({
    id: broadcastId,
    scheduledAt: e.sendAt.toISOString(),
  }).catch((err) => ({ error: err }));

  if (sent.error) {
    console.log('❌ scheduled failed');
    console.error(`     schedule failed:`, sent.error);
    results.push({ week: e.week, ok: false, stage: 'schedule', broadcastId, error: sent.error });
    continue;
  }

  console.log(`✅ ${e.sendAt.toISOString().slice(0, 16).replace('T', ' ')}Z`);
  results.push({ week: e.week, ok: true, broadcastId, scheduledAt: e.sendAt.toISOString() });
}

const okCount = results.filter((r) => r.ok).length;
const failCount = results.length - okCount;

console.log(`\n${'═'.repeat(86)}`);
console.log(`  ✅ Scheduled: ${okCount}    ❌ Failed: ${failCount}`);
console.log('═'.repeat(86));

if (failCount > 0) {
  console.log('\nFailures:');
  for (const r of results.filter((r) => !r.ok)) {
    console.log(`  Week ${r.week} (${r.stage}):`, r.error?.message || r.error);
  }
  process.exit(1);
}

console.log('\nView your broadcasts: https://resend.com/broadcasts\n');
