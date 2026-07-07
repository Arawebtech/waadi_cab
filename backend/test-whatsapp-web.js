#!/usr/bin/env node

const whatsappService = require('./src/services/whatsappService');

async function testWhatsAppWeb() {
  console.log('🧪 Testing WhatsApp Web integration...');
  console.log('=====================================\n');
  
  try {
    // Test initialization
    console.log('1. Testing WhatsApp service initialization...');
    const success = await whatsappService.initialize();
    console.log('   Initialization result:', success ? '✅ Success' : '❌ Failed');
    
    if (success) {
      console.log('2. Checking service status...');
      const status = whatsappService.getStatus();
      console.log('   Status:', {
        isConnected: status.isConnected,
        isReady: status.isReady,
        qrCodeAvailable: !!status.qrCode
      });
      
      if (status.qrCode) {
        console.log('   📱 QR Code available - scan with WhatsApp to connect');
      }
      
      if (status.isReady) {
        console.log('3. Testing message sending...');
        console.log('   ⚠️  Note: This will only work if WhatsApp is connected');
        console.log('   To test message sending, use the admin panel or API endpoints');
      } else {
        console.log('3. WhatsApp not ready yet - waiting for connection...');
        console.log('   Visit:  http://localhost:4001/api/v1/whatsapp/qr-page');
        console.log('   Or use the admin panel to scan QR code');
      }
    }
    
    console.log('\n📋 Available API endpoints:');
    console.log('   GET  /api/v1/whatsapp/status     - Check connection status');
    console.log('   GET  /api/v1/whatsapp/qr         - Get QR code');
    console.log('   GET  /api/v1/whatsapp/qr-page    - Standalone QR page');
    console.log('   POST /api/v1/whatsapp/test       - Send test message');
    console.log('   POST /api/v1/whatsapp/reconnect  - Reconnect service');
    console.log('   POST /api/v1/whatsapp/disconnect - Disconnect service');
    
    console.log('\n🎯 Payment callback URLs:');
    console.log('   Success:  http://localhost:4001/api/v1/payment/success');
    console.log('   Failure:  http://localhost:4001/api/v1/payment/failure');
    
    console.log('\n✅ WhatsApp Web integration test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Keep the process alive for a bit to see any async logs
  setTimeout(() => {
    console.log('\n🔄 Test completed. You can now start the server with: npm start');
    process.exit(0);
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down WhatsApp service...');
  await whatsappService.disconnect();
  process.exit(0);
});

testWhatsAppWeb();
