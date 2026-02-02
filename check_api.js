const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/turnos',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
    // Note: This will likely fail with 401 Unauthorized if I don't provide a token, 
    // but 401 is better than 404 (Rota não encontrada).
    // If it returns 404, it means the route is not registered.
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
