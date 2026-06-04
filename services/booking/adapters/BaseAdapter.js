/**
 * BaseAdapter.js — Abstract base class for all payment adapters.
 *
 * Every concrete adapter (VNPay, MoMo, Direct, …) MUST extend this class
 * and implement the three lifecycle methods below.  Calling an un-overridden
 * method throws immediately so integration bugs surface at development time.
 */

class BaseAdapter {
  /**
   * @param {object} config  Provider-specific credentials / settings pulled
   *                         from environment variables (secrets, URLs, …).
   */
  constructor(config = {}) {
    if (new.target === BaseAdapter) {
      throw new TypeError(
        'BaseAdapter is abstract and cannot be instantiated directly.'
      );
    }
    this.config = config;
  }

  // ─── Interface ────────────────────────────────────────────────────────────

  /**
   * Build and return the payment URL (or a status object for cash bookings).
   *
   * @param   {object} bookingData  Normalised booking fields:
   *   { bookingId, confirmCode, totalAmount, currency,
   *     returnUrl, cancelUrl, orderInfo, ipAddr }
   * @returns {Promise<{ paymentUrl: string|null, transactionId: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async createPaymentUrl(bookingData) {
    throw new Error(
      `${this.constructor.name} must implement createPaymentUrl(bookingData).`
    );
  }

  /**
   * Validate an incoming webhook payload against its cryptographic signature.
   *
   * @param   {object|string} payload    Raw request body (object or Buffer/string).
   * @param   {string}        signature  Signature sent by the provider.
   * @returns {Promise<boolean>}
   */
  // eslint-disable-next-line no-unused-vars
  async verifyWebhook(payload, signature) {
    throw new Error(
      `${this.constructor.name} must implement verifyWebhook(payload, signature).`
    );
  }

  /**
   * Process the return-URL query params when a user comes back from the
   * payment gateway and return a normalised result object.
   *
   * @param   {object} query  req.query from the return-URL GET request.
   * @returns {Promise<{
   *   success:       boolean,
   *   transactionId: string,
   *   confirmCode:   string,
   *   message:       string,
   * }>}
   */
  // eslint-disable-next-line no-unused-vars
  async processPaymentReturn(query) {
    throw new Error(
      `${this.constructor.name} must implement processPaymentReturn(query).`
    );
  }
}

module.exports = BaseAdapter;
