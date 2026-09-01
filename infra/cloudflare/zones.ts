import { zoneList, zones } from './config.js';
import { manageZone, manageZones } from './resources.js';

const zonePair = manageZones(zoneList);
const boluoChat = manageZone(zones.boluoChat);
const boluochatCom = manageZone(zones.boluochatCom);

zonePair.zones();

// Primary application routing shared by both zones.
zonePair.dnsRecord('a-production', ({ hostname, select }) => ({
  comment: select({ boluo_chat: 'fly.io mythal', boluochat_com: undefined }),
  content: '213.188.203.68',
  name: hostname('production'),
  type: 'A',
}));
zonePair.dnsRecord('aaaa-production', ({ hostname }) => ({
  content: '2a09:8280:61::74:cd59:0',
  name: hostname('production'),
  type: 'AAAA',
}));
zonePair.dnsRecord('cname-fly', ({ hostname }) => ({
  content: 'boluo-server.fly.dev',
  name: hostname('fly'),
  type: 'CNAME',
}));
zonePair.dnsRecord('cname-apex', ({ hostname, select }) => ({
  comment: select({
    boluo_chat: '[boluo-infra production] Managed by Pulumi',
    boluochat_com: undefined,
  }),
  content: 'production.boluo.chat',
  name: hostname(),
  proxied: true,
  type: 'CNAME',
}));
zonePair.dnsRecord('cname-cdn', ({ hostname, select }) => ({
  comment: select({ boluo_chat: 'Cloudflare', boluochat_com: undefined }),
  content: 'production.boluo.chat',
  name: hostname('cdn'),
  proxied: true,
  type: 'CNAME',
}));

// Regional ingress and numbered proxy routes across both zones.
zonePair.dnsRecord('a-hkg', ({ hostname }) => ({
  content: '154.12.176.184',
  name: hostname('hkg'),
  type: 'A',
}));
zonePair.dnsRecord('cname-proxy-0', ({ hostname, select }) => ({
  comment: select({ boluo_chat: undefined, boluochat_com: 'Direct' }),
  content: hostname('production'),
  name: hostname('proxy-0'),
  proxied: true,
  type: 'CNAME',
}));
zonePair.dnsRecord('a-proxy-1', ({ hostname, select }) => ({
  comment: select({
    boluo_chat: 'CloudIPLC HK-CMI KVM 512M',
    boluochat_com: 'CloudIPLC',
  }),
  content: '5.253.16.32',
  name: hostname('proxy-1'),
  type: 'A',
}));
zonePair.dnsRecord('aaaa-proxy-2', ({ hostname, select }) => ({
  comment: select({ boluo_chat: 'fly.io hkg', boluochat_com: 'Fly.io HK' }),
  content: '2a09:8280:58::74:cd59:0',
  name: hostname('proxy-2'),
  type: 'AAAA',
}));
zonePair.dnsRecord('aaaa-proxy-3', ({ hostname, select }) => ({
  comment: select({
    boluo_chat: 'fly.io sin',
    boluochat_com: 'fly.io singapore',
  }),
  content: '2a09:8280:66::74:cd59:0',
  name: hostname('proxy-3'),
  type: 'AAAA',
}));
zonePair.dnsRecord('a-proxy-4', ({ hostname }) => ({
  comment: 'DMIT Perilla',
  content: '154.12.191.152',
  name: hostname('proxy-4'),
  type: 'A',
}));
boluoChat.dnsRecord('aaaa-proxy-4', {
  comment: 'DMIT HKG.EB.WEEv2 suoh',
  content: '2403:18c0:3:90:f06a:50ff:fea1:37a2',
  name: 'proxy-4.boluo.chat',
  type: 'AAAA',
});
zonePair.dnsRecord('cname-proxy-5', ({ hostname, select }) => ({
  comment: select({ boluo_chat: 'fly.io Anycast', boluochat_com: undefined }),
  content: 'boluo-server.fly.dev',
  name: hostname('proxy-5'),
  type: 'CNAME',
}));
zonePair.dnsRecord('a-proxy-6', ({ hostname }) => ({
  comment: '星尘的镜像线路',
  content: '82.157.156.141',
  name: hostname('proxy-6'),
  type: 'A',
}));
zonePair.dnsRecord('a-proxy-7', ({ hostname }) => ({
  comment: '叉烧的DMIT反向代理',
  content: '103.135.248.108',
  name: hostname('proxy-7'),
  type: 'A',
}));

// Fly.io certificate validation records.
zonePair.dnsRecord('cname-acme-challenge', ({ hostname, zone }) => ({
  content: `${zone.name}.j850y0.flydns.net`,
  name: hostname('_acme-challenge'),
  type: 'CNAME',
}));
zonePair.dnsRecord('cname-acme-challenge-site', ({ hostname, select }) => ({
  comment: select({ boluo_chat: 'fly.io certs', boluochat_com: undefined }),
  content: `${hostname('site')}.k9moyg.flydns.net`,
  name: hostname('_acme-challenge.site'),
  type: 'CNAME',
}));
boluoChat.dnsRecord('cname-acme-challenge-fly', {
  content: 'fly.boluo.chat.j850y0.flydns.net',
  name: '_acme-challenge.fly.boluo.chat',
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-acme-challenge-next', {
  comment: 'fly.io certs',
  content: 'next.boluo.chat.k9moyg.flydns.net',
  name: '_acme-challenge.next.boluo.chat',
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-acme-challenge-production', {
  content: 'production.boluo.chat.j850y0.flydns.net',
  name: '_acme-challenge.production.boluo.chat',
  type: 'CNAME',
});
boluochatCom.dnsRecord('cname-acme-challenge-proxy-0', {
  content: 'proxy-0.boluochat.com.j850y0.flydns.net',
  name: '_acme-challenge.proxy-0.boluochat.com',
  type: 'CNAME',
});

// Application frontends and media across both zones.
zonePair.dnsRecord('aaaa-app', ({ hostname }) => ({
  content: '100::',
  name: hostname('app'),
  proxied: true,
  type: 'AAAA',
}));
boluochatCom.dnsRecord('cname-app-master', {
  content: 'master.boluo-app.pages.dev',
  name: 'app-master.boluochat.com',
  proxied: true,
  type: 'CNAME',
});
boluochatCom.dnsRecord('cname-app-preview', {
  content: 'preview.boluo-app.pages.dev',
  name: 'app-preview.boluochat.com',
  proxied: true,
  type: 'CNAME',
});
zonePair.dnsRecord('aaaa-next', ({ hostname }) => ({
  content: '100::',
  name: hostname('next'),
  proxied: true,
  type: 'AAAA',
}));
zonePair.dnsRecord('cname-old-master', ({ hostname }) => ({
  content: 'master.boluo-legacy.pages.dev',
  name: hostname('old-master'),
  proxied: true,
  type: 'CNAME',
}));
zonePair.dnsRecord('cname-old-preview', ({ hostname }) => ({
  content: 'preview.boluo-legacy.pages.dev',
  name: hostname('old-preview'),
  proxied: true,
  type: 'CNAME',
}));
zonePair.dnsRecord('aaaa-site', ({ hostname }) => ({
  content: '100::',
  name: hostname('site'),
  proxied: true,
  type: 'AAAA',
}));
zonePair.dnsRecord('cname-legacy', ({ hostname, select }) => ({
  comment: select({
    boluo_chat: 'Cloudflare Pages',
    boluochat_com: undefined,
  }),
  content: 'boluo-legacy.pages.dev',
  name: hostname('legacy'),
  proxied: true,
  type: 'CNAME',
}));
zonePair.dnsRecord('cname-media', ({ hostname }) => ({
  content: 'public.r2.dev',
  name: hostname('media'),
  proxied: true,
  type: 'CNAME',
}));
boluochatCom.dnsRecord('aaaa-avatars', {
  content: '100::',
  name: 'avatars.boluochat.com',
  proxied: true,
  type: 'AAAA',
});

// Additional services and application aliases for boluo.chat.
boluoChat.dnsRecord('a-fedi', {
  comment: 'GoToSocial',
  content: '193.142.58.160',
  name: 'fedi.boluo.chat',
  type: 'A',
});
boluoChat.dnsRecord('a-fennel', {
  content: '35.200.5.240',
  name: 'fennel.boluo.chat',
  type: 'A',
});
boluoChat.dnsRecord('a-fly-sin', {
  comment: 'fly.io Singapore',
  content: '213.188.206.91',
  name: 'fly-sin.boluo.chat',
  type: 'A',
});
boluoChat.dnsRecord('a-suoh', {
  comment: 'DMIT HK',
  content: '154.12.188.15',
  name: 'suoh.boluo.chat',
  type: 'A',
});
boluoChat.dnsRecord('a-thyme', {
  content: '35.213.61.199',
  name: 'thyme.boluo.chat',
  type: 'A',
});
boluoChat.dnsRecord('aaaa-backup', {
  comment: 'Koma in Fly.io Mythal Network',
  content: 'fdaa:17:e385:a7b:8f98:fcef:478e:eb02',
  name: 'backup.boluo.chat',
  type: 'AAAA',
});
boluoChat.dnsRecord('cname-wildcard', {
  comment: '[boluo-infra production] Managed by Pulumi',
  content: 'production.boluo.chat',
  name: '*.boluo.chat',
  proxied: true,
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-cloudflare', {
  comment: '[boluo-infra production] Managed by Pulumi',
  content: 'production.boluo.chat',
  name: 'cloudflare.boluo.chat',
  proxied: true,
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-media-dev', {
  content: 'public.r2.dev',
  name: 'media-dev.boluo.chat',
  proxied: true,
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-www', {
  comment: '[boluo-infra production] Managed by Pulumi',
  content: 'fly.boluo.chat',
  name: 'www.boluo.chat',
  proxied: true,
  type: 'CNAME',
});

// Fastmail records for boluo.chat.
boluoChat.dnsRecord('cname-fm1-domainkey', {
  comment: 'Fastmail',
  content: 'fm1.boluo.chat.dkim.fmhosted.com',
  name: 'fm1._domainkey.boluo.chat',
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-fm2-domainkey', {
  comment: 'Fastmail',
  content: 'fm2.boluo.chat.dkim.fmhosted.com',
  name: 'fm2._domainkey.boluo.chat',
  type: 'CNAME',
});
boluoChat.dnsRecord('cname-fm3-domainkey', {
  comment: 'Fastmail',
  content: 'fm3.boluo.chat.dkim.fmhosted.com',
  name: 'fm3._domainkey.boluo.chat',
  type: 'CNAME',
});
boluoChat.dnsRecord('mx-primary', {
  comment: 'Fastmail',
  content: 'in1-smtp.messagingengine.com',
  name: 'boluo.chat',
  priority: 10,
  type: 'MX',
});
boluoChat.dnsRecord('mx-secondary', {
  comment: 'Fastmail',
  content: 'in2-smtp.messagingengine.com',
  name: 'boluo.chat',
  priority: 10,
  type: 'MX',
});
boluoChat.dnsRecord('txt-spf', {
  comment: 'Fastmail',
  content: 'v=spf1 include:spf.messagingengine.com ?all',
  name: 'boluo.chat',
  type: 'TXT',
});

// Mailgun records for noreply.boluo.chat.
boluoChat.dnsRecord('mx-noreply-primary', {
  comment: 'mailgun',
  content: 'mxa.mailgun.org',
  name: 'noreply.boluo.chat',
  priority: 10,
  type: 'MX',
});
boluoChat.dnsRecord('mx-noreply-secondary', {
  comment: 'mailgun',
  content: 'mxb.mailgun.org',
  name: 'noreply.boluo.chat',
  priority: 10,
  type: 'MX',
});
boluoChat.dnsRecord('txt-noreply-spf', {
  comment: 'mailgun',
  content: 'v=spf1 include:mailgun.org ~all',
  name: 'noreply.boluo.chat',
  type: 'TXT',
});
boluoChat.dnsRecord('txt-noreply-dkim-pic', {
  comment: 'mailgun',
  content:
    'k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1fxJpwVn5aGdTTiGFX+PH+4Fhk63b9LDDeTU7rQ1mVUIz8lXgVXdwHBeiMqaGsDg4b1nJAXwjtRRJ8Yx/06dti4BLHTKSXDbY4rm3zWBDy15vq9ye1Zgg9cYjuMwwzQLYQNG6S1U0yEx6EweI3McRDGYcnIqVCIuNHxHd9Lsm2NKW8jIDlQnII2S9P3H6wxr7AioygI27sqpC0Nz4q2ha6X+wiKgVHFu1xVWNWAvRW1gX6b+ZGyFpSZaAwHjqQeZHpNpI+wA2wpQUAW80KKH7P3WhYAibC819UU5a4r2i7yy+5sfnEUFAw9rnnSYoXabR2Gs0TAHu55lK4ZZAzI2WQIDAQAB',
  name: 'pic._domainkey.noreply.boluo.chat',
  type: 'TXT',
});

// Settings shared by both zones.
zonePair.zoneSetting('ipv6', {
  settingId: 'ipv6',
  value: 'on',
});

zonePair.ruleset('legacy-assets-r2-redirect', ({ hostname }) => ({
  name: 'default',
  phase: 'http_request_dynamic_redirect',
  rules: [
    {
      action: 'redirect',
      actionParameters: {
        fromValue: {
          preserveQueryString: true,
          statusCode: 301,
          targetUrl: {
            expression:
              'concat("https://assets.boluochat.com/production/legacy", http.request.uri.path)',
          },
        },
      },
      description: 'Serve production legacy assets from R2',
      enabled: true,
      expression: `(http.host eq "${hostname('old')}" and starts_with(http.request.uri.path, "/assets/"))`,
      ref: 'legacy_assets_r2_redirect',
    },
  ],
}));

// Keep Zstd disabled for older Safari and Apple OS versions that remain in use.
// Safari 26.3 added Zstd support on current Apple OS releases, but not on older
// macOS versions, so Brotli and Gzip remain the compatible baseline.
// https://bugs.webkit.org/show_bug.cgi?id=279815
// https://webkit.org/blog/17798/webkit-features-for-safari-26-3/#zstandard
// https://developers.cloudflare.com/rules/compression-rules/settings/
zonePair.ruleset('http-response-compression', ({ select }) => ({
  name: 'default',
  phase: 'http_response_compression',
  rules: [
    {
      action: 'compress_response',
      actionParameters: {
        algorithms: [{ name: 'brotli' }, { name: 'gzip' }],
      },
      description: 'Disable Zstd compression for Safari/iOS compatibility',
      enabled: true,
      expression: 'true',
      ref: select({
        boluo_chat: '9f686ea47a4848399f41d6dd73c3bf74',
        boluochat_com: '6e5fe447e4864c158f3e3a2c7c4b54a6',
      }),
    },
  ],
}));

// Settings and rulesets that only apply to boluo.chat.
boluoChat.zoneSetting('automatic-https-rewrites', {
  settingId: 'automatic_https_rewrites',
  value: 'off',
});
boluoChat.zoneSetting('browser-check', {
  settingId: 'browser_check',
  value: 'off',
});
boluoChat.zoneSetting('opportunistic-encryption', {
  settingId: 'opportunistic_encryption',
  value: 'off',
});
boluoChat.zoneSetting('replace-insecure-js', {
  settingId: 'replace_insecure_js',
  value: 'off',
});
boluoChat.zoneSetting('security-level', {
  settingId: 'security_level',
  value: 'medium',
});
boluoChat.zoneSetting('ssl', {
  settingId: 'ssl',
  value: 'full',
});
boluoChat.ruleset('http-request-cache-settings', {
  name: 'default',
  phase: 'http_request_cache_settings',
  rules: [
    {
      action: 'set_cache_settings',
      actionParameters: {
        cache: false,
      },
      description: 'API',
      enabled: true,
      expression: '(starts_with(http.request.uri, "/api"))',
      ref: 'ecd5370a68614118aa8af8e3e302f032',
    },
  ],
});
boluoChat.ruleset('http-request-transform', {
  name: 'default',
  phase: 'http_request_transform',
  rules: [
    {
      action: 'rewrite',
      actionParameters: {
        uri: {
          path: {
            value: '/zh-CN',
          },
        },
      },
      description: 'Language: Chinese',
      enabled: true,
      expression:
        '(starts_with(http.host,"app") and http.request.uri.path eq "/") and (starts_with(http.request.accepted_languages[0],"zh"))',
      ref: '5408f8565aac4608b604d51a044aa67f',
    },
    {
      action: 'rewrite',
      actionParameters: {
        uri: {
          path: {
            value: '/ja',
          },
        },
      },
      description: 'Language: Japanese',
      enabled: true,
      expression:
        '(starts_with(http.host,"app") and http.request.uri.path eq "/") and (starts_with(http.request.accepted_languages[0],"ja"))',
      ref: '64f12baaac8241369e911591cb8e53e7',
    },
    {
      action: 'rewrite',
      actionParameters: {
        uri: {
          path: {
            value: '/en',
          },
        },
      },
      description: 'Language: English',
      enabled: true,
      expression:
        '(starts_with(http.host,"app") and http.request.uri.path eq "/") and (starts_with(http.request.accepted_languages[0],"en"))',
      ref: 'd55e5d7264294986b8a7906a72860062',
    },
  ],
});
boluoChat.ruleset('http-request-firewall-custom', {
  name: 'default',
  phase: 'http_request_firewall_custom',
  rules: [
    {
      action: 'block',
      description: '阻止 AI 爬虫程序和爬网程序规则',
      enabled: true,
      expression: '(cf.verified_bot_category eq "AI Crawler")',
      ref: 'dba12ff883f74dfb989491336ff0488e',
    },
  ],
});
