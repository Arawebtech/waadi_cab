#!/usr/bin/env node

/**
 * PayU Integration Test Script
 * Tests the new PayU payment integration endpoints
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'https://mdk7v2f6-4001.inc1.devtunnels.ms/api/v1';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

// Test data
const testData = {
  // Test hash generation
  hashTest: {
    hashString: 'test_key|test_txnid|100|Border Tax|John Doe|john@example.com|vehicle123|State|Plan|udf4|udf5|udf6|udf7|udf8|udf9|udf10|merchantSalt'
  },
  
  // Test payment verification
  paymentVerification: {
    txnId: 'TEST_TXN_' + Date.now(),
    payuMoneyId: 'PAYU_' + Date.now(),
    status: 'success',
    amount: '100.00',
    bookingData: {
      visitingStateId: '507f1f77bcf86cd799439011', // Replace with actual state ID
      vehicleNumber: 'TEST123',
      vehicleTypeName: 'Car',
      whatsappNumber: '+919876543210',
      entryBorderName: 'Test Border',
      planType: 'Daily',
      fromDate: '2024-01-01',
      uptoDate: '2024-01-31'
    }
  },
  
  // Test hash generation with real format
  realHashTest: {
    txnid: 'TXN_' + Date.now(),
    amount: '100.00',
    productinfo: 'Border Tax - Car',
    firstname: 'John Doe',
    email: 'john@example.com',
    udf1: 'TEST123',
    udf2: 'Test State',
    udf3: 'Daily'
  }
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testHashGeneration() {
  console.log('\n🧪 Testing Hash Generation...');
  
  const result = await makeRequest('POST', '/payment/generate-hash', testData.hashTest);
  
  if (result.success) {
    console.log('✅ Hash generation successful');
    console.log('Hash:', result.data.hash);
    console.log('Message:', result.data.message);
  } else {
    console.log('❌ Hash generation failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testRealHashGeneration() {
  console.log('\n🧪 Testing Real Hash Generation...');
  
  const result = await makeRequest('POST', '/payment/test-hash', testData.realHashTest);
  
  if (result.success) {
    console.log('✅ Real hash generation successful');
    console.log('Hash String:', result.data.data.hashString);
    console.log('Generated Hash:', result.data.data.generatedHash);
    console.log('Expected Format:', result.data.data.expectedFormat);
  } else {
    console.log('❌ Real hash generation failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testPaymentVerification() {
  console.log('\n🧪 Testing Payment Verification...');
  
  const result = await makeRequest('POST', '/payment/verify', testData.paymentVerification);
  
  if (result.success) {
    console.log('✅ Payment verification successful');
    console.log('Booking ID:', result.data.data.bookingId);
    console.log('Payment ID:', result.data.data.paymentId);
    console.log('Status:', result.data.data.status);
  } else {
    console.log('❌ Payment verification failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testPaymentStatus() {
  console.log('\n🧪 Testing Payment Status...');
  
  const txnId = testData.paymentVerification.txnId;
  const result = await makeRequest('GET', `/payment/status/${txnId}`);
  
  if (result.success) {
    console.log('✅ Payment status check successful');
    console.log('Status:', result.data.data.status);
    console.log('Amount:', result.data.data.amount);
  } else {
    console.log('❌ Payment status check failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

async function testPayUConfig() {
  console.log('\n🧪 Testing PayU Configuration...');
  
  const result = await makeRequest('GET', '/payment/test');
  
  if (result.success) {
    console.log('✅ PayU config test successful');
    console.log('Config:', result.data);
  } else {
    console.log('❌ PayU config test failed');
    console.log('Error:', result.error);
    console.log('Status:', result.status);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting PayU Integration Tests...');
  console.log('Base URL:', BASE_URL);
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    await testPayUConfig();
    await testHashGeneration();
    await testRealHashGeneration();
    await testPaymentVerification();
    await testPaymentStatus();
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('⚠️  Please set AUTH_TOKEN in the script before running tests');
    console.log('   You can get a token by logging in through your app');
    process.exit(1);
  }
  
  runTests();
}

module.exports = {
  testHashGeneration,
  testRealHashGeneration,
  testPaymentVerification,
  testPaymentStatus,
  testPayUConfig,
  makeRequest
};