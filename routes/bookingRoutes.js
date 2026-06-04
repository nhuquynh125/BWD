/**
 * bookingRoutes.js — LUNAR HERITAGE Phase 2
 * CRUD endpoints for tour bookings + direct payment simulation.
 */

const express = require('express');
const crypto  = require('crypto');
const { requireAuth } = require('../auth');
const { Booking, HeritageSite } = require('../db');
const { awardPoints }           = require('../services/GamificationService');

const router = express.Router();

/* ── Price map (VND per person per tour type) ──────────────────────────── */
const PRICE_MAP = {
  standard: 350_000,
  premium:  750_000,
  private:  1_500_000,
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function genConfirmCode() {
  return 'LH-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/* ─── GET /api/booking  (current user's bookings) ───────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user.userId };
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({ data: bookings, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/booking/:id ───────────────────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy booking' });
    if (booking.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/booking  (create new booking) ───────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { siteSlug, tourDate, participants, tourType = 'standard', paymentProvider = 'cash', notes = '' } = req.body;

    if (!siteSlug || !tourDate || !participants) {
      return res.status(400).json({ error: 'siteSlug, tourDate, participants bắt buộc' });
    }
    if (!['standard', 'premium', 'private'].includes(tourType)) {
      return res.status(400).json({ error: 'tourType không hợp lệ' });
    }

    // Look up site name from DB
    const site = await HeritageSite.findOne({ page: siteSlug + '.html' }).lean()
               || await HeritageSite.findOne({ name: siteSlug }).lean();

    const pricePerPerson = PRICE_MAP[tourType];
    const totalAmount    = pricePerPerson * Number(participants);

    const booking = await Booking.create({
      userId:       req.user.userId,
      siteSlug,
      siteName:     site?.name || siteSlug,
      tourType,
      tourDate:     new Date(tourDate),
      participants: Number(participants),
      totalAmount,
      currency:     'VND',
      status:       'confirmed',       // direct booking = auto-confirmed
      confirmCode:  genConfirmCode(),
      payment: {
        provider:      paymentProvider,
        transactionId: genConfirmCode(),
        paidAt:        new Date(),
        status:        'paid',
      },
      statusHistory: [{ status: 'confirmed', reason: 'Đặt tour trực tiếp' }],
      notes,
    });

    // Award gamification points
    awardPoints(req.user.userId, 'booking', { siteSlug, bookingId: booking._id.toString() })
      .catch(() => {});

    res.status(201).json({ ok: true, booking, confirmCode: booking.confirmCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── PATCH /api/booking/:id/cancel ─────────────────────────────────────── */
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy booking' });
    if (booking.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền' });
    }
    if (['cancelled', 'refunded'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking đã bị hủy rồi' });
    }

    // Refund if cancelled > 24h before tour
    const hoursUntilTour = (new Date(booking.tourDate) - Date.now()) / (1000 * 60 * 60);
    const newStatus      = hoursUntilTour >= 24 ? 'refunded' : 'cancelled';

    booking.status = newStatus;
    booking.statusHistory.push({ status: newStatus, reason: req.body.reason || 'Người dùng hủy' });
    await booking.save();

    res.json({ ok: true, status: newStatus, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/booking/availability/:siteSlug  ───────────────────────────── */
router.get('/availability/:siteSlug', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date bắt buộc (YYYY-MM-DD)' });

    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);

    const count = await Booking.countDocuments({
      siteSlug: req.params.siteSlug,
      tourDate: { $gte: start, $lt: end },
      status:   { $in: ['pending', 'confirmed'] },
    });

    const MAX_DAILY = 200;
    res.json({
      siteSlug:  req.params.siteSlug,
      date,
      booked:    count,
      available: Math.max(0, MAX_DAILY - count),
      prices:    PRICE_MAP,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/booking/webhook/payment  (simulated webhook) ────────────── */
router.post('/webhook/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  res.status(200).json({ received: true });
  try {
    const event = JSON.parse(req.body);
    const { externalRef, status, transactionId } = event;
    if (!externalRef) return;

    const booking = await Booking.findOneAndUpdate(
      { confirmCode: externalRef },
      {
        $set:  { status, 'payment.transactionId': transactionId, 'payment.status': status },
        $push: { statusHistory: { status, reason: 'Payment webhook' } },
      },
      { new: true }
    );

    if (booking && status === 'confirmed') {
      awardPoints(booking.userId, 'booking', { siteSlug: booking.siteSlug }).catch(() => {});
    }
  } catch (err) {
    console.error('[BookingWebhook]', err.message);
  }
});

module.exports = router;
