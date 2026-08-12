import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosInstance } from 'axios';

// ─── API Setup ────────────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_URL ?? 'https://api.waadi.in/api/v1';

const api: AxiosInstance = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') ?? sessionStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

type GatewayId = 'payu' | 'cashfree' | 'razorpay';

interface PayUStatus {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  merchantKeySet: boolean;
  merchantSaltSet: boolean;
  envKeySet: boolean;
  envSaltSet: boolean;
  successUrl: string;
  failureUrl: string;
}

interface CashfreeStatus {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  appIdSet: boolean;
  secretKeySet: boolean;
  webhookSecretSet: boolean;
  envAppIdSet: boolean;
  envSecretSet: boolean;
}

interface RazorpayStatus {
  enabled: boolean;
  environment: 'test' | 'production';
  keyIdSet: boolean;
  keySecretSet: boolean;
  webhookSecretSet: boolean;
  envKeyIdSet: boolean;
  envKeySecretSet: boolean;
}

interface GatewayConfig {
  activeGateway: GatewayId;
  payu: PayUStatus;
  cashfree: CashfreeStatus;
  razorpay: RazorpayStatus;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

type TabId = 'switch' | 'cashfree' | 'payu' | 'razorpay';

interface CfForm {
  appId: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

interface PayuForm {
  merchantKey: string;
  merchantSalt: string;
  environment: 'sandbox' | 'production';
  successUrl: string;
  failureUrl: string;
}

interface RzForm {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  environment: 'test' | 'production';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GATEWAY_LABELS: Record<GatewayId, string> = {
  payu: 'PayU',
  cashfree: 'Cashfree',
  razorpay: 'Razorpay',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'switch', label: '🔄 Switch Gateway' },
  { id: 'cashfree', label: '💳 Cashfree Config' },
  { id: 'razorpay', label: '⚡ Razorpay Config' },
  { id: 'payu', label: '💰 PayU Config' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentGatewaySettings(): React.ReactElement {
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [switching, setSwitching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('switch');

  // Gateway pending confirmation (set when the admin clicks a switch,
  // cleared on cancel/confirm). The actual config/active gateway is only
  // ever changed after the admin confirms in the modal.
  const [pendingGateway, setPendingGateway] = useState<GatewayId | null>(
    null
  );

  const [cfForm, setCfForm] = useState<CfForm>({
    appId: '',
    secretKey: '',
    webhookSecret: '',
    environment: 'sandbox',
  });

  const [payuForm, setPayuForm] = useState<PayuForm>({
    merchantKey: '',
    merchantSalt: '',
    environment: 'production',
    successUrl: '',
    failureUrl: '',
  });

  const [rzForm, setRzForm] = useState<RzForm>({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    environment: 'production',
  });

  // ── Load config ─────────────────────────────────────────────────────────────

  const loadConfig = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<GatewayConfig>>(
        '/admin/payment-gateway'
      );
      setConfig(data.data);
      setCfForm((prev) => ({
        ...prev,
        environment: data.data.cashfree?.environment ?? 'sandbox',
      }));
      setPayuForm((prev) => ({
        ...prev,
        environment: data.data.payu?.environment ?? 'production',
        successUrl: data.data.payu?.successUrl ?? '',
        failureUrl: data.data.payu?.failureUrl ?? '',
      }));
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to load gateway configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  // ── Switch gateway ──────────────────────────────────────────────────────────

  // Step 1: admin clicks a gateway card/button — just opens the confirmation
  // modal. Nothing is changed yet.
  const requestSwitch = (gateway: GatewayId): void => {
    if (switching || gateway === config?.activeGateway) return;
    setPendingGateway(gateway);
  };

  // Admin dismisses the modal — status stays exactly as it was.
  const cancelSwitch = (): void => {
    if (switching) return; // don't allow cancel mid-request
    setPendingGateway(null);
  };

  // Step 2: admin confirms in the modal — only now do we hit the API.
  const confirmSwitch = async (): Promise<void> => {
    if (!pendingGateway || switching) return;
    const gateway = pendingGateway;
    const previousGateway = config?.activeGateway ?? null;

    setSwitching(true);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.post<ApiResponse<GatewayConfig>>(
        '/admin/payment-gateway/switch',
        { gateway }
      );
      setSuccessMsg(data.message);
      setPendingGateway(null);
      await loadConfig();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to switch gateway');
      setPendingGateway(null);
      // Revert: re-fetch the authoritative config so the toggle/cards
      // reflect whatever the backend actually has (i.e. the previous
      // state, since the update failed).
      if (previousGateway) {
        await loadConfig();
      }
    } finally {
      setSwitching(false);
    }
  };

  // ── Save Cashfree config ────────────────────────────────────────────────────

  const handleSaveCashfree = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload: Partial<CfForm> = { environment: cfForm.environment };
      if (cfForm.appId.trim()) payload.appId = cfForm.appId.trim();
      if (cfForm.secretKey.trim()) payload.secretKey = cfForm.secretKey.trim();
      if (cfForm.webhookSecret.trim())
        payload.webhookSecret = cfForm.webhookSecret.trim();

      const { data } = await api.put<ApiResponse<GatewayConfig>>(
        '/admin/payment-gateway/cashfree',
        payload
      );
      setSuccessMsg(data.message);
      setCfForm((prev) => ({ ...prev, secretKey: '', webhookSecret: '' }));
      await loadConfig();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to save Cashfree config');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRazorpay = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload: Partial<RzForm> = { environment: rzForm.environment };
      if (rzForm.keyId.trim()) payload.keyId = rzForm.keyId.trim();
      if (rzForm.keySecret.trim()) payload.keySecret = rzForm.keySecret.trim();
      if (rzForm.webhookSecret.trim())
        payload.webhookSecret = rzForm.webhookSecret.trim();

      const { data } = await api.put<ApiResponse<GatewayConfig>>(
        '/admin/payment-gateway/razorpay',
        payload
      );
      setSuccessMsg(data.message);
      setRzForm((prev) => ({ ...prev, keySecret: '', webhookSecret: '' }));
      await loadConfig();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(msg ?? 'Failed to save Razorpay config');
    } finally {
      setSaving(false);
    }
  };

  // ── Save PayU config ────────────────────────────────────────────────────────

  const handleSavePayU = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload: Partial<PayuForm> = {
        environment: payuForm.environment,
      };
      if (payuForm.merchantKey.trim())
        payload.merchantKey = payuForm.merchantKey.trim();
      if (payuForm.merchantSalt.trim())
        payload.merchantSalt = payuForm.merchantSalt.trim();
      if (payuForm.successUrl.trim())
        payload.successUrl = payuForm.successUrl.trim();
      if (payuForm.failureUrl.trim())
        payload.failureUrl = payuForm.failureUrl.trim();

      const { data } = await api.put<ApiResponse<GatewayConfig>>(
        '/admin/payment-gateway/payu',
        payload
      );
      setSuccessMsg(data.message);
      setPayuForm((prev) => ({ ...prev, merchantKey: '', merchantSalt: '' }));
      await loadConfig();
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to save PayU config');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const dismissAlert = (): void => {
    setError('');
    setSuccessMsg('');
  };

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingBox}>
          <style>{spinKeyframes}</style>
          <div style={styles.spinner} />
          <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
            Loading gateway settings…
          </p>
        </div>
      </div>
    );
  }

  // Guard: config should be set by now, but protect against unexpected null
  if (!config) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingBox}>
          <p style={{ color: '#991b1b', fontSize: 14 }}>
            ⚠️ Could not load configuration. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  const active = config.activeGateway;

  return (
    <div style={styles.page}>
      <style>{spinKeyframes}</style>

      <div style={styles.card}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Payment Gateway Settings</h1>
            <p style={styles.subtitle}>
              Control which payment gateway processes customer transactions.
              Only one gateway can be active at a time.
            </p>
          </div>
          <div style={styles.activeBadge}>
            <span style={styles.activeDot} />
            Active: <strong>{GATEWAY_LABELS[active]}</strong>
          </div>
        </div>

        {/* ── Alerts ────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ ...styles.alert, ...styles.alertError }}>
            <span>⚠️ {error}</span>
            <button
              style={styles.alertClose}
              onClick={dismissAlert}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div style={{ ...styles.alert, ...styles.alertSuccess }}>
            <span>✅ {successMsg}</span>
            <button
              style={styles.alertClose}
              onClick={dismissAlert}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div style={styles.tabs} role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              style={{
                ...styles.tab,
                ...(activeTab === id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: SWITCH
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'switch' && (
          <div style={styles.tabContent}>
            <p style={styles.sectionNote}>
              Click a gateway card to make it the active payment processor.
              All new customer transactions will use the selected gateway
              immediately.
            </p>

            <div style={styles.gatewayGrid}>
              <GatewayCard
                id="payu"
                label="PayU"
                description="India's most trusted payment gateway. Supports UPI, cards, netbanking, and wallets."
                icon="💰"
                isActive={active === 'payu'}
                credentialStatus={{
                  'Env Key': config.payu?.envKeySet ?? false,
                  'Env Salt': config.payu?.envSaltSet ?? false,
                  'DB Key override': config.payu?.merchantKeySet ?? false,
                }}
                environment={config.payu?.environment}
                onSelect={() => requestSwitch('payu')}
                loading={switching}
                warning=""
              />

              <GatewayCard
                id="cashfree"
                label="Cashfree"
                description="Fast settlements, UPI Autopay, EMI, pay-later. SDK-based checkout."
                icon="💳"
                isActive={active === 'cashfree'}
                credentialStatus={{
                  'App ID':
                    (config.cashfree?.appIdSet ?? false) ||
                    (config.cashfree?.envAppIdSet ?? false),
                  'Secret Key':
                    (config.cashfree?.secretKeySet ?? false) ||
                    (config.cashfree?.envSecretSet ?? false),
                  'Webhook Secret': config.cashfree?.webhookSecretSet ?? false,
                }}
                environment={config.cashfree?.environment}
                onSelect={() => requestSwitch('cashfree')}
                loading={switching}
                warning={
                  !config.cashfree?.appIdSet && !config.cashfree?.envAppIdSet
                    ? 'Configure credentials before switching'
                    : ''
                }
              />

              <GatewayCard
                id="razorpay"
                label="Razorpay"
                description="UPI, cards, wallets, and netbanking with Razorpay Checkout."
                icon="⚡"
                isActive={active === 'razorpay'}
                credentialStatus={{
                  'Key ID':
                    (config.razorpay?.keyIdSet ?? false) ||
                    (config.razorpay?.envKeyIdSet ?? false),
                  'Key Secret':
                    (config.razorpay?.keySecretSet ?? false) ||
                    (config.razorpay?.envKeySecretSet ?? false),
                  'Webhook Secret': config.razorpay?.webhookSecretSet ?? false,
                }}
                environment={config.razorpay?.environment}
                onSelect={() => requestSwitch('razorpay')}
                loading={switching}
                warning={
                  !config.razorpay?.keyIdSet && !config.razorpay?.envKeyIdSet
                    ? 'Configure credentials before switching'
                    : ''
                }
              />
            </div>

            <div style={styles.infoBox}>
              <strong>ℹ️ How switching works</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>The switch takes effect immediately for all new payments.</li>
                <li>
                  In-flight transactions on the previous gateway complete
                  normally.
                </li>
                <li>No code deployments or server restarts are needed.</li>
                <li>
                  Configure each gateway's credentials in the tabs above before
                  switching.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: CASHFREE CONFIG
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'cashfree' && (
          <div style={styles.tabContent}>
            <p style={styles.sectionNote}>
              Enter your Cashfree credentials. Secret fields are write-only —
              existing values are never returned to the browser. Leave a field
              blank to keep its current value.
            </p>

            <form onSubmit={(e) => void handleSaveCashfree(e)} noValidate>
              <FormRow label="Environment" required>
                <select
                  style={styles.select}
                  value={cfForm.environment}
                  onChange={(e) =>
                    setCfForm({
                      ...cfForm,
                      environment: e.target.value as 'sandbox' | 'production',
                    })
                  }
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </FormRow>

              <FormRow
                label="App ID"
                hint="From Cashfree Dashboard → Developers → API Keys"
              >
                <input
                  style={styles.input}
                  placeholder={
                    config.cashfree?.appIdSet
                      ? '••••••  (already set)'
                      : 'Enter App ID'
                  }
                  value={cfForm.appId}
                  onChange={(e) =>
                    setCfForm({ ...cfForm, appId: e.target.value })
                  }
                  autoComplete="off"
                />
              </FormRow>

              <FormRow
                label="Secret Key"
                hint="Keep this private — never expose in frontend code"
              >
                <input
                  style={styles.input}
                  type="password"
                  placeholder={
                    config.cashfree?.secretKeySet
                      ? '••••••  (already set)'
                      : 'Enter Secret Key'
                  }
                  value={cfForm.secretKey}
                  onChange={(e) =>
                    setCfForm({ ...cfForm, secretKey: e.target.value })
                  }
                  autoComplete="new-password"
                />
              </FormRow>

              <FormRow
                label="Webhook Secret"
                hint="Used to verify Cashfree webhook signatures"
              >
                <input
                  style={styles.input}
                  type="password"
                  placeholder={
                    config.cashfree?.webhookSecretSet
                      ? '••••••  (already set)'
                      : 'Enter Webhook Secret'
                  }
                  value={cfForm.webhookSecret}
                  onChange={(e) =>
                    setCfForm({ ...cfForm, webhookSecret: e.target.value })
                  }
                  autoComplete="new-password"
                />
              </FormRow>

              <div style={styles.formFooter}>
                <StatusDot
                  label="App ID"
                  isSet={
                    (config.cashfree?.appIdSet ?? false) ||
                    (config.cashfree?.envAppIdSet ?? false)
                  }
                />
                <StatusDot
                  label="Secret"
                  isSet={
                    (config.cashfree?.secretKeySet ?? false) ||
                    (config.cashfree?.envSecretSet ?? false)
                  }
                />
                <StatusDot
                  label="Webhook"
                  isSet={config.cashfree?.webhookSecretSet ?? false}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimary,
                    ...(saving ? styles.btnDisabled : {}),
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Cashfree Config'}
                </button>
              </div>
            </form>

            <div style={{ ...styles.infoBox, marginTop: 20 }}>
              <strong>📋 Cashfree Setup Steps</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>
                  Sign up at{' '}
                  <a
                    href="https://merchant.cashfree.com"
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    merchant.cashfree.com
                  </a>
                </li>
                <li>
                  Go to Developers → API Keys → copy App ID and Secret Key
                </li>
                <li>
                  Under Webhooks, add your server URL:{' '}
                  <code style={styles.code}>
                    /api/v1/payment/cashfree/webhook
                  </code>
                </li>
                <li>Copy the Webhook Secret shown there</li>
                <li>
                  Install the Cashfree JS SDK on your checkout page (see
                  Checkout Component)
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: RAZORPAY CONFIG
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'razorpay' && (
          <div style={styles.tabContent}>
            <p style={styles.sectionNote}>
              Enter your Razorpay credentials. Runtime credentials come from{' '}
              <code style={styles.code}>.env</code> — DB values are metadata only.
            </p>

            <form onSubmit={(e) => void handleSaveRazorpay(e)} noValidate>
              <FormRow label="Environment" required>
                <select
                  style={styles.select}
                  value={rzForm.environment}
                  onChange={(e) =>
                    setRzForm({
                      ...rzForm,
                      environment: e.target.value as 'test' | 'production',
                    })
                  }
                >
                  <option value="test">Test (Sandbox)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </FormRow>

              <FormRow label="Key ID" hint="From Razorpay Dashboard → API Keys">
                <input
                  style={styles.input}
                  placeholder={
                    config.razorpay?.keyIdSet ? '••••••  (already set)' : 'Enter Key ID'
                  }
                  value={rzForm.keyId}
                  onChange={(e) => setRzForm({ ...rzForm, keyId: e.target.value })}
                  autoComplete="off"
                />
              </FormRow>

              <FormRow label="Key Secret" hint="Keep this private">
                <input
                  style={styles.input}
                  type="password"
                  placeholder={
                    config.razorpay?.keySecretSet
                      ? '••••••  (already set)'
                      : 'Enter Key Secret'
                  }
                  value={rzForm.keySecret}
                  onChange={(e) => setRzForm({ ...rzForm, keySecret: e.target.value })}
                  autoComplete="new-password"
                />
              </FormRow>

              <FormRow label="Webhook Secret" hint="Used to verify Razorpay webhook signatures">
                <input
                  style={styles.input}
                  type="password"
                  placeholder={
                    config.razorpay?.webhookSecretSet
                      ? '••••••  (already set)'
                      : 'Enter Webhook Secret'
                  }
                  value={rzForm.webhookSecret}
                  onChange={(e) =>
                    setRzForm({ ...rzForm, webhookSecret: e.target.value })
                  }
                  autoComplete="new-password"
                />
              </FormRow>

              <div style={styles.formFooter}>
                <StatusDot
                  label="Key ID"
                  isSet={
                    (config.razorpay?.keyIdSet ?? false) ||
                    (config.razorpay?.envKeyIdSet ?? false)
                  }
                />
                <StatusDot
                  label="Secret"
                  isSet={
                    (config.razorpay?.keySecretSet ?? false) ||
                    (config.razorpay?.envKeySecretSet ?? false)
                  }
                />
                <StatusDot
                  label="Webhook"
                  isSet={config.razorpay?.webhookSecretSet ?? false}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimary,
                    ...(saving ? styles.btnDisabled : {}),
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Razorpay Config'}
                </button>
              </div>
            </form>

            <div style={{ ...styles.infoBox, marginTop: 20 }}>
              <strong>📋 Razorpay Setup Steps</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>
                  Sign up at{' '}
                  <a
                    href="https://dashboard.razorpay.com"
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    dashboard.razorpay.com
                  </a>
                </li>
                <li>Go to Settings → API Keys → copy Key ID and Key Secret</li>
                <li>
                  Add webhook URL:{' '}
                  <code style={styles.code}>/api/v1/payment/razorpay/webhook</code>
                </li>
                <li>Enable events: payment.captured, payment.failed</li>
                <li>
                  Set <code style={styles.code}>RAZORPAY_KEY_ID</code> and{' '}
                  <code style={styles.code}>RAZORPAY_KEY_SECRET</code> in server{' '}
                  <code style={styles.code}>.env</code>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: PAYU CONFIG
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payu' && (
          <div style={styles.tabContent}>
            <p style={styles.sectionNote}>
              PayU credentials are normally set via <code style={styles.code}>.env</code>{' '}
              variables on your server. You can optionally store overrides here
              — DB values take priority over <code style={styles.code}>.env</code>.
            </p>

            <form onSubmit={(e) => void handleSavePayU(e)} noValidate>
              <FormRow label="Environment">
                <select
                  style={styles.select}
                  value={payuForm.environment}
                  onChange={(e) =>
                    setPayuForm({
                      ...payuForm,
                      environment: e.target.value as 'sandbox' | 'production',
                    })
                  }
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </FormRow>

              <FormRow label="Merchant Key" hint="optional override">
                <input
                  style={styles.input}
                  placeholder={
                    config.payu?.merchantKeySet
                      ? '••••  (DB override set)'
                      : config.payu?.envKeySet
                      ? 'Using .env value'
                      : 'Enter Merchant Key'
                  }
                  value={payuForm.merchantKey}
                  onChange={(e) =>
                    setPayuForm({ ...payuForm, merchantKey: e.target.value })
                  }
                  autoComplete="off"
                />
              </FormRow>

              <FormRow label="Merchant Salt" hint="optional override">
                <input
                  style={styles.input}
                  type="password"
                  placeholder={
                    config.payu?.merchantSaltSet
                      ? '••••  (DB override set)'
                      : config.payu?.envSaltSet
                      ? 'Using .env value'
                      : 'Enter Merchant Salt'
                  }
                  value={payuForm.merchantSalt}
                  onChange={(e) =>
                    setPayuForm({ ...payuForm, merchantSalt: e.target.value })
                  }
                  autoComplete="new-password"
                />
              </FormRow>

              <FormRow label="Success URL">
                <input
                  style={styles.input}
                  placeholder="https://yourdomain.com/api/v1/payment/success"
                  value={payuForm.successUrl}
                  onChange={(e) =>
                    setPayuForm({ ...payuForm, successUrl: e.target.value })
                  }
                />
              </FormRow>

              <FormRow label="Failure URL">
                <input
                  style={styles.input}
                  placeholder="https://yourdomain.com/api/v1/payment/failure"
                  value={payuForm.failureUrl}
                  onChange={(e) =>
                    setPayuForm({ ...payuForm, failureUrl: e.target.value })
                  }
                />
              </FormRow>

              <div style={styles.formFooter}>
                <StatusDot
                  label="Env Key"
                  isSet={config.payu?.envKeySet ?? false}
                />
                <StatusDot
                  label="Env Salt"
                  isSet={config.payu?.envSaltSet ?? false}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.btnPrimary,
                    ...(saving ? styles.btnDisabled : {}),
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save PayU Config'}
                </button>
              </div>
            </form>

            <div style={{ ...styles.infoBox, marginTop: 20 }}>
              <strong>📋 PayU Setup Steps</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>
                  Log in at{' '}
                  <a
                    href="https://onboarding.payu.in"
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    onboarding.payu.in
                  </a>
                </li>
                <li>
                  Go to Payment Gateway → My Account to find your Merchant Key
                  and Salt
                </li>
                <li>
                  Set <code style={styles.code}>PAYU_MERCHANT_KEY</code> and{' '}
                  <code style={styles.code}>PAYU_MERCHANT_SALT</code> in your
                  server <code style={styles.code}>.env</code>
                </li>
                <li>
                  Use the Success / Failure URL fields to override the default
                  redirect targets
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {pendingGateway && (
        <ConfirmSwitchModal
          gatewayLabel={GATEWAY_LABELS[pendingGateway]}
          loading={switching}
          onCancel={cancelSwitch}
          onConfirm={() => void confirmSwitch()}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GatewayCardProps {
  id: GatewayId;
  label: string;
  description: string;
  icon: string;
  isActive: boolean;
  credentialStatus: Record<string, boolean>;
  environment?: 'sandbox' | 'production' | 'test';
  onSelect: () => void;
  loading: boolean;
  warning: string;
}

function GatewayCard({
  label,
  description,
  icon,
  isActive,
  credentialStatus,
  environment,
  onSelect,
  loading,
  warning,
}: GatewayCardProps): React.ReactElement {
  return (
    <div
      style={{
        ...styles.gwCard,
        ...(isActive ? styles.gwCardActive : {}),
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={isActive}
    >
      <div style={styles.gwCardHeader}>
        <span style={styles.gwIcon}>{icon}</span>
        <div>
          <div style={styles.gwLabel}>{label}</div>
          <div style={styles.gwEnv}>
            {environment ?? 'not configured'}
          </div>
        </div>
        {isActive && (
          <span style={styles.activePill}>● ACTIVE</span>
        )}
      </div>

      <p style={styles.gwDesc}>{description}</p>

      <div style={styles.gwCredentials}>
        {Object.entries(credentialStatus).map(([key, isSet]) => (
          <span
            key={key}
            style={{
              ...styles.credChip,
              ...(isSet ? styles.credChipGood : styles.credChipBad),
            }}
          >
            {isSet ? '✓' : '✗'} {key}
          </span>
        ))}
      </div>

      {warning && <div style={styles.gwWarning}>⚠️ {warning}</div>}

      {!isActive && (
        <button
          style={{
            ...styles.btnSwitch,
            ...(loading ? { opacity: 0.6 } : {}),
          }}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {loading ? 'Switching…' : `Switch to ${label}`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmSwitchModalProps {
  gatewayLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmSwitchModal({
  gatewayLabel,
  loading,
  onCancel,
  onConfirm,
}: ConfirmSwitchModalProps): React.ReactElement {
  return (
    <div
      style={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-switch-title"
      onClick={() => !loading && onCancel()}
    >
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-switch-title" style={styles.modalTitle}>
          Confirm Payment Gateway Change
        </h2>
        <p style={styles.modalMessage}>
          Are you sure you want to activate <strong>{gatewayLabel}</strong>?
          This will make it the active payment method for users.
        </p>
        <div style={styles.modalFooter}>
          <button
            style={{
              ...styles.btnSecondary,
              ...(loading ? styles.btnDisabled : {}),
            }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              marginLeft: 0,
              ...(loading ? styles.btnDisabled : {}),
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Yes, Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────


interface FormRowProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function FormRow({
  label,
  required,
  hint,
  children,
}: FormRowProps): React.ReactElement {
  return (
    <div style={styles.formRow}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
        {hint && (
          <span style={styles.hint}> — {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface StatusDotProps {
  label: string;
  isSet: boolean;
}

function StatusDot({ label, isSet }: StatusDotProps): React.ReactElement {
  return (
    <span
      style={{
        fontSize: 13,
        color: isSet ? '#16a34a' : '#9ca3af',
        marginRight: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {isSet ? '✅' : '○'} {label}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const spinKeyframes = `
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) {
  .pgw-header { flex-direction: column !important; }
  .pgw-tabs { overflow-x: auto; }
  .pgw-tab-content { padding: 20px 16px !important; }
  .pgw-gateway-grid { grid-template-columns: 1fr !important; }
}
`;

type StyleMap = Record<string, React.CSSProperties>;

const styles: StyleMap = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    padding: '32px 16px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    boxSizing: 'border-box',
  },
  card: {
    maxWidth: 860,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '28px 32px 20px',
    borderBottom: '1px solid #f3f4f6',
    gap: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: '#111827',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: '6px 0 0',
    maxWidth: 480,
    lineHeight: 1.5,
  },
  activeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 14,
    color: '#166534',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#16a34a',
    display: 'inline-block',
    flexShrink: 0,
  },
  alert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    fontSize: 14,
    borderBottom: '1px solid transparent',
  },
  alertError: {
    background: '#fef2f2',
    borderColor: '#fecaca',
    color: '#991b1b',
  },
  alertSuccess: {
    background: '#f0fdf4',
    borderColor: '#bbf7d0',
    color: '#166534',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    opacity: 0.6,
    padding: '0 4px',
    lineHeight: 1,
    color: 'inherit',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
    overflowX: 'auto',
  },
  tab: {
    padding: '14px 18px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 500,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    fontWeight: 600,
  },
  tabContent: {
    padding: '28px 32px',
  },
  sectionNote: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 0,
    marginBottom: 24,
    lineHeight: 1.6,
  },
  gatewayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginBottom: 28,
  },
  gwCard: {
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    background: '#fff',
    outline: 'none',
  },
  gwCardActive: {
    borderColor: '#16a34a',
    background: '#f0fdf4',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.08)',
  },
  gwCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  gwIcon: {
    fontSize: 28,
    flexShrink: 0,
  },
  gwLabel: {
    fontWeight: 700,
    fontSize: 16,
    color: '#111827',
  },
  gwEnv: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  activePill: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: 700,
    color: '#16a34a',
    background: '#dcfce7',
    borderRadius: 999,
    padding: '3px 10px',
    whiteSpace: 'nowrap',
  },
  gwDesc: {
    fontSize: 13,
    color: '#4b5563',
    margin: '0 0 14px',
    lineHeight: 1.5,
  },
  gwCredentials: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  credChip: {
    fontSize: 11,
    borderRadius: 4,
    padding: '3px 8px',
    fontWeight: 500,
  },
  credChipGood: {
    background: '#dcfce7',
    color: '#166534',
  },
  credChipBad: {
    background: '#fef2f2',
    color: '#991b1b',
  },
  gwWarning: {
    fontSize: 12,
    color: '#92400e',
    background: '#fef3c7',
    borderRadius: 6,
    padding: '6px 10px',
    marginBottom: 12,
  },
  btnSwitch: {
    width: '100%',
    padding: '10px 0',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  infoBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 20px',
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.7,
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  hint: {
    fontWeight: 400,
    color: '#9ca3af',
    fontSize: 13,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    color: '#111827',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    background: '#fff',
    color: '#111827',
    appearance: 'auto',
  },
  formFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTop: '1px solid #f3f4f6',
    marginTop: 8,
  },
  btnPrimary: {
    marginLeft: 'auto',
    padding: '10px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s, opacity 0.15s',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(17, 24, 39, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modalBox: {
    background: '#fff',
    borderRadius: 14,
    padding: '24px 28px',
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 12px',
  },
  modalMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnSecondary: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s, opacity 0.15s',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  code: {
    background: '#f1f5f9',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: 12,
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
    color: '#0f172a',
  },
};

// import React, { useState, useEffect, useCallback } from 'react';
// import axios, { AxiosInstance } from 'axios';

// // ─── API Setup ────────────────────────────────────────────────────────────────

// const API_BASE = process.env.REACT_APP_API_URL ?? 'https://api.waadi.in/api/v1';

// const api: AxiosInstance = axios.create({ baseURL: API_BASE, withCredentials: true });

// api.interceptors.request.use((config) => {
//   const token =
//     localStorage.getItem('token') ?? sessionStorage.getItem('token');
//   if (token && config.headers) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // ─── Types ────────────────────────────────────────────────────────────────────

// type GatewayId = 'payu' | 'cashfree';

// interface PayUStatus {
//   enabled: boolean;
//   environment: 'sandbox' | 'production';
//   merchantKeySet: boolean;
//   merchantSaltSet: boolean;
//   envKeySet: boolean;
//   envSaltSet: boolean;
//   successUrl: string;
//   failureUrl: string;
// }

// interface CashfreeStatus {
//   enabled: boolean;
//   environment: 'sandbox' | 'production';
//   appIdSet: boolean;
//   secretKeySet: boolean;
//   webhookSecretSet: boolean;
//   envAppIdSet: boolean;
//   envSecretSet: boolean;
// }

// interface GatewayConfig {
//   activeGateway: GatewayId;
//   payu: PayUStatus;
//   cashfree: CashfreeStatus;
// }

// interface ApiResponse<T> {
//   data: T;
//   message: string;
// }

// type TabId = 'switch' | 'cashfree' | 'payu';

// interface CfForm {
//   appId: string;
//   secretKey: string;
//   webhookSecret: string;
//   environment: 'sandbox' | 'production';
// }

// interface PayuForm {
//   merchantKey: string;
//   merchantSalt: string;
//   environment: 'sandbox' | 'production';
//   successUrl: string;
//   failureUrl: string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const GATEWAY_LABELS: Record<GatewayId, string> = {
//   payu: 'PayU',
//   cashfree: 'Cashfree',
// };

// const TABS: { id: TabId; label: string }[] = [
//   { id: 'switch', label: '🔄 Switch Gateway' },
//   { id: 'cashfree', label: '💳 Cashfree Config' },
//   { id: 'payu', label: '💰 PayU Config' },
// ];

// // ─── Main Component ───────────────────────────────────────────────────────────

// export default function PaymentGatewaySettings(): React.ReactElement {
//   const [config, setConfig] = useState<GatewayConfig | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [saving, setSaving] = useState<boolean>(false);
//   const [switching, setSwitching] = useState<boolean>(false);
//   const [error, setError] = useState<string>('');
//   const [successMsg, setSuccessMsg] = useState<string>('');
//   const [activeTab, setActiveTab] = useState<TabId>('switch');

//   const [cfForm, setCfForm] = useState<CfForm>({
//     appId: '',
//     secretKey: '',
//     webhookSecret: '',
//     environment: 'sandbox',
//   });

//   const [payuForm, setPayuForm] = useState<PayuForm>({
//     merchantKey: '',
//     merchantSalt: '',
//     environment: 'production',
//     successUrl: '',
//     failureUrl: '',
//   });

//   // ── Load config ─────────────────────────────────────────────────────────────

//   const loadConfig = useCallback(async (): Promise<void> => {
//     setLoading(true);
//     setError('');
//     try {
//       const { data } = await api.get<ApiResponse<GatewayConfig>>(
//         '/admin/payment-gateway'
//       );
//       setConfig(data.data);
//       setCfForm((prev) => ({
//         ...prev,
//         environment: data.data.cashfree?.environment ?? 'sandbox',
//       }));
//       setPayuForm((prev) => ({
//         ...prev,
//         environment: data.data.payu?.environment ?? 'production',
//         successUrl: data.data.payu?.successUrl ?? '',
//         failureUrl: data.data.payu?.failureUrl ?? '',
//       }));
//     } catch (err: unknown) {
//       const msg =
//         axios.isAxiosError(err)
//           ? err.response?.data?.message
//           : undefined;
//       setError(msg ?? 'Failed to load gateway configuration');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     void loadConfig();
//   }, [loadConfig]);

//   // ── Switch gateway ──────────────────────────────────────────────────────────

//   const handleSwitch = async (gateway: GatewayId): Promise<void> => {
//     if (switching || gateway === config?.activeGateway) return;
//     setSwitching(true);
//     setError('');
//     setSuccessMsg('');
//     try {
//       const { data } = await api.post<ApiResponse<GatewayConfig>>(
//         '/admin/payment-gateway/switch',
//         { gateway }
//       );
//       setSuccessMsg(data.message);
//       await loadConfig();
//     } catch (err: unknown) {
//       const msg =
//         axios.isAxiosError(err)
//           ? err.response?.data?.message
//           : undefined;
//       setError(msg ?? 'Failed to switch gateway');
//     } finally {
//       setSwitching(false);
//     }
//   };

//   // ── Save Cashfree config ────────────────────────────────────────────────────

//   const handleSaveCashfree = async (
//     e: React.FormEvent<HTMLFormElement>
//   ): Promise<void> => {
//     e.preventDefault();
//     setSaving(true);
//     setError('');
//     setSuccessMsg('');
//     try {
//       const payload: Partial<CfForm> = { environment: cfForm.environment };
//       if (cfForm.appId.trim()) payload.appId = cfForm.appId.trim();
//       if (cfForm.secretKey.trim()) payload.secretKey = cfForm.secretKey.trim();
//       if (cfForm.webhookSecret.trim())
//         payload.webhookSecret = cfForm.webhookSecret.trim();

//       const { data } = await api.put<ApiResponse<GatewayConfig>>(
//         '/admin/payment-gateway/cashfree',
//         payload
//       );
//       setSuccessMsg(data.message);
//       setCfForm((prev) => ({ ...prev, secretKey: '', webhookSecret: '' }));
//       await loadConfig();
//     } catch (err: unknown) {
//       const msg =
//         axios.isAxiosError(err)
//           ? err.response?.data?.message
//           : undefined;
//       setError(msg ?? 'Failed to save Cashfree config');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ── Save PayU config ────────────────────────────────────────────────────────

//   const handleSavePayU = async (
//     e: React.FormEvent<HTMLFormElement>
//   ): Promise<void> => {
//     e.preventDefault();
//     setSaving(true);
//     setError('');
//     setSuccessMsg('');
//     try {
//       const payload: Partial<PayuForm> = {
//         environment: payuForm.environment,
//       };
//       if (payuForm.merchantKey.trim())
//         payload.merchantKey = payuForm.merchantKey.trim();
//       if (payuForm.merchantSalt.trim())
//         payload.merchantSalt = payuForm.merchantSalt.trim();
//       if (payuForm.successUrl.trim())
//         payload.successUrl = payuForm.successUrl.trim();
//       if (payuForm.failureUrl.trim())
//         payload.failureUrl = payuForm.failureUrl.trim();

//       const { data } = await api.put<ApiResponse<GatewayConfig>>(
//         '/admin/payment-gateway/payu',
//         payload
//       );
//       setSuccessMsg(data.message);
//       setPayuForm((prev) => ({ ...prev, merchantKey: '', merchantSalt: '' }));
//       await loadConfig();
//     } catch (err: unknown) {
//       const msg =
//         axios.isAxiosError(err)
//           ? err.response?.data?.message
//           : undefined;
//       setError(msg ?? 'Failed to save PayU config');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ── Helpers ─────────────────────────────────────────────────────────────────

//   const dismissAlert = (): void => {
//     setError('');
//     setSuccessMsg('');
//   };

//   // ── Loading state ───────────────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <div style={styles.page}>
//         <div style={styles.loadingBox}>
//           <style>{spinKeyframes}</style>
//           <div style={styles.spinner} />
//           <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
//             Loading gateway settings…
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Guard: config should be set by now, but protect against unexpected null
//   if (!config) {
//     return (
//       <div style={styles.page}>
//         <div style={styles.loadingBox}>
//           <p style={{ color: '#991b1b', fontSize: 14 }}>
//             ⚠️ Could not load configuration. Please refresh the page.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const active = config.activeGateway;

//   return (
//     <div style={styles.page}>
//       <style>{spinKeyframes}</style>

//       <div style={styles.card}>
//         {/* ── Header ────────────────────────────────────────────────────────── */}
//         <div style={styles.header}>
//           <div>
//             <h1 style={styles.title}>Payment Gateway Settings</h1>
//             <p style={styles.subtitle}>
//               Control which payment gateway processes customer transactions.
//               Only one gateway can be active at a time.
//             </p>
//           </div>
//           <div style={styles.activeBadge}>
//             <span style={styles.activeDot} />
//             Active: <strong>{GATEWAY_LABELS[active]}</strong>
//           </div>
//         </div>

//         {/* ── Alerts ────────────────────────────────────────────────────────── */}
//         {error && (
//           <div style={{ ...styles.alert, ...styles.alertError }}>
//             <span>⚠️ {error}</span>
//             <button
//               style={styles.alertClose}
//               onClick={dismissAlert}
//               aria-label="Dismiss error"
//             >
//               ✕
//             </button>
//           </div>
//         )}
//         {successMsg && (
//           <div style={{ ...styles.alert, ...styles.alertSuccess }}>
//             <span>✅ {successMsg}</span>
//             <button
//               style={styles.alertClose}
//               onClick={dismissAlert}
//               aria-label="Dismiss message"
//             >
//               ✕
//             </button>
//           </div>
//         )}

//         {/* ── Tabs ──────────────────────────────────────────────────────────── */}
//         <div style={styles.tabs} role="tablist">
//           {TABS.map(({ id, label }) => (
//             <button
//               key={id}
//               role="tab"
//               aria-selected={activeTab === id}
//               style={{
//                 ...styles.tab,
//                 ...(activeTab === id ? styles.tabActive : {}),
//               }}
//               onClick={() => setActiveTab(id)}
//             >
//               {label}
//             </button>
//           ))}
//         </div>

//         {/* ════════════════════════════════════════════════════════════════════
//             TAB: SWITCH
//         ════════════════════════════════════════════════════════════════════ */}
//         {activeTab === 'switch' && (
//           <div style={styles.tabContent}>
//             <p style={styles.sectionNote}>
//               Click a gateway card to make it the active payment processor.
//               All new customer transactions will use the selected gateway
//               immediately.
//             </p>

//             <div style={styles.gatewayGrid}>
//               <GatewayCard
//                 id="payu"
//                 label="PayU"
//                 description="India's most trusted payment gateway. Supports UPI, cards, netbanking, and wallets."
//                 icon="💰"
//                 isActive={active === 'payu'}
//                 credentialStatus={{
//                   'Env Key': config.payu?.envKeySet ?? false,
//                   'Env Salt': config.payu?.envSaltSet ?? false,
//                   'DB Key override': config.payu?.merchantKeySet ?? false,
//                 }}
//                 environment={config.payu?.environment}
//                 onSelect={() => void handleSwitch('payu')}
//                 loading={switching}
//                 warning=""
//               />

//               <GatewayCard
//                 id="cashfree"
//                 label="Cashfree"
//                 description="Fast settlements, UPI Autopay, EMI, pay-later. SDK-based checkout."
//                 icon="💳"
//                 isActive={active === 'cashfree'}
//                 credentialStatus={{
//                   'App ID':
//                     (config.cashfree?.appIdSet ?? false) ||
//                     (config.cashfree?.envAppIdSet ?? false),
//                   'Secret Key':
//                     (config.cashfree?.secretKeySet ?? false) ||
//                     (config.cashfree?.envSecretSet ?? false),
//                   'Webhook Secret': config.cashfree?.webhookSecretSet ?? false,
//                 }}
//                 environment={config.cashfree?.environment}
//                 onSelect={() => void handleSwitch('cashfree')}
//                 loading={switching}
//                 warning={
//                   !config.cashfree?.appIdSet && !config.cashfree?.envAppIdSet
//                     ? 'Configure credentials before switching'
//                     : ''
//                 }
//               />
//             </div>

//             <div style={styles.infoBox}>
//               <strong>ℹ️ How switching works</strong>
//               <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
//                 <li>The switch takes effect immediately for all new payments.</li>
//                 <li>
//                   In-flight transactions on the previous gateway complete
//                   normally.
//                 </li>
//                 <li>No code deployments or server restarts are needed.</li>
//                 <li>
//                   Configure each gateway's credentials in the tabs above before
//                   switching.
//                 </li>
//               </ul>
//             </div>
//           </div>
//         )}

//         {/* ════════════════════════════════════════════════════════════════════
//             TAB: CASHFREE CONFIG
//         ════════════════════════════════════════════════════════════════════ */}
//         {activeTab === 'cashfree' && (
//           <div style={styles.tabContent}>
//             <p style={styles.sectionNote}>
//               Enter your Cashfree credentials. Secret fields are write-only —
//               existing values are never returned to the browser. Leave a field
//               blank to keep its current value.
//             </p>

//             <form onSubmit={(e) => void handleSaveCashfree(e)} noValidate>
//               <FormRow label="Environment" required>
//                 <select
//                   style={styles.select}
//                   value={cfForm.environment}
//                   onChange={(e) =>
//                     setCfForm({
//                       ...cfForm,
//                       environment: e.target.value as 'sandbox' | 'production',
//                     })
//                   }
//                 >
//                   <option value="sandbox">Sandbox (Testing)</option>
//                   <option value="production">Production (Live)</option>
//                 </select>
//               </FormRow>

//               <FormRow
//                 label="App ID"
//                 hint="From Cashfree Dashboard → Developers → API Keys"
//               >
//                 <input
//                   style={styles.input}
//                   placeholder={
//                     config.cashfree?.appIdSet
//                       ? '••••••  (already set)'
//                       : 'Enter App ID'
//                   }
//                   value={cfForm.appId}
//                   onChange={(e) =>
//                     setCfForm({ ...cfForm, appId: e.target.value })
//                   }
//                   autoComplete="off"
//                 />
//               </FormRow>

//               <FormRow
//                 label="Secret Key"
//                 hint="Keep this private — never expose in frontend code"
//               >
//                 <input
//                   style={styles.input}
//                   type="password"
//                   placeholder={
//                     config.cashfree?.secretKeySet
//                       ? '••••••  (already set)'
//                       : 'Enter Secret Key'
//                   }
//                   value={cfForm.secretKey}
//                   onChange={(e) =>
//                     setCfForm({ ...cfForm, secretKey: e.target.value })
//                   }
//                   autoComplete="new-password"
//                 />
//               </FormRow>

//               <FormRow
//                 label="Webhook Secret"
//                 hint="Used to verify Cashfree webhook signatures"
//               >
//                 <input
//                   style={styles.input}
//                   type="password"
//                   placeholder={
//                     config.cashfree?.webhookSecretSet
//                       ? '••••••  (already set)'
//                       : 'Enter Webhook Secret'
//                   }
//                   value={cfForm.webhookSecret}
//                   onChange={(e) =>
//                     setCfForm({ ...cfForm, webhookSecret: e.target.value })
//                   }
//                   autoComplete="new-password"
//                 />
//               </FormRow>

//               <div style={styles.formFooter}>
//                 <StatusDot
//                   label="App ID"
//                   isSet={
//                     (config.cashfree?.appIdSet ?? false) ||
//                     (config.cashfree?.envAppIdSet ?? false)
//                   }
//                 />
//                 <StatusDot
//                   label="Secret"
//                   isSet={
//                     (config.cashfree?.secretKeySet ?? false) ||
//                     (config.cashfree?.envSecretSet ?? false)
//                   }
//                 />
//                 <StatusDot
//                   label="Webhook"
//                   isSet={config.cashfree?.webhookSecretSet ?? false}
//                 />
//                 <button
//                   type="submit"
//                   style={{
//                     ...styles.btnPrimary,
//                     ...(saving ? styles.btnDisabled : {}),
//                   }}
//                   disabled={saving}
//                 >
//                   {saving ? 'Saving…' : 'Save Cashfree Config'}
//                 </button>
//               </div>
//             </form>

//             <div style={{ ...styles.infoBox, marginTop: 20 }}>
//               <strong>📋 Cashfree Setup Steps</strong>
//               <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
//                 <li>
//                   Sign up at{' '}
//                   <a
//                     href="https://merchant.cashfree.com"
//                     target="_blank"
//                     rel="noreferrer"
//                     style={styles.link}
//                   >
//                     merchant.cashfree.com
//                   </a>
//                 </li>
//                 <li>
//                   Go to Developers → API Keys → copy App ID and Secret Key
//                 </li>
//                 <li>
//                   Under Webhooks, add your server URL:{' '}
//                   <code style={styles.code}>
//                     /api/v1/payment/cashfree/webhook
//                   </code>
//                 </li>
//                 <li>Copy the Webhook Secret shown there</li>
//                 <li>
//                   Install the Cashfree JS SDK on your checkout page (see
//                   Checkout Component)
//                 </li>
//               </ol>
//             </div>
//           </div>
//         )}

//         {/* ════════════════════════════════════════════════════════════════════
//             TAB: PAYU CONFIG
//         ════════════════════════════════════════════════════════════════════ */}
//         {activeTab === 'payu' && (
//           <div style={styles.tabContent}>
//             <p style={styles.sectionNote}>
//               PayU credentials are normally set via <code style={styles.code}>.env</code>{' '}
//               variables on your server. You can optionally store overrides here
//               — DB values take priority over <code style={styles.code}>.env</code>.
//             </p>

//             <form onSubmit={(e) => void handleSavePayU(e)} noValidate>
//               <FormRow label="Environment">
//                 <select
//                   style={styles.select}
//                   value={payuForm.environment}
//                   onChange={(e) =>
//                     setPayuForm({
//                       ...payuForm,
//                       environment: e.target.value as 'sandbox' | 'production',
//                     })
//                   }
//                 >
//                   <option value="sandbox">Sandbox (Testing)</option>
//                   <option value="production">Production (Live)</option>
//                 </select>
//               </FormRow>

//               <FormRow label="Merchant Key" hint="optional override">
//                 <input
//                   style={styles.input}
//                   placeholder={
//                     config.payu?.merchantKeySet
//                       ? '••••  (DB override set)'
//                       : config.payu?.envKeySet
//                       ? 'Using .env value'
//                       : 'Enter Merchant Key'
//                   }
//                   value={payuForm.merchantKey}
//                   onChange={(e) =>
//                     setPayuForm({ ...payuForm, merchantKey: e.target.value })
//                   }
//                   autoComplete="off"
//                 />
//               </FormRow>

//               <FormRow label="Merchant Salt" hint="optional override">
//                 <input
//                   style={styles.input}
//                   type="password"
//                   placeholder={
//                     config.payu?.merchantSaltSet
//                       ? '••••  (DB override set)'
//                       : config.payu?.envSaltSet
//                       ? 'Using .env value'
//                       : 'Enter Merchant Salt'
//                   }
//                   value={payuForm.merchantSalt}
//                   onChange={(e) =>
//                     setPayuForm({ ...payuForm, merchantSalt: e.target.value })
//                   }
//                   autoComplete="new-password"
//                 />
//               </FormRow>

//               <FormRow label="Success URL">
//                 <input
//                   style={styles.input}
//                   placeholder="https://yourdomain.com/api/v1/payment/success"
//                   value={payuForm.successUrl}
//                   onChange={(e) =>
//                     setPayuForm({ ...payuForm, successUrl: e.target.value })
//                   }
//                 />
//               </FormRow>

//               <FormRow label="Failure URL">
//                 <input
//                   style={styles.input}
//                   placeholder="https://yourdomain.com/api/v1/payment/failure"
//                   value={payuForm.failureUrl}
//                   onChange={(e) =>
//                     setPayuForm({ ...payuForm, failureUrl: e.target.value })
//                   }
//                 />
//               </FormRow>

//               <div style={styles.formFooter}>
//                 <StatusDot
//                   label="Env Key"
//                   isSet={config.payu?.envKeySet ?? false}
//                 />
//                 <StatusDot
//                   label="Env Salt"
//                   isSet={config.payu?.envSaltSet ?? false}
//                 />
//                 <button
//                   type="submit"
//                   style={{
//                     ...styles.btnPrimary,
//                     ...(saving ? styles.btnDisabled : {}),
//                   }}
//                   disabled={saving}
//                 >
//                   {saving ? 'Saving…' : 'Save PayU Config'}
//                 </button>
//               </div>
//             </form>

//             <div style={{ ...styles.infoBox, marginTop: 20 }}>
//               <strong>📋 PayU Setup Steps</strong>
//               <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
//                 <li>
//                   Log in at{' '}
//                   <a
//                     href="https://onboarding.payu.in"
//                     target="_blank"
//                     rel="noreferrer"
//                     style={styles.link}
//                   >
//                     onboarding.payu.in
//                   </a>
//                 </li>
//                 <li>
//                   Go to Payment Gateway → My Account to find your Merchant Key
//                   and Salt
//                 </li>
//                 <li>
//                   Set <code style={styles.code}>PAYU_MERCHANT_KEY</code> and{' '}
//                   <code style={styles.code}>PAYU_MERCHANT_SALT</code> in your
//                   server <code style={styles.code}>.env</code>
//                 </li>
//                 <li>
//                   Use the Success / Failure URL fields to override the default
//                   redirect targets
//                 </li>
//               </ol>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// interface GatewayCardProps {
//   id: GatewayId;
//   label: string;
//   description: string;
//   icon: string;
//   isActive: boolean;
//   credentialStatus: Record<string, boolean>;
//   environment?: 'sandbox' | 'production';
//   onSelect: () => void;
//   loading: boolean;
//   warning: string;
// }

// function GatewayCard({
//   label,
//   description,
//   icon,
//   isActive,
//   credentialStatus,
//   environment,
//   onSelect,
//   loading,
//   warning,
// }: GatewayCardProps): React.ReactElement {
//   return (
//     <div
//       style={{
//         ...styles.gwCard,
//         ...(isActive ? styles.gwCardActive : {}),
//         cursor: loading ? 'wait' : 'pointer',
//         opacity: loading ? 0.7 : 1,
//       }}
//       onClick={onSelect}
//       role="button"
//       tabIndex={0}
//       onKeyDown={(e) => e.key === 'Enter' && onSelect()}
//       aria-pressed={isActive}
//     >
//       <div style={styles.gwCardHeader}>
//         <span style={styles.gwIcon}>{icon}</span>
//         <div>
//           <div style={styles.gwLabel}>{label}</div>
//           <div style={styles.gwEnv}>
//             {environment ?? 'not configured'}
//           </div>
//         </div>
//         {isActive && (
//           <span style={styles.activePill}>● ACTIVE</span>
//         )}
//       </div>

//       <p style={styles.gwDesc}>{description}</p>

//       <div style={styles.gwCredentials}>
//         {Object.entries(credentialStatus).map(([key, isSet]) => (
//           <span
//             key={key}
//             style={{
//               ...styles.credChip,
//               ...(isSet ? styles.credChipGood : styles.credChipBad),
//             }}
//           >
//             {isSet ? '✓' : '✗'} {key}
//           </span>
//         ))}
//       </div>

//       {warning && <div style={styles.gwWarning}>⚠️ {warning}</div>}

//       {!isActive && (
//         <button
//           style={{
//             ...styles.btnSwitch,
//             ...(loading ? { opacity: 0.6 } : {}),
//           }}
//           disabled={loading}
//           onClick={(e) => {
//             e.stopPropagation();
//             onSelect();
//           }}
//         >
//           {loading ? 'Switching…' : `Switch to ${label}`}
//         </button>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────

// interface FormRowProps {
//   label: string;
//   required?: boolean;
//   hint?: string;
//   children: React.ReactNode;
// }

// function FormRow({
//   label,
//   required,
//   hint,
//   children,
// }: FormRowProps): React.ReactElement {
//   return (
//     <div style={styles.formRow}>
//       <label style={styles.label}>
//         {label}
//         {required && <span style={{ color: '#ef4444' }}> *</span>}
//         {hint && (
//           <span style={styles.hint}> — {hint}</span>
//         )}
//       </label>
//       {children}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────

// interface StatusDotProps {
//   label: string;
//   isSet: boolean;
// }

// function StatusDot({ label, isSet }: StatusDotProps): React.ReactElement {
//   return (
//     <span
//       style={{
//         fontSize: 13,
//         color: isSet ? '#16a34a' : '#9ca3af',
//         marginRight: 12,
//         display: 'inline-flex',
//         alignItems: 'center',
//         gap: 4,
//       }}
//     >
//       {isSet ? '✅' : '○'} {label}
//     </span>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────

// const spinKeyframes = `
// @keyframes spin { to { transform: rotate(360deg); } }
// @media (max-width: 600px) {
//   .pgw-header { flex-direction: column !important; }
//   .pgw-tabs { overflow-x: auto; }
//   .pgw-tab-content { padding: 20px 16px !important; }
//   .pgw-gateway-grid { grid-template-columns: 1fr !important; }
// }
// `;

// type StyleMap = Record<string, React.CSSProperties>;

// const styles: StyleMap = {
//   page: {
//     minHeight: '100vh',
//     background: '#f9fafb',
//     padding: '32px 16px',
//     fontFamily:
//       "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
//     boxSizing: 'border-box',
//   },
//   card: {
//     maxWidth: 860,
//     margin: '0 auto',
//     background: '#fff',
//     borderRadius: 16,
//     boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.04)',
//     overflow: 'hidden',
//   },
//   header: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     padding: '28px 32px 20px',
//     borderBottom: '1px solid #f3f4f6',
//     gap: 16,
//     flexWrap: 'wrap',
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 700,
//     margin: 0,
//     color: '#111827',
//     letterSpacing: '-0.3px',
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#6b7280',
//     margin: '6px 0 0',
//     maxWidth: 480,
//     lineHeight: 1.5,
//   },
//   activeBadge: {
//     display: 'flex',
//     alignItems: 'center',
//     gap: 8,
//     background: '#f0fdf4',
//     border: '1px solid #bbf7d0',
//     borderRadius: 999,
//     padding: '6px 14px',
//     fontSize: 14,
//     color: '#166534',
//     whiteSpace: 'nowrap',
//     flexShrink: 0,
//   },
//   activeDot: {
//     width: 8,
//     height: 8,
//     borderRadius: '50%',
//     background: '#16a34a',
//     display: 'inline-block',
//     flexShrink: 0,
//   },
//   alert: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: '12px 24px',
//     fontSize: 14,
//     borderBottom: '1px solid transparent',
//   },
//   alertError: {
//     background: '#fef2f2',
//     borderColor: '#fecaca',
//     color: '#991b1b',
//   },
//   alertSuccess: {
//     background: '#f0fdf4',
//     borderColor: '#bbf7d0',
//     color: '#166534',
//   },
//   alertClose: {
//     background: 'none',
//     border: 'none',
//     cursor: 'pointer',
//     fontSize: 16,
//     opacity: 0.6,
//     padding: '0 4px',
//     lineHeight: 1,
//     color: 'inherit',
//   },
//   tabs: {
//     display: 'flex',
//     borderBottom: '1px solid #e5e7eb',
//     padding: '0 24px',
//     overflowX: 'auto',
//   },
//   tab: {
//     padding: '14px 18px',
//     background: 'none',
//     border: 'none',
//     borderBottom: '2px solid transparent',
//     cursor: 'pointer',
//     fontSize: 14,
//     color: '#6b7280',
//     fontWeight: 500,
//     transition: 'color 0.15s, border-color 0.15s',
//     whiteSpace: 'nowrap',
//   },
//   tabActive: {
//     color: '#2563eb',
//     borderBottomColor: '#2563eb',
//     fontWeight: 600,
//   },
//   tabContent: {
//     padding: '28px 32px',
//   },
//   sectionNote: {
//     fontSize: 14,
//     color: '#6b7280',
//     marginTop: 0,
//     marginBottom: 24,
//     lineHeight: 1.6,
//   },
//   gatewayGrid: {
//     display: 'grid',
//     gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
//     gap: 20,
//     marginBottom: 28,
//   },
//   gwCard: {
//     border: '2px solid #e5e7eb',
//     borderRadius: 12,
//     padding: 20,
//     transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
//     background: '#fff',
//     outline: 'none',
//   },
//   gwCardActive: {
//     borderColor: '#16a34a',
//     background: '#f0fdf4',
//     boxShadow: '0 0 0 3px rgba(22,163,74,0.08)',
//   },
//   gwCardHeader: {
//     display: 'flex',
//     alignItems: 'center',
//     gap: 12,
//     marginBottom: 10,
//   },
//   gwIcon: {
//     fontSize: 28,
//     flexShrink: 0,
//   },
//   gwLabel: {
//     fontWeight: 700,
//     fontSize: 16,
//     color: '#111827',
//   },
//   gwEnv: {
//     fontSize: 12,
//     color: '#6b7280',
//     textTransform: 'capitalize',
//     marginTop: 2,
//   },
//   activePill: {
//     marginLeft: 'auto',
//     fontSize: 11,
//     fontWeight: 700,
//     color: '#16a34a',
//     background: '#dcfce7',
//     borderRadius: 999,
//     padding: '3px 10px',
//     whiteSpace: 'nowrap',
//   },
//   gwDesc: {
//     fontSize: 13,
//     color: '#4b5563',
//     margin: '0 0 14px',
//     lineHeight: 1.5,
//   },
//   gwCredentials: {
//     display: 'flex',
//     flexWrap: 'wrap',
//     gap: 6,
//     marginBottom: 16,
//   },
//   credChip: {
//     fontSize: 11,
//     borderRadius: 4,
//     padding: '3px 8px',
//     fontWeight: 500,
//   },
//   credChipGood: {
//     background: '#dcfce7',
//     color: '#166534',
//   },
//   credChipBad: {
//     background: '#fef2f2',
//     color: '#991b1b',
//   },
//   gwWarning: {
//     fontSize: 12,
//     color: '#92400e',
//     background: '#fef3c7',
//     borderRadius: 6,
//     padding: '6px 10px',
//     marginBottom: 12,
//   },
//   btnSwitch: {
//     width: '100%',
//     padding: '10px 0',
//     background: '#2563eb',
//     color: '#fff',
//     border: 'none',
//     borderRadius: 8,
//     fontWeight: 600,
//     fontSize: 14,
//     cursor: 'pointer',
//     transition: 'background 0.15s',
//   },
//   infoBox: {
//     background: '#f8fafc',
//     border: '1px solid #e2e8f0',
//     borderRadius: 10,
//     padding: '16px 20px',
//     fontSize: 13,
//     color: '#334155',
//     lineHeight: 1.7,
//   },
//   formRow: {
//     marginBottom: 20,
//   },
//   label: {
//     display: 'block',
//     fontSize: 14,
//     fontWeight: 600,
//     color: '#374151',
//     marginBottom: 6,
//   },
//   hint: {
//     fontWeight: 400,
//     color: '#9ca3af',
//     fontSize: 13,
//   },
//   input: {
//     width: '100%',
//     padding: '10px 14px',
//     border: '1px solid #d1d5db',
//     borderRadius: 8,
//     fontSize: 14,
//     boxSizing: 'border-box',
//     outline: 'none',
//     transition: 'border-color 0.15s, box-shadow 0.15s',
//     color: '#111827',
//   },
//   select: {
//     width: '100%',
//     padding: '10px 14px',
//     border: '1px solid #d1d5db',
//     borderRadius: 8,
//     fontSize: 14,
//     boxSizing: 'border-box',
//     background: '#fff',
//     color: '#111827',
//     appearance: 'auto',
//   },
//   formFooter: {
//     display: 'flex',
//     alignItems: 'center',
//     gap: 8,
//     flexWrap: 'wrap',
//     paddingTop: 16,
//     borderTop: '1px solid #f3f4f6',
//     marginTop: 8,
//   },
//   btnPrimary: {
//     marginLeft: 'auto',
//     padding: '10px 24px',
//     background: '#2563eb',
//     color: '#fff',
//     border: 'none',
//     borderRadius: 8,
//     fontWeight: 600,
//     fontSize: 14,
//     cursor: 'pointer',
//     transition: 'background 0.15s, opacity 0.15s',
//   },
//   btnDisabled: {
//     opacity: 0.6,
//     cursor: 'not-allowed',
//   },
//   loadingBox: {
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: 300,
//   },
//   spinner: {
//     width: 36,
//     height: 36,
//     border: '3px solid #e5e7eb',
//     borderTop: '3px solid #2563eb',
//     borderRadius: '50%',
//     animation: 'spin 0.8s linear infinite',
//   },
//   link: {
//     color: '#2563eb',
//     textDecoration: 'underline',
//   },
//   code: {
//     background: '#f1f5f9',
//     borderRadius: 4,
//     padding: '1px 6px',
//     fontSize: 12,
//     fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
//     color: '#0f172a',
//   },
// };