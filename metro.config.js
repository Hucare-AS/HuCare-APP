const https = require('node:https');
const http = require('node:http');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

/**
 * 개발 서버 전용 API 프록시: /__api/* → EXPO_PUBLIC_API_URL 의 오리진.
 * 백엔드 CORS 허용 목록에 localhost 가 없어 웹 개발 중에는 같은 오리진으로 우회한다. (src/lib/api.ts)
 */
const apiOrigin = (process.env.EXPO_PUBLIC_API_URL ?? '').match(/^https?:\/\/[^/]+/)?.[0];
const PROXY_PREFIX = '/__api/';

if (apiOrigin) {
  const target = new URL(apiOrigin);
  const client = target.protocol === 'https:' ? https : http;

  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => (req, res, next) => {
      if (!req.url?.startsWith(PROXY_PREFIX)) return middleware(req, res, next);

      const headers = { ...req.headers, host: target.host };
      // 백엔드가 Origin 을 보고 CORS 를 거절하지 않도록 브라우저 출처 정보를 지운다
      delete headers.origin;
      delete headers.referer;

      const upstream = client.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || undefined,
          method: req.method,
          path: req.url.slice(PROXY_PREFIX.length - 1),
          headers,
        },
        (response) => {
          res.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(res);
        },
      );
      upstream.on('error', (error) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'PROXY_ERROR', message: error.message } }));
      });
      req.pipe(upstream);
    },
  };
}

module.exports = withNativeWind(config, { input: './src/global.css' });
