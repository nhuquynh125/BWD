/**
 * DirectAdapter.js — Cash / direct booking adapter.
 *
 * No payment gateway is involved.  A booking is immediately placed in
 * "pending" status and the caller is redirected to the success page.
 * verifyWebhook always returns true (no external webhook for cash payments).
 */

'use strict';

const crypto      = require('crypto');
const BaseAdapter = require('./BaseAdapter');

class DirectAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
  }

  // ─── createPaymentUrl ──────────────────────────────────────────────────────

  /**
   * For cash bookings there is no external payment page.
   * We return paymentUrl = null and a generated transactionId so the caller
   * knows to redirect the user directly to the success / confirmation page.
   *
   * @param {object} bookingData
   * @param {string} bookingData.confirmCode
   * @returns {Promise<{ paymentUrl: null, transactionId: string, status: 'pending' }>}
   */
  async createPaymentUrl(bookingData) {
    const transactionId = `CASH-${bookingData.confirmCode || crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      paymentUrl:    null,
      transactionId,
      status:        'pending',
    };
  }

  // ─── verifyWebhook ─────────────────────────────────────────────────────────

  /**
   * Cash bookings have no external webhook; always returns true.
   *
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async verifyWebhook(payload, signature) {
    return true;
  }

  // ─── processPaymentReturn ──────────────────────────────────────────────────

  /**
   * Cash bookings don't redirect through a payment gateway.
   * If this method is ever called we treat it as a no-op success.
   *
   * @param {object} query  req.query (may be empty for direct bookings)
   * @returns {Promise<{ success: boolean, transactionId: string, confirmCode: string, message: string }>}
   */
  async processPaymentReturn(query) {
    return {
      success:       true,
      transactionId: query.transactionId || '',
      confirmCode:   query.confirmCode   || '',
      message:       'Đặt tour trực tiếp (thanh toán tiền mặt) thành công. Vui lòng thanh toán khi đến nơi.',
    };
  }
}

module.exports = DirectAdapter;
