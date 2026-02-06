const http = require('http');

// Simple script to test GET /api/produtos/1

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/produtos/1',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
    // Add auth header if needed, but endpoint might be public or token handled in app.
    // Let's check products.routes.js to see if it requires auth.
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
