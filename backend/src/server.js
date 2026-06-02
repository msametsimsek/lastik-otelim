import http from "node:http";

const PORT = process.env.PORT || 5050;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      message: "LastikTakip backend çalışıyor.",
      service: "lastik-takip-backend"
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    success: true,
    message: "LastikTakip Backend API",
    endpoints: ["/health"]
  }));
});

server.listen(PORT, () => {
  console.log(`LastikTakip backend http://localhost:${PORT} adresinde çalışıyor.`);
});
