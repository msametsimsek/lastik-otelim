import http from "node:http";

const PORT = process.env.PORT || 5050;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: "LastikOtelimbackend çalışıyor.",
      service: "lastik-otelim-backend"
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    message: "LastikOtelim Backend API",
    endpoints: ["/health"]
  }));
});

server.listen(PORT, () => {
  console.log(`LastikOtelim backend http://localhost:${PORT} adresinde çalışıyor.`);
});
