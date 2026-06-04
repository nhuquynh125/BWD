/**
 * seed-badges.js — LUNAR HERITAGE
 * Run once to seed default badge definitions into MongoDB.
 * Usage: node seed-badges.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { initDb, Badge } = require('./db');

const DEFAULT_BADGES = [
  // ── Visit count badges ─────────────────────────────────────────────────
  {
    slug:        'first-steps',
    name:        { vi: 'Bước chân đầu tiên', en: 'First Steps' },
    description: { vi: 'Khám phá di sản đầu tiên của bạn', en: 'Discover your first heritage site' },
    iconUrl:     '🥾',
    rarity:      'common',
    criteria:    { type: 'visit_count', threshold: 1 },
  },
  {
    slug:        'explorer',
    name:        { vi: 'Nhà khám phá', en: 'Explorer' },
    description: { vi: 'Đã ghé thăm 3 di sản', en: 'Visited 3 heritage sites' },
    iconUrl:     '🧭',
    rarity:      'common',
    criteria:    { type: 'visit_count', threshold: 3 },
  },
  {
    slug:        'wanderer',
    name:        { vi: 'Lữ hành gia', en: 'Wanderer' },
    description: { vi: 'Đã khám phá 5 di sản', en: 'Explored 5 heritage sites' },
    iconUrl:     '🎒',
    rarity:      'rare',
    criteria:    { type: 'visit_count', threshold: 5 },
  },
  {
    slug:        'heritage-master',
    name:        { vi: 'Bậc thầy di sản', en: 'Heritage Master' },
    description: { vi: 'Đã chinh phục 10 di sản', en: 'Conquered 10 heritage sites' },
    iconUrl:     '🏛️',
    rarity:      'epic',
    criteria:    { type: 'visit_count', threshold: 10 },
  },
  {
    slug:        'legend',
    name:        { vi: 'Huyền thoại Việt Nam', en: 'Vietnamese Legend' },
    description: { vi: 'Đã khám phá toàn bộ di sản UNESCO Việt Nam', en: 'Explored all Vietnamese UNESCO sites' },
    iconUrl:     '👑',
    rarity:      'legendary',
    criteria:    { type: 'visit_count', threshold: 19 },
  },
  // ── Points threshold badges ────────────────────────────────────────────
  {
    slug:        'point-starter',
    name:        { vi: 'Người mới bắt đầu', en: 'Point Starter' },
    description: { vi: 'Tích lũy 100 điểm', en: 'Accumulate 100 points' },
    iconUrl:     '⭐',
    rarity:      'common',
    criteria:    { type: 'points_threshold', threshold: 100 },
  },
  {
    slug:        'point-collector',
    name:        { vi: 'Nhà sưu tầm điểm', en: 'Point Collector' },
    description: { vi: 'Tích lũy 500 điểm', en: 'Accumulate 500 points' },
    iconUrl:     '🌟',
    rarity:      'rare',
    criteria:    { type: 'points_threshold', threshold: 500 },
  },
  {
    slug:        'point-master',
    name:        { vi: 'Thạc sĩ điểm số', en: 'Point Master' },
    description: { vi: 'Tích lũy 1,000 điểm', en: 'Accumulate 1,000 points' },
    iconUrl:     '💫',
    rarity:      'epic',
    criteria:    { type: 'points_threshold', threshold: 1000 },
  },
  {
    slug:        'point-legend',
    name:        { vi: 'Huyền thoại điểm số', en: 'Point Legend' },
    description: { vi: 'Tích lũy 5,000 điểm', en: 'Accumulate 5,000 points' },
    iconUrl:     '🏆',
    rarity:      'legendary',
    criteria:    { type: 'points_threshold', threshold: 5000 },
  },
  // ── Streak badges ──────────────────────────────────────────────────────
  {
    slug:        'streak-3',
    name:        { vi: 'Chuỗi 3 ngày', en: '3-Day Streak' },
    description: { vi: 'Đăng nhập 3 ngày liên tiếp', en: 'Login 3 days in a row' },
    iconUrl:     '🔥',
    rarity:      'common',
    criteria:    { type: 'streak', threshold: 3 },
  },
  {
    slug:        'streak-7',
    name:        { vi: 'Chuỗi tuần lễ', en: 'Week Streak' },
    description: { vi: 'Đăng nhập 7 ngày liên tiếp', en: 'Login 7 days in a row' },
    iconUrl:     '⚡',
    rarity:      'rare',
    criteria:    { type: 'streak', threshold: 7 },
  },
  {
    slug:        'streak-30',
    name:        { vi: 'Người trung thành', en: 'Loyal Visitor' },
    description: { vi: 'Đăng nhập 30 ngày liên tiếp', en: 'Login 30 days in a row' },
    iconUrl:     '💎',
    rarity:      'legendary',
    criteria:    { type: 'streak', threshold: 30 },
  },
  // ── Site-specific badges ───────────────────────────────────────────────
  {
    slug:        'ha-long-conqueror',
    name:        { vi: 'Chinh phục Hạ Long', en: 'Hạ Long Conqueror' },
    description: { vi: 'Đã khám phá Vịnh Hạ Long', en: 'Explored Hạ Long Bay' },
    iconUrl:     '⛵',
    rarity:      'rare',
    criteria:    { type: 'site_specific', siteSlug: 'vinh-ha-long' },
  },
  {
    slug:        'hoi-an-dreamer',
    name:        { vi: 'Mơ về Hội An', en: 'Hội An Dreamer' },
    description: { vi: 'Đã thăm Phố cổ Hội An', en: 'Visited Hội An Ancient Town' },
    iconUrl:     '🏮',
    rarity:      'rare',
    criteria:    { type: 'site_specific', siteSlug: 'hoi-an' },
  },
  {
    slug:        'hue-royalty',
    name:        { vi: 'Hoàng tộc Huế', en: 'Huế Royalty' },
    description: { vi: 'Đã đặt chân đến Cố đô Huế', en: 'Set foot in the Ancient Capital of Huế' },
    iconUrl:     '👘',
    rarity:      'epic',
    criteria:    { type: 'site_specific', siteSlug: 'co-do-hue' },
  },
];

async function seedBadges() {
  await initDb();
  console.log('🌱 Seeding badges...');
  let created = 0;
  let skipped = 0;

  for (const badge of DEFAULT_BADGES) {
    const existing = await Badge.findOne({ slug: badge.slug });
    if (existing) {
      skipped++;
      continue;
    }
    await Badge.create(badge);
    created++;
    console.log(`  ✅  ${badge.slug}`);
  }

  console.log(`\n✨ Done: ${created} created, ${skipped} already existed`);
  await mongoose.connection.close();
  process.exit(0);
}

seedBadges().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
