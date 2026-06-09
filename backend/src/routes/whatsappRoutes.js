const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// GET /whatsapp/status - Get WhatsApp service status
router.get('/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp service status',
      data: {
        isConnected: status.isConnected,
        isReady: status.isReady,
        qrCodeAvailable: !!status.qrCode,
        lastStatus: status.lastStatus,
        pid: process.pid,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('❌ Error getting WhatsApp status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp status',
      error: error.message
    });
  }
});

// POST /whatsapp/reconnect - Reconnect WhatsApp service
router.post('/reconnect', async (req, res) => {
  try {
    console.log('🔄 Attempting to reconnect WhatsApp service...');
    
    // Disconnect first if connected
    if (whatsappService.isConnected) {
      await whatsappService.disconnect();
    }
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = await whatsappService.initialize();
    
    res.status(200).json({
      success: true,
      message: success ? 'WhatsApp service reconnected successfully' : 'Failed to reconnect WhatsApp service',
      data: {
        isConnected: whatsappService.isConnected,
        isReady: whatsappService.isReady
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp reconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reconnect WhatsApp service',
      error: error.message
    });
  }
});

// POST /whatsapp/disconnect - Disconnect WhatsApp service
router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp service disconnected successfully',
      data: {
        isConnected: whatsappService.isConnected,
        isReady: whatsappService.isReady
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp disconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect WhatsApp service',
      error: error.message
    });
  }
});

// GET /whatsapp/qr - Get QR code for WhatsApp connection
router.get('/qr', (req, res) => {
  try {
    const qrCode = whatsappService.getQRCode();
    const status = whatsappService.getStatus();
    
    if (status.isConnected && status.isReady) {
      return res.status(200).json({
        success: true,
        message: 'WhatsApp already connected',
        data: {
          qrCode: null,
          connected: true,
          isReady: true
        }
      });
    }
    
    if (qrCode) {
      return res.status(200).json({
        success: true,
        message: 'QR code retrieved successfully',
        data: {
          qrCode: qrCode,
          connected: false,
          isReady: false
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Waiting for QR code...',
      data: {
        qrCode: null,
        connected: false,
        isReady: false
      }
    });
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get QR code',
      error: error.message
    });
  }
});

// POST /whatsapp/test - Send test message
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!whatsappService.isReady) {
      return res.status(503).json({
        success: false,
        message: 'WhatsApp service not ready'
      });
    }

    const testMessage = message || '🧪 This is a test message from Wadi Cab WhatsApp Bot!';
    
    const result = await whatsappService.sendMessage(phoneNumber, testMessage);
    
    res.status(200).json({
      success: true,
      message: result ? 'Test message sent successfully' : 'Failed to send test message',
      data: {
        phoneNumber: phoneNumber,
        message: testMessage,
        sent: result
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message',
      error: error.message
    });
  }
});

// GET /whatsapp/qr-page - Standalone HTML page to show QR
router.get('/qr-page', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const qrApi = `${req.baseUrl.replace(/\/$/, '')}/qr`;
  res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wadi Cab - WhatsApp QR</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}
  .wrap{max-width:680px;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
  .row{display:flex;gap:16px;align-items:center}
  .qr{display:flex;align-items:center;justify-content:center;width:300px;height:300px;border:2px dashed #94a3b8;border-radius:12px;background:#f1f5f9}
  img{max-width:100%;max-height:100%}
  .muted{color:#475569;font-size:14px}
  .ok{color:#16a34a}
  .warn{color:#ca8a04}
</style>
</head>
<body>
  <div class="wrap">
    <h2>WhatsApp QR</h2>
    <p class="muted">Keep this tab open and scan the QR with WhatsApp → Linked Devices.</p>
    <div class="row">
      <div class="qr"><img id="qr" alt="QR will appear here" /></div>
      <div>
        <div id="status">Initializing…</div>
        <ul class="muted">
          <li>This page auto-initializes the WhatsApp session if needed.</li>
          <li>It refreshes every 2 seconds until connected.</li>
        </ul>
        <button id="refresh">Refresh now</button>
      </div>
    </div>
  </div>
<script>
  const statusEl = document.getElementById('status');
  const img = document.getElementById('qr');
  const endpoint = (function(){
    const p = window.location.pathname;
    return p.endsWith('/qr-page') ? p.replace('/qr-page','/qr') : '${qrApi}';
  })();
  async function poll(){
    try{
      const res = await fetch(endpoint, { cache: 'no-store' });
      const j = await res.json();
      const d = j.data || {}; 
      if(d.connected){
        statusEl.textContent = 'Connected to WhatsApp (you can close this tab).';
        statusEl.className = 'ok';
        return;
      }
      if(d.qrCode){
        img.src = 'data:image/png;base64,' + d.qrCode;
        statusEl.textContent = 'Scan this QR with WhatsApp → Linked Devices';
        statusEl.className = '';
      }else{
        statusEl.textContent = 'Waiting for QR from WhatsApp…';
        statusEl.className = 'warn';
      }
    }catch(e){
      statusEl.textContent = 'Error fetching QR. Retrying…';
      statusEl.className = 'warn';
    }
  }
  document.getElementById('refresh').addEventListener('click', poll);
  poll();
  setInterval(poll, 2000);
</script>
</body>
</html>`);
});

module.exports = router;
