/**
 * AdapterFactory.js — Factory that resolves a payment provider name to the
 * correct concrete Adapter instance.
 *
 * Usage:
 *   const AdapterFactory = require('./AdapterFactory');
 *   const adapter = AdapterFactory.getAdapter('vnpay');
 *   const { paymentUrl } = await adapter.createPaymentUrl(bookingData);
 *
 * Supported provider names (case-insensitive):
 *   'vnpay'  → VNPayAdapter
 *   'momo'   → MoMoAdapter
 *   'cash'   → DirectAdapter   (also matches 'direct')
 */

'use strict';

const VNPayAdapter  = require('./adapters/VNPayAdapter');
const MoMoAdapter   = require('./adapters/MoMoAdapter');
const DirectAdapter = require('./adapters/DirectAdapter');

/**
 * Maps lowercase provider names to their adapter constructor.
 * Add new providers here as the platform grows.
 */
const ADAPTER_MAP = {
  vnpay:  VNPayAdapter,
  momo:   MoMoAdapter,
  cash:   DirectAdapter,
  direct: DirectAdapter,   // alias
};

const AdapterFactory = {
  /**
   * Returns an initialised adapter instance for the given provider name.
   *
   * @param  {string} providerName  e.g. 'vnpay', 'momo', 'cash'
   * @param  {object} [config={}]   Optional overrides forwarded to the adapter
   *                                constructor (useful for per-request config
   *                                or testing with mock credentials).
   * @returns {import('./adapters/BaseAdapter')}
   * @throws  {Error} If providerName is unknown.
   */
  getAdapter(providerName, config = {}) {
    if (!providerName || typeof providerName !== 'string') {
      throw new Error('AdapterFactory.getAdapter: providerName must be a non-empty string.');
    }

    const key     = providerName.trim().toLowerCase();
    const Adapter = ADAPTER_MAP[key];

    if (!Adapter) {
      const supported = Object.keys(ADAPTER_MAP).join(', ');
      throw new Error(
        `AdapterFactory: unknown payment provider "${providerName}". ` +
        `Supported providers: ${supported}.`
      );
    }

    return new Adapter(config);
  },

  /**
   * Convenience helper – returns true if providerName is supported.
   *
   * @param  {string} providerName
   * @returns {boolean}
   */
  isSupported(providerName) {
    return Boolean(providerName && ADAPTER_MAP[providerName.trim().toLowerCase()]);
  },

  /** Read-only list of registered provider names. */
  get supportedProviders() {
    return Object.keys(ADAPTER_MAP);
  },
};

module.exports = AdapterFactory;
