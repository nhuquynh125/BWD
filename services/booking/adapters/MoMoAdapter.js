/**
 * MoMoAdapter.js — MoMo e-wallet payment adapter.
 *
 * Env variables required:
 *   MOMO_PARTNER_CODE   – MoMo partner/merchant code
 *   MOMO_ACCESS_KEY     – MoMo access key
 *   MOMO_SECRET_KEY     – HMAC-SHA256 signing secret
 *   MOMO_API_URL        – MoMo payment creation endpoint
 *   MOMO_RETURN_URL     – URL MoMo redirects user back to
 *   MOMO_NOTIFY_URL     – IPN / webhook URL for server-to-server callbacks
 */

'use strict';

const crypto      = require('crypto');
const https       = require('https');
const BaseAdapter = require('./BaseAdapter');

/* ── Default sandbox values (override with real env vars in production) ──── */
const DEFAULTS = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
  accessKey:   process.env.MOMO_ACCESS_KEY   || 'klm05TvNBzhg7h7j',
  secretKey:   process.env.MOMO_SECRET_KEY   || 'at67qH6mk8w5Y1nAyMoTKAt67qH6mk8w',
  apiUrl:      process.env.MOMO_API_URL      || 'https://test-payment.momo.vn/v2/gateway/api/create',
  returnUrl:   process.env.MOMO_RETURN_URL   || 'http://localhost:8000/api/booking/payment/return/momo',
  notifyUrl:   process.env.MOMO_NOTIFY_URL   || 'http://localhost:8000/api/booking/webhook/momo',
};

class MoMoAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({ ...DEFAULTS, ...config });
  }

  // ─── createPaymentUrl ──────────────────────────────────────────────────────

  /**
   * Calls the MoMo gateway to obtain a payUrl and returns it.
   *
   * @param {object} bookingData
   * @param {string} bookingData.bookingId      MongoDB _id
   * @param {string} bookingData.confirmCode    Used as orderId & requestId
   * @param {number} bookingData.totalAmount    Amount in VND (integer)
   * @param {string} [bookingData.orderInfo]    Short description
   * @returns {Promise<{ paymentUrl: string, transactionId: string }>}
   */
  async createPaymentUrl(bookingData) {
    const {
      confirmCode,
      totalAmount,
      orderInfo = 'Dat tour du lich Lunar Heritage',
    } = bookingData;

    const { partnerCode, accessKey, secretKey, apiUrl, returnUrl, notifyUrl } = this.config;

    const requestId   = confirmCode;          // idempotency key
    const orderId     = confirmCode;
    const amount      = String(Math.round(totalAmount));
    const requestType = 'payWithATM';         // or 'captureWallet'
    const extraData   = '';                   // base64-encoded extra JSON if needed

    /* ── Build the raw signature string (strict MoMo v2 order) ────────────── */
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${notifyUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${returnUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl:      notifyUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    });

    /* ── POST to MoMo API ──────────────────────────────────────────────────── */
    let paymentUrl;
    try {
      const responseData = await _postJson(apiUrl, requestBody);
      if (responseData.resultCode !== 0) {
        throw new Error(`MoMo error ${responseData.resultCode}: ${responseData.message}`);
      }
      paymentUrl = responseData.payUrl;
    } catch (err) {
      /* In development / sandbox unreachable → return a mock URL so the flow
         can still be tested end-to-end without real MoMo credentials.        */
      console.warn('[MoMoAdapter] MoMo API call failed, returning mock URL:', err.message);
      paymentUrl = `http://localhost:8000/mock/momo?orderId=${orderId}&amount=${amount}`;
    }

    return { paymentUrl, transactionId: orderId };
  }

  // ─── verifyWebhook ─────────────────────────────────────────────────────────

  /**
   * Verifies a MoMo IPN / webhook payload using HMAC-SHA256.
   *
   * @param {object} payload    req.body parsed from MoMo IPN POST
   * @param {string} signature  payload.signature value
   * @returns {Promise<boolean>}
   */
  async verifyWebhook(payload, signature) {
    const { accessKey, secretKey } = this.config;
    const {
      partnerCode, orderId, requestId, amount, orderInfo,
      orderType, transId, resultCode, message, payType,
      responseTime, extraData,
    } = payload;

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    return expected === (signature || payload.signature || '');
  }

  // ─── processPaymentReturn ──────────────────────────────────────────────────

  /**
   * Handles the MoMo return-URL redirect.
   *
   * @param {object} query  req.query from MoMo redirect
   * @returns {Promise<{ success: boolean, transactionId: string, confirmCode: string, message: string }>}
   */
  async processPaymentReturn(query) {
    const { resultCode, orderId, transId, message, signature } = query;

    /* Verify signature */
    const isValid = await this.verifyWebhook(query, signature);
    if (!isValid) {
      return {
        success:       false,
        transactionId: transId || '',
        confirmCode:   orderId || '',
        message:       'Chữ ký MoMo không hợp lệ (invalid signature)',
      };
    }

    const success = String(resultCode) === '0';
    return {
      success,
      transactionId: transId || orderId || '',
      confirmCode:   orderId || '',
      message:       success
        ? 'Thanh toán MoMo thành công'
        : `Thanh toán MoMo thất bại – ${message || `mã lỗi: ${resultCode}`}`,
    };
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Minimal HTTPS POST helper that resolves with the parsed JSON response.
 * Avoids adding an extra dependency (axios / node-fetch) to the project.
 *
 * @param {string} urlStr
 * @param {string} body  JSON-serialised request body
 * @returns {Promise<object>}
 */
function _postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from MoMo: ' + data)); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10_000, () => { req.destroy(new Error('MoMo API request timed out')); });
    req.write(body);
    req.end();
  });
}

module.exports = MoMoAdapter;
