/**
 * VNPayAdapter.js — VNPay payment gateway adapter.
 *
 * Env variables required:
 *   VNPAY_TMN_CODE      – Terminal / merchant code
 *   VNPAY_HASH_SECRET   – HMAC-SHA512 signing secret
 *   VNPAY_URL           – VNPay payment endpoint (sandbox or production)
 *   VNPAY_RETURN_URL    – Full URL the gateway redirects back to
 */

'use strict';

const crypto  = require('crypto');
const BaseAdapter = require('./BaseAdapter');

/* ── Default sandbox values (override with real env vars in production) ──── */
const DEFAULTS = {
  tmnCode:   process.env.VNPAY_TMN_CODE    || 'DEMO_TMN_CODE',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'DEMO_VNPAY_HASH_SECRET_KEY_32CH',
  paymentUrl: process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl:  process.env.VNPAY_RETURN_URL  || 'http://localhost:8000/api/booking/payment/return/vnpay',
};

class VNPayAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({ ...DEFAULTS, ...config });
  }

  // ─── createPaymentUrl ──────────────────────────────────────────────────────

  /**
   * Builds the VNPay redirect URL with a signed parameter set.
   *
   * @param {object} bookingData
   * @param {string} bookingData.bookingId      MongoDB _id of the booking
   * @param {string} bookingData.confirmCode    Human-readable code (used as txnRef)
   * @param {number} bookingData.totalAmount    Amount in VND (integer)
   * @param {string} [bookingData.orderInfo]    Short description shown on payment page
   * @param {string} [bookingData.ipAddr]       Caller's IP address
   * @returns {Promise<{ paymentUrl: string, transactionId: string }>}
   */
  async createPaymentUrl(bookingData) {
    const {
      confirmCode,
      totalAmount,
      orderInfo = 'Dat tour du lich',
      ipAddr    = '127.0.0.1',
    } = bookingData;

    const now        = new Date();
    const createDate = _formatDate(now);
    const expireDate = _formatDate(new Date(now.getTime() + 15 * 60 * 1000)); // +15 min

    /* VNPay requires amount × 100 (no decimals) */
    const vnpParams = {
      vnp_Version:     '2.1.0',
      vnp_Command:     'pay',
      vnp_TmnCode:     this.config.tmnCode,
      vnp_Amount:      String(Math.round(totalAmount) * 100),
      vnp_CurrCode:    'VND',
      vnp_TxnRef:      confirmCode,
      vnp_OrderInfo:   orderInfo,
      vnp_OrderType:   'other',
      vnp_Locale:      'vn',
      vnp_ReturnUrl:   this.config.returnUrl,
      vnp_IpAddr:      ipAddr,
      vnp_CreateDate:  createDate,
      vnp_ExpireDate:  expireDate,
    };

    /* Sort keys alphabetically, build query string, then sign */
    const sortedKeys  = Object.keys(vnpParams).sort();
    const signData    = sortedKeys.map(k => `${k}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`).join('&');
    const signature   = crypto
      .createHmac('sha512', this.config.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const paymentUrl  = `${this.config.paymentUrl}?${signData}&vnp_SecureHash=${signature}`;

    return { paymentUrl, transactionId: confirmCode };
  }

  // ─── verifyWebhook ─────────────────────────────────────────────────────────

  /**
   * Validates a VNPay IPN (webhook) payload.
   *
   * @param {object} payload   req.query / req.body from VNPay IPN call
   * @param {string} signature vnp_SecureHash value sent by VNPay
   * @returns {Promise<boolean>}
   */
  async verifyWebhook(payload, signature) {
    /* Remove the hash fields before re-computing */
    const { vnp_SecureHash, vnp_SecureHashType, ...rest } = payload; // eslint-disable-line no-unused-vars

    const sortedKeys = Object.keys(rest).sort();
    const signData   = sortedKeys
      .map(k => `${k}=${encodeURIComponent(rest[k]).replace(/%20/g, '+')}`)
      .join('&');

    const expected = crypto
      .createHmac('sha512', this.config.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return expected === (signature || vnp_SecureHash || '').toLowerCase();
  }

  // ─── processPaymentReturn ──────────────────────────────────────────────────

  /**
   * Handles the return URL GET request after a user completes (or cancels)
   * payment on the VNPay page.
   *
   * @param {object} query  req.query
   * @returns {Promise<{ success: boolean, transactionId: string, confirmCode: string, message: string }>}
   */
  async processPaymentReturn(query) {
    const { vnp_ResponseCode, vnp_TxnRef, vnp_TransactionNo, vnp_SecureHash } = query;

    /* Verify signature first */
    const isValid = await this.verifyWebhook(query, vnp_SecureHash);
    if (!isValid) {
      return {
        success:       false,
        transactionId: vnp_TransactionNo || '',
        confirmCode:   vnp_TxnRef || '',
        message:       'Chữ ký không hợp lệ (invalid signature)',
      };
    }

    const success = vnp_ResponseCode === '00';
    return {
      success,
      transactionId: vnp_TransactionNo || vnp_TxnRef || '',
      confirmCode:   vnp_TxnRef || '',
      message:       success
        ? 'Thanh toán VNPay thành công'
        : `Thanh toán thất bại – mã lỗi VNPay: ${vnp_ResponseCode}`,
    };
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/** Format a Date as 'YYYYMMDDHHmmss' (VNPay date format) */
function _formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

module.exports = VNPayAdapter;
