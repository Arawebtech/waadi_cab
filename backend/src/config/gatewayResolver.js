/**
 * gatewayResolver.js
 *
 * Single source of truth for "which gateway is active right now?"
 * MongoDB determines activeGateway; credentials always come from .env.
 */

const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');
const payuService = require('../services/payuService');
const cashfreeService = require('../services/cashfreeService');
const gatewayCredentials = require('../utils/gatewayCredentials');

const gatewayResolver = {
  /**
   * Returns the active gateway name and its service instance.
   * Falls back to PayU if DB is unreachable.
   *
   * @returns {{ name: 'payu'|'cashfree', service: payuService|cashfreeService, config: Object|null }}
   */
  async getActiveGateway() {
    try {
      const config = await PaymentGatewayConfig.getConfig();
      const name = config.activeGateway || 'payu';
      const service = name === 'cashfree' ? cashfreeService : payuService;
      return { name, service, config };
    } catch (err) {
      console.error('⚠️  gatewayResolver DB error – defaulting to PayU:', err.message);
      return { name: 'payu', service: payuService, config: null };
    }
  },

  /**
   * Resolve active gateway from MongoDB, validate .env credentials, and sync
   * the live service singleton. Use this before any payment initiation.
   *
   * @returns {Promise<{
   *   name: string,
   *   service: Object,
   *   config: Object|null,
   *   isValid: boolean,
   *   errors: string[]
   * }>}
   */
  async prepareActiveGateway() {
    const { name, config } = await this.getActiveGateway();
    const validation = gatewayCredentials.validateAndSync(name);
    return {
      name,
      service: validation.service,
      config,
      isValid: validation.isValid,
      errors: validation.errors,
    };
  },

  /**
   * Convenience: just return the gateway name string.
   */
  async getActiveName() {
    const { name } = await this.getActiveGateway();
    return name;
  },
};

module.exports = gatewayResolver;
