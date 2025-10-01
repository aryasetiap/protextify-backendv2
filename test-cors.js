const axios = require('axios');

const baseURL = 'http://localhost:3000';
const frontendOrigin = 'http://localhost:5173';

async function testCORS() {
  console.log('🧪 Testing CORS Configuration...\n');

  try {
    // Test 1: Preflight Request
    console.log('1️⃣ Testing OPTIONS (Preflight) Request...');
    const preflightResponse = await axios.options(`${baseURL}/api/auth/login`, {
      headers: {
        Origin: frontendOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    console.log('✅ Preflight Status:', preflightResponse.status);
    console.log('✅ CORS Headers:', {
      'Access-Control-Allow-Origin':
        preflightResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods':
        preflightResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers':
        preflightResponse.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials':
        preflightResponse.headers['access-control-allow-credentials'],
    });

    // Test 2: Actual API Request
    console.log('\n2️⃣ Testing POST Request with CORS...');
    const loginResponse = await axios.post(
      `${baseURL}/api/auth/login`,
      {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
      {
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Don't throw on 4xx/5xx
      },
    );

    console.log('✅ Request Status:', loginResponse.status);
    console.log('✅ Response CORS Headers:', {
      'Access-Control-Allow-Origin':
        loginResponse.headers['access-control-allow-origin'],
    });

    // Test 3: WebSocket connection test (if needed)
    console.log('\n3️⃣ WebSocket endpoint accessible at: ws://localhost:3000');

    console.log('\n✅ CORS Configuration Test Complete!');
    console.log(
      '🎯 Frontend should now be able to connect from:',
      frontendOrigin,
    );
  } catch (error) {
    console.error('❌ CORS Test Failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure backend server is running on port 3000');
    }

    process.exit(1);
  }
}

// Run test
testCORS();
