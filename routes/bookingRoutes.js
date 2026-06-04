/**
 * bookingRoutes.js — LUNAR HERITAGE Phase 2 (AdapterFactory Edition)
 *
 * Payment flow:
 *   POST   /api/booking                         → create booking + get payment URL
 *   GET    /api/booking/payment/return/:provider → handle redirect from gateway
 *   POST   /api/booking/webhook/:provider        → handle IPN / server-to-server callback
 *   GET    /api/booking                          → list current user's bookings
 *   GET    /api/booking/:id                      → get single booking
 *   PATCH  /api/booking/:id/cancel               → cancel booking
 *   GET    /api/booking/availability/:siteSlug   → slot availability
 */

'use strict';

const express        = require('express');
const crypto         = require('crypto');
const { requireAuth }  = require('../auth');
const { Booking, HeritageSite } = require('../db');
const { awardPoints }  = require('../services/GamificationService');
const AdapterFactory   = require('../services/booking/AdapterFactory');

const router = express.Router();

/* ── Price map (VND per person per tour type) ──────────────────────────────── */
const PRICE_MAP = {
  standard: 350_000,
  premium:  750_000,
  private:  1_500_000,
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function genConfirmCode() {
  return 'LH-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/** Extract the caller's real IP from common proxy headers or fall back to socket IP */
function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GET  /api/booking  — current user's bookings
   ═══════════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════════
   GET  /api/booking/availability/:siteSlug
   NOTE: must be declared before /:id so Express does not try to cast
         "availability" as a MongoDB ObjectId.
   ═══════════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════════
   GET  /api/booking/payment/return/:provider
   Called when the user is redirected back from the payment gateway.
   Updates booking status in MongoDB and redirects the browser to the
   appropriate frontend success / failure page.
   ═══════════════════════════════════════════════════════════════════════════════ */
router.get('/payment/return/:provider', async (req, res) => {
  const { provider } = req.params;

  try {
    if (!AdapterFactory.isSupported(provider)) {
      return res.status(400).json({ error: `Unsupported payment provider: ${provider}` });
    }

    const adapter = AdapterFactory.getAdapter(provider);
    const result  = await adapter.processPaymentReturn(req.query);

    const { success, transactionId, confirmCode, message } = result;

    /* Update the booking document */
    if (confirmCode) {
      const newStatus  = success ? 'confirmed' : 'failed';
      const newPayment = success ? 'paid' : 'failed';

      const booking = await Booking.findOneAndUpdate(
        { confirmCode },
        {
          $set: {
            status:               newStatus,
            'payment.status':     newPayment,
            'payment.transactionId': transactionId || confirmCode,
            ...(success && { 'payment.paidAt': new Date() }),
          },
          $push: {
            statusHistory: {
              status: newStatus,
              reason: message || `Payment return from ${provider}`,
            },
          },
        },
        { new: true }
      );

      /* Award gamification points on successful payment */
      if (booking && success) {
        awardPoints(booking.userId, 'booking', {
          siteSlug:  booking.siteSlug,
          bookingId: booking._id.toString(),
        }).catch(() => {});
      }
    }

    /* Redirect the browser to the frontend confirmation page */
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:8000';
    const redirectUrl = success
      ? `${frontendBase}/booking.html?status=success&confirmCode=${encodeURIComponent(confirmCode || '')}&provider=${provider}`
      : `${frontendBase}/booking.html?status=failed&reason=${encodeURIComponent(message || 'Payment failed')}&provider=${provider}`;

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error(`[BookingReturn:${provider}]`, err.message);
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:8000';
    return res.redirect(302, `${frontendBase}/booking.html?status=error&provider=${provider}`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════════
   POST  /api/booking/webhook/:provider
   Server-to-server IPN callback from the payment gateway.
   Verifies the signature and updates the booking status.
   ═══════════════════════════════════════════════════════════════════════════════ */
router.post(
  '/webhook/:provider',
  express.raw({ type: '*/*' }),  // capture raw body for signature verification
  async (req, res) => {
    const { provider } = req.params;

    /* Acknowledge immediately — VNPay / MoMo require a fast 200 response */
    res.status(200).json({ received: true });

    try {
      if (!AdapterFactory.isSupported(provider)) {
        console.warn(`[BookingWebhook] Unknown provider: ${provider}`);
        return;
      }

      /* Parse body — may arrive as Buffer (raw) or already-parsed JSON */
      let payload;
      if (Buffer.isBuffer(req.body)) {
        try { payload = JSON.parse(req.body.toString()); }
        catch { payload = {}; }
      } else {
        payload = req.body || {};
      }

      const signature = (
        req.headers['x-secure-hash'] ||
        payload.vnp_SecureHash       ||
        payload.signature            ||
        ''
      );

      const adapter  = AdapterFactory.getAdapter(provider);
      const isValid  = await adapter.verifyWebhook(payload, signature);

      if (!isValid) {
        console.warn(`[BookingWebhook:${provider}] Invalid signature — payload rejected.`);
        return;
      }

      /* Normalise the confirmation code from different provider formats */
      const confirmCode   = payload.vnp_TxnRef || payload.orderId || payload.externalRef;
      const transactionId = payload.vnp_TransactionNo || payload.transId || payload.transactionId;

      /* Determine success based on provider-specific response codes */
      let success = false;
      if (provider === 'vnpay')  success = payload.vnp_ResponseCode === '00';
      else if (provider === 'momo') success = String(payload.resultCode) === '0';
      else success = true; // DirectAdapter / cash has no external webhook

      if (!confirmCode) {
        console.warn(`[BookingWebhook:${provider}] No confirmCode in payload`);
        return;
      }

      const newStatus  = success ? 'confirmed' : 'failed';
      const newPayment = success ? 'paid'      : 'failed';

      const booking = await Booking.findOneAndUpdate(
        { confirmCode },
        {
          $set: {
            status:                  newStatus,
            'payment.status':        newPayment,
            'payment.transactionId': transactionId || confirmCode,
            ...(success && { 'payment.paidAt': new Date() }),
          },
          $push: {
            statusHistory: {
              status: newStatus,
              reason: `Webhook from ${provider}`,
            },
          },
        },
        { new: true }
      );

      if (booking && success) {
        awardPoints(booking.userId, 'booking', { siteSlug: booking.siteSlug }).catch(() => {});
      }

      console.log(`[BookingWebhook:${provider}] ${confirmCode} → ${newStatus}`);
    } catch (err) {
      console.error(`[BookingWebhook:${provider}]`, err.message);
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════════
   POST  /api/booking  — create a new booking
   Returns a paymentUrl for VNPay / MoMo, or null for cash (direct) bookings.
   ═══════════════════════════════════════════════════════════════════════════════ */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      siteSlug,
      tourDate,
      participants,
      tourType        = 'standard',
      paymentProvider = 'cash',
      notes           = '',
      orderInfo,
    } = req.body;

    /* ── Validate required fields ─────────────────────────────────────────── */
    if (!siteSlug || !tourDate || !participants) {
      return res.status(400).json({ error: 'siteSlug, tourDate, participants bắt buộc' });
    }
    if (!['standard', 'premium', 'private'].includes(tourType)) {
      return res.status(400).json({ error: 'tourType không hợp lệ (standard | premium | private)' });
    }
    if (!AdapterFactory.isSupported(paymentProvider)) {
      return res.status(400).json({
        error: `paymentProvider không hợp lệ. Hỗ trợ: ${AdapterFactory.supportedProviders.join(', ')}`,
      });
    }

    /* ── Look up heritage site ────────────────────────────────────────────── */
    const site =
      await HeritageSite.findOne({ page: siteSlug + '.html' }).lean() ||
      await HeritageSite.findOne({ name: siteSlug }).lean();

    /* ── Calculate amounts ───────────────────────────────────────────────── */
    const pricePerPerson = PRICE_MAP[tourType];
    const totalAmount    = pricePerPerson * Number(participants);
    const confirmCode    = genConfirmCode();

    /* ── Create booking (status = 'pending' until payment confirms) ──────── */
    const booking = await Booking.create({
      userId:       req.user.userId,
      siteSlug,
      siteName:     site?.name || siteSlug,
      tourType,
      tourDate:     new Date(tourDate),
      participants: Number(participants),
      totalAmount,
      currency:     'VND',
      status:       'pending',
      confirmCode,
      payment: {
        provider:  paymentProvider,
        status:    'pending',
      },
      statusHistory: [{ status: 'pending', reason: `Chờ thanh toán qua ${paymentProvider}` }],
      notes,
    });

    /* ── Delegate to the appropriate payment adapter ─────────────────────── */
    const adapter     = AdapterFactory.getAdapter(paymentProvider);
    const bookingData = {
      bookingId:   booking._id.toString(),
      confirmCode: booking.confirmCode,
      totalAmount: booking.totalAmount,
      currency:    booking.currency,
      orderInfo:   orderInfo || `Dat tour ${booking.siteName || siteSlug}`,
      ipAddr:      getClientIp(req),
      returnUrl:   `${process.env.FRONTEND_URL || 'http://localhost:8000'}/api/booking/payment/return/${paymentProvider}`,
      cancelUrl:   `${process.env.FRONTEND_URL || 'http://localhost:8000'}/booking.html?status=cancelled`,
    };

    const { paymentUrl, transactionId, status: adapterStatus } = await adapter.createPaymentUrl(bookingData);

    /* For cash / direct bookings the adapter returns status='pending' + no URL */
    if (!paymentUrl) {
      /* Auto-confirm cash bookings and award points immediately */
      booking.status                   = 'confirmed';
      booking.payment.status           = 'pending';   // paid on arrival
      booking.payment.transactionId    = transactionId || confirmCode;
      booking.statusHistory.push({ status: 'confirmed', reason: 'Đặt tour trực tiếp (tiền mặt)' });
      await booking.save();

      awardPoints(req.user.userId, 'booking', {
        siteSlug,
        bookingId: booking._id.toString(),
      }).catch(() => {});

      return res.status(201).json({
        ok:          true,
        booking,
        confirmCode: booking.confirmCode,
        paymentUrl:  null,
        provider:    paymentProvider,
      });
    }

    /* For VNPay / MoMo: store the transactionId and return the URL to the frontend */
    await Booking.findByIdAndUpdate(booking._id, {
      $set: { 'payment.transactionId': transactionId },
    });

    return res.status(201).json({
      ok:          true,
      booking,
      confirmCode: booking.confirmCode,
      paymentUrl,
      provider:    paymentProvider,
    });
  } catch (err) {
    console.error('[BookingCreate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════════
   GET  /api/booking/:id
   ═══════════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════════
   PATCH  /api/booking/:id/cancel
   ═══════════════════════════════════════════════════════════════════════════════ */
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

    /* Refund if cancelled ≥ 24 h before the tour date */
    const hoursUntilTour = (new Date(booking.tourDate) - Date.now()) / (1000 * 60 * 60);
    const newStatus      = hoursUntilTour >= 24 ? 'refunded' : 'cancelled';

    booking.status = newStatus;
    booking.statusHistory.push({
      status: newStatus,
      reason: req.body.reason || 'Người dùng hủy',
    });
    await booking.save();

    res.json({ ok: true, status: newStatus, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
