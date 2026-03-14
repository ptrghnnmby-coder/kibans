const http = require('http');

http.get('http://localhost:3000/api/operaciones/026-26/cashflow?forceSync=true', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(data.substring(0, 1000));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
