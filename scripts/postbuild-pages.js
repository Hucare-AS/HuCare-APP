// Cloudflare Pages 는 dist/404.html 이 있으면 없는 경로에 404 로 응답하고,
// 없으면 SPA 로 보고 index.html(스플래시)을 돌려준다. Expo 가 만든 +not-found.html 을 404.html 로 복사한다.
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
fs.copyFileSync(path.join(dist, '+not-found.html'), path.join(dist, '404.html'));
console.log('dist/404.html 생성');
