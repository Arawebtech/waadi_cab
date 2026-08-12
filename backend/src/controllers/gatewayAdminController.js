/**
 * gatewayAdminController.js
 *
 * Admin-only endpoints for managing which payment gateway is active.
 * Mounted at /api/v1/admin/payment-gateway/*
 *
 * All routes require the existing isAdmin middleware already used by adminRoutes.
 */

const PaymentGatewayConfig = require('../models/PaymentGatewayConfig');
const gatewayCredentials = require('../utils/gatewayCredentials');

class GatewayAdminController {
  // ─── GET /admin/payment-gateway ───────────────────────────────────────────
  /**
   * Return the current gateway configuration.
   * Secret keys are masked before being sent to the client.
   */
  async getConfig(req, res) {
    try {
      const config = await PaymentGatewayConfig.getConfig();

      return res.status(200).json({
        success: true,
        data: {
          activeGateway: config.activeGateway,
          payu: {
            enabled: config.payu.enabled,
            environment: config.payu.environment,
            // Only show whether keys are set, not the actual value
            merchantKeySet: !!config.payu.merchantKey,
            merchantSaltSet: !!config.payu.merchantSalt,
            // Env-var fallback status
            envKeySet: !!(process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY),
            envSaltSet: !!(process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT),
            successUrl: config.payu.successUrl || process.env.PAYU_SUCCESS_URL || '',
            failureUrl: config.payu.failureUrl || process.env.PAYU_FAILURE_URL || '',
          },
          cashfree: {
            enabled: config.cashfree.enabled,
            environment: config.cashfree.environment,
            appIdSet: !!config.cashfree.appId,
            secretKeySet: !!config.cashfree.secretKey,
            webhookSecretSet: !!config.cashfree.webhookSecret,
            envAppIdSet: !!process.env.CASHFREE_APP_ID,
            envSecretSet: !!process.env.CASHFREE_SECRET_KEY,
          },
          razorpay: {
            enabled: config.razorpay?.enabled ?? false,
            environment: config.razorpay?.environment,
            keyIdSet: !!config.razorpay?.keyId,
            keySecretSet: !!config.razorpay?.keySecret,
            webhookSecretSet: !!config.razorpay?.webhookSecret,
            envKeyIdSet: !!process.env.RAZORPAY_KEY_ID,
            envKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
          },
          updatedAt: config.updatedAt,
          updatedBy: config.updatedBy,
        },
      });
    } catch (error) {
      console.error('❌ GatewayAdminController.getConfig error:', error);
      return res.status(500).json({ success: false, message: 'Failed to load gateway config' });
    }
  }

  // ─── POST /admin/payment-gateway/switch ───────────────────────────────────
  /**
   * Switch the active gateway.
   * Body: { gateway: 'payu' | 'cashfree' | 'razorpay' }
   */
  async switchGateway(req, res) {
    try {
      const { gateway } = req.body;

      console.log("get the gatway data",gateway)

      if (!gateway || !['payu', 'cashfree', 'razorpay'].includes(gateway)) {
        return res.status(400).json({
          success: false,
          message: "gateway must be 'payu', 'cashfree', or 'razorpay'",
        });
      }

      // Validate the target gateway has .env credentials before switching
      if (gateway === 'cashfree') {
        const { isValid, errors } = gatewayCredentials.validateCashfreeEnv();
        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: `Cashfree credentials are not configured in .env: ${errors.join('; ')}`,
          });
        }
      }

      if (gateway === 'razorpay') {
        const { isValid, errors } = gatewayCredentials.validateRazorpayEnv();
        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: `Razorpay credentials are not configured in .env: ${errors.join('; ')}`,
          });
        }
      }

      if (gateway === 'payu') {
        const { isValid, errors } = gatewayCredentials.validatePayuEnv();
        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: `PayU credentials are not configured in .env: ${errors.join('; ')}`,
          });
        }
      }

      const updated = await PaymentGatewayConfig.switchGateway(gateway);

      console.log(`🔄 Payment gateway switched to [${gateway}] by admin`);

      // Notify all connected admin sockets
      if (global.io) {
        global.io.to('admin-room').emit('gateway-switched', {
          gateway,
          switchedAt: new Date().toISOString(),
          
        });
      }

      return res.status(200).json({
        success: true,
        message: `Payment gateway switched to ${gateway.toUpperCase()}`,
        data: { activeGateway: updated.activeGateway },
      });
    } catch (error) {
      console.error('❌ GatewayAdminController.switchGateway error:', error);
      return res.status(500).json({ success: false, message: 'Failed to switch gateway' });
    }
  }

  // ─── PUT /admin/payment-gateway/cashfree ──────────────────────────────────
  /**
   * Save / update Cashfree credentials in the database.
   * Body: { appId, secretKey, webhookSecret, environment }
   *
   * Sensitive values are stored only if provided (empty string = keep existing).
   */
  async updateCashfreeConfig(req, res) {
    try {
      const { appId, secretKey, webhookSecret, environment } = req.body;

      const allowedEnvs = ['sandbox', 'production'];
      if (environment && !allowedEnvs.includes(environment)) {
        return res.status(400).json({
          success: false,
          message: "environment must be 'sandbox' or 'production'",
        });
      }

      const config = await PaymentGatewayConfig.getConfig();

      // Only overwrite if a non-empty value was provided
      if (appId) config.cashfree.appId = appId.trim();
      if (secretKey) config.cashfree.secretKey = secretKey.trim();
      if (webhookSecret) config.cashfree.webhookSecret = webhookSecret.trim();
      if (environment) config.cashfree.environment = environment;
      config.updatedBy = null;

      await config.save();

      // Runtime credentials always come from .env; re-sync the live service
      gatewayCredentials.validateAndSync('cashfree');

      console.log(`✅ Cashfree config updated by admin`);

      return res.status(200).json({
        success: true,
        message: 'Cashfree configuration updated successfully',
        data: {
          environment: config.cashfree.environment,
          appIdSet: !!config.cashfree.appId,
          secretKeySet: !!config.cashfree.secretKey,
          webhookSecretSet: !!config.cashfree.webhookSecret,
        },
      });
    } catch (error) {
      console.error('❌ GatewayAdminController.updateCashfreeConfig error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update Cashfree config' });
    }
  }

  // ─── PUT /admin/payment-gateway/payu ─────────────────────────────────────
  /**
   * Optionally store PayU credentials in DB (normally they come from .env).
   * Body: { merchantKey, merchantSalt, environment, successUrl, failureUrl }
   */
  async updatePayuConfig(req, res) {
    try {
      const { merchantKey, merchantSalt, environment, successUrl, failureUrl } = req.body;

      const config = await PaymentGatewayConfig.getConfig();

      if (merchantKey) config.payu.merchantKey = merchantKey.trim();
      if (merchantSalt) config.payu.merchantSalt = merchantSalt.trim();
      if (environment) config.payu.environment = environment;
      if (successUrl) config.payu.successUrl = successUrl.trim();
      if (failureUrl) config.payu.failureUrl = failureUrl.trim();
      config.updatedBy = null;

      await config.save();

      console.log(`✅ PayU config updated by admin `);

      return res.status(200).json({
        success: true,
        message: 'PayU configuration updated successfully',
      });
    } catch (error) {
      console.error('❌ GatewayAdminController.updatePayuConfig error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update PayU config' });
    }
  }

  // ─── PUT /admin/payment-gateway/razorpay ─────────────────────────────────
  async updateRazorpayConfig(req, res) {
    try {
      const { keyId, keySecret, webhookSecret, environment } = req.body;
      const allowedEnvs = ['test', 'production'];
      if (environment && !allowedEnvs.includes(environment)) {
        return res.status(400).json({
          success: false,
          message: "environment must be 'test' or 'production'",
        });
      }

      const config = await PaymentGatewayConfig.getConfig();
      if (!config.razorpay) {
        config.razorpay = {
          enabled: false,
          environment: 'production',
          keyId: '',
          keySecret: '',
          webhookSecret: '',
        };
      }
      if (keyId) config.razorpay.keyId = keyId.trim();
      if (keySecret) config.razorpay.keySecret = keySecret.trim();
      if (webhookSecret) config.razorpay.webhookSecret = webhookSecret.trim();
      if (environment) config.razorpay.environment = environment;
      config.updatedBy = null;
      await config.save();

      gatewayCredentials.validateAndSync('razorpay');

      return res.status(200).json({
        success: true,
        message: 'Razorpay configuration updated successfully',
        data: {
          environment: config.razorpay.environment,
          keyIdSet: !!config.razorpay.keyId,
          keySecretSet: !!config.razorpay.keySecret,
          webhookSecretSet: !!config.razorpay.webhookSecret,
        },
      });
    } catch (error) {
      console.error('❌ GatewayAdminController.updateRazorpayConfig error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update Razorpay config' });
    }
  }

  // ─── GET /admin/payment-gateway/active ───────────────────────────────────
  /**
   * Public-ish endpoint (still auth-protected) used by the checkout page
   * to know which gateway to render.  Returns only the gateway name and
   * any non-secret SDK config the frontend needs.
   */
  async getActiveGateway(req, res) {
    try {
      const config = await PaymentGatewayConfig.getConfig();
      const data = { activeGateway: config.activeGateway };

      if (config.activeGateway === 'cashfree') {
        const { credentials } = gatewayCredentials.validateCashfreeEnv();
        data.cashfree = {
          environment: credentials.environment,
        };
      }

      if (config.activeGateway === 'razorpay') {
        const { credentials } = gatewayCredentials.validateRazorpayEnv();
        data.razorpay = {
          environment: credentials.environment,
        };
      }

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('❌ GatewayAdminController.getActiveGateway error:', error);
      // Safe fallback so checkout never breaks
      return res.status(200).json({
        success: true,
        data: { activeGateway: 'payu' },
      });
    }
  }
}

module.exports = new GatewayAdminController();