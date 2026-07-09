// Shared API URL helper for static HTML debug pages.
// Override via ?apiHost=https://api.waadi.in or localStorage.waadi_api_host
(function (global) {
  function normalizeApiHost(raw) {
    var fallback = 'https://api.waadi.in';
    var trimmed = (raw || fallback).trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/api/v1')) {
      trimmed = trimmed.slice(0, -'/api/v1'.length).replace(/\/+$/, '');
    }
    return trimmed;
  }

  function resolveApiHost() {
    if (!global.location) return '';
    var params = new URLSearchParams(global.location.search || '');
    return params.get('apiHost') || (global.localStorage && global.localStorage.getItem('waadi_api_host')) || '';
  }

  var apiHost = normalizeApiHost(resolveApiHost());
  global.WAADI_API_HOST = apiHost;
  global.WAADI_API_BASE = apiHost + '/api/v1';
})(typeof window !== 'undefined' ? window : globalThis);
