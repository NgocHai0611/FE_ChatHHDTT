const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    createProxyMiddleware("/v1/auth", {
      // Định tuyến tất cả các yêu cầu có `/api` tới backend
      target: "http://localhost:8003",
      changeOrigin: true,
    })
  );
};