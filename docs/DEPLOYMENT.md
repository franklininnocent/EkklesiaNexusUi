# EkklesiaNexusUi deployment

This document is the deployment procedure for the Angular parish application only. It was written from the repository on 15 Oct 2026. It does not mean a UAT or Production server has been provisioned or that a release has been deployed.

The API procedure is in `EkklesiaNexusApi/docs/DEPLOYMENT.md`. The marketing site procedure is in `EkklesiaNexusWeb/docs/DEPLOYMENT.md`.

## What this application is

| Item | Value in this repository |
| --- | --- |
| Package name | `ekklesia-soft-ui` |
| Angular | 22.2.3 (`@angular/core` and related packages) |
| Angular CLI / build | 22.2.3 |
| TypeScript | 6.0.3 |
| RxJS | 7.8.2 |
| Lockfile | `package-lock.json` (npm). No pnpm or Yarn lockfile |
| Production build | `npm run build:prod` which runs `ng build --configuration production` |
| Output directory | `dist/ekklesia-soft-ui/browser` |
| Routing | HTML5 paths. `src/index.html` sets `<base href="/">`. No hash routing |
| Runtime | Static files. Do not run `ng serve` on a server |
| API URL | Compiled into the bundle. Production uses `https://api.ekklesianexus.com/api` from `src/app/core/config/official-brand.ts` |
| Auth | Passport bearer token in `localStorage`. Interceptors in `src/app/core/interceptors/` |
| Tests | `npm run test:ci` (Jest). Lint: `npm run lint` |
| UAT build configuration | Not present. `angular.json` has `production` and `development` only |

Angular 22 is the application line in this repository ([Angular releases](https://angular.dev/reference/releases)).

## Node.js

Angular 22 accepts Node `^20.19.0`, `^22.12.0`, or `^24.0.0` ([Angular version compatibility](https://angular.dev/reference/versions)).

Install **Node.js 24 LTS**, latest 24.x patch published on https://nodejs.org at install time. Node 24 remains supported through 30 Apr 2028. Do not install Node 26 Current. Node 20 is end of life.

CI uses Node 24. Before the first UAT build, run `npm run lint`, `npm run test:ci`, and `npm run build:prod` on the Node 24 patch you installed.

npm is the npm shipped with that Node build. Install with `npm ci`. Do not run `npm update` or `npm install` to refresh the lockfile during deployment.

## Placeholders

| Placeholder | Meaning |
| --- | --- |
| `<ENV>` | `uat` or `production` |
| `<SSH_HOST>` | Server for that environment |
| `<APP_HOST>` | Production: `app.ekklesianexus.com`. UAT: approved UAT application hostname |
| `<API_BASE>` | Production build: `https://api.ekklesianexus.com/api`. UAT: `https://<UAT_API_HOST>/api` |
| `<GIT_REMOTE_UI>` | Approved Git remote |
| `<RELEASE_SHA>` | Full commit SHA |
| `<RELEASE_ID>` | Release directory name |

The same UI commit cannot be copied from UAT to Production when those environments use different API origins, because the origin is compiled into the JavaScript. Build once per environment from the same `<RELEASE_SHA>`.

## Production URL source

`src/environments/environment.prod.ts` sets `apiUrl` from `officialBrand.apiBaseUrl`.

Production values already in `src/app/core/config/official-brand.ts`:

- Marketing site: `https://ekklesianexus.com`
- Application: `https://app.ekklesianexus.com`
- API: `https://api.ekklesianexus.com/api`

`npm run build:prod` is the Production artifact. Do not change `official-brand.ts` on a server to point UAT at a different API. That file is the Production source of truth.

There is no `environment.uat.ts` and no `uat` configuration in `angular.json`. Until that configuration is added in a reviewed change, do not deploy a UAT bundle that was built with `npm run build:prod`, because it will call the Production API.

## 1. Build machine

Run on the build machine, which may be the target server or a separate builder. Node 24 LTS must be on `PATH`.

```bash
node -v
npm -v
```

Expected: `v24.*` and the matching npm. Confirm `node` is at least 24.0.0 and not 26.

Obtain the commit:

```bash
git clone <GIT_REMOTE_UI> ekklesia-ui-src
cd ekklesia-ui-src
git checkout --detach <RELEASE_SHA>
git rev-parse HEAD
git status --short
```

Expected: clean tree at `<RELEASE_SHA>`.

## 2. Install, test, and build

Run inside the UI directory.

Production:

```bash
npm ci
npm run lint
npm run test:ci
npm run build:prod
test -f dist/ekklesia-soft-ui/browser/index.html
grep -R --binary-files=without-match -n 'localhost' dist/ekklesia-soft-ui/browser && echo 'LOCALHOST_FOUND' || echo 'LOCALHOST_ABSENT'
grep -R --binary-files=without-match -n 'api.ekklesianexus.com/api' dist/ekklesia-soft-ui/browser | head
MAIN_JS=$(ls dist/ekklesia-soft-ui/browser/main-*.js)
grep -q 'pathname.startsWith(`/api/`)&&' "$MAIN_JS" && echo 'MEDIA_URL_FIX_PRESENT' || echo 'MEDIA_URL_FIX_MISSING'
```

Expected for Production: `index.html` exists, `LOCALHOST_ABSENT`, `MEDIA_URL_FIX_PRESENT`, and the Production API host is present. `npm ci` must not rewrite `package-lock.json`.

After publish, confirm the live app serves the new bundle (not an older `main-*.js`):

```bash
curl -sS https://<APP_HOST>/ | grep -oE 'main-[A-Z0-9]+\.js'
curl -sS "https://<APP_HOST>/$(curl -sS https://<APP_HOST>/ | grep -oE 'main-[A-Z0-9]+\.js')" | grep -q 'pathname.startsWith(`/api/`)&&' && echo LIVE_MEDIA_FIX_OK
```

### Ministry About rich-text editor releases

Before copying a new `browser/` tree to production, confirm the artifact has no debug endpoints:

```bash
grep -R --binary-files=without-match -n '127.0.0.1' dist/ekklesia-soft-ui/browser && echo LOOPBACK_FOUND || echo LOOPBACK_ABSENT
```

On the server, **do not assume** DocumentRoot. Inspect Apache `sites-enabled` for `app.ekklesianexus.com` and whether the live path is a directory, symlink, or `/srv/ekklesianexus/ui/releases/<id>`. Prior live ops used `/var/www/ekklesianexus-app` as DocumentRoot; reconcile with the active vhost before `rsync`.

Post-publish functional check (authorized test ministry): Edit profile → type in Description, Vision, Mission, Objectives → Save → reload. See `docs/frontend/rich-text-editor.md` for the full checklist and rollback (preserve the previous `browser/` copy before overwrite).

If portraits or logos break before a UI rollout, proxy `/api` on the application vhost to the API host. See `docs/deploy/apache-app-ekklesianexus.conf.example`.

UAT, after a reviewed `uat` build configuration exists:

```bash
npm ci
npx ng build --configuration uat
grep -R --binary-files=without-match -n '<UAT_API_HOST>' dist/ekklesia-soft-ui/browser | head
grep -R --binary-files=without-match -n 'api.ekklesianexus.com' dist/ekklesia-soft-ui/browser && echo 'PROD_API_LEAKED' || echo 'PROD_API_ABSENT'
```

Expected for UAT: the UAT API host is present and `PROD_API_ABSENT`.

The dev proxy `proxy.conf.js` is used only by `ng serve`. It is not part of the production artifact.

## 3. Publish the artifact

Run on the target server. Build output contains only static files. Copy the `browser` directory into a versioned release. Do not place `.env` or API secrets in this tree.

```bash
sudo mkdir -p /srv/ekklesianexus/ui/releases/<RELEASE_ID>
sudo rsync -a --delete dist/ekklesia-soft-ui/browser/ /srv/ekklesianexus/ui/releases/<RELEASE_ID>/
sudo chown -R ekklesia:ekklesia /srv/ekklesianexus/ui
ln -sfn /srv/ekklesianexus/ui/releases/<RELEASE_ID> /srv/ekklesianexus/ui/current
readlink -f /srv/ekklesianexus/ui/current
find /srv/ekklesianexus/ui/current -name '.env' -o -name '*.map' | head
```

Keep the previous release directory. Hashed files under the release can be cached for a long time. `index.html` must not be cached for a long time, because it points at those hashed files.

Source maps are not required for the public site. If the build emits them, do not publish maps that contain secrets. This application has no server secrets in the Angular environment files; the files contain public URLs and `localStorage` key names.

## 4. Nginx

Create `/etc/nginx/sites-available/ekklesia-ui.conf`. Back up any existing file for this hostname before replacing it.

```nginx
server {
    listen 80;
    server_name <APP_HOST>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <APP_HOST>;

    root /srv/ekklesianexus/ui/current;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/<APP_HOST>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<APP_HOST>/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;

    access_log /var/log/nginx/ekklesia-ui.access.log;
    error_log  /var/log/nginx/ekklesia-ui.error.log warn;

    location = /index.html {
        add_header Cache-Control "no-cache" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|woff2|svg|png|jpg|jpeg|webp|gif|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }
}
```

`try_files` falling back to `index.html` is required. A direct request to a nested route such as `/families` must return the application shell, not Nginx 404.

```bash
sudo certbot --nginx -d <APP_HOST>
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -o /dev/null -w 'home %{http_code}\n' https://<APP_HOST>/
curl -fsS -o /dev/null -w 'nested %{http_code}\n' https://<APP_HOST>/login
```

Expected: both 200, and the nested response is HTML rather than a 404. Confirm `Cache-Control: no-cache` on `/` and a long `max-age` on a fingerprinted `.js` file.

## 5. Checks that require a browser

Record pass or fail. Do not mark these passed from this document.

- Login and logout against the API for this environment
- Dashboard navigation for an authorized role
- A direct load of a nested route after login
- A role that must not see a screen does not see it
- Browser console has no failed API calls to `localhost` or to the wrong environment
- Static files load from `<APP_HOST>`, not from a development server

The UI sends `Authorization: Bearer` and, when a support session exists, `X-Support-Session-Id`. Token refresh is implemented in application-access streaming. Most 401 responses clear local auth state. Session cookies are not the API credential.

## 6. Rollback

```bash
readlink -f /srv/ekklesianexus/ui/current
ln -sfn /srv/ekklesianexus/ui/releases/<PREVIOUS_RELEASE_ID> /srv/ekklesianexus/ui/current
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -o /dev/null -w '%{http_code}\n' https://<APP_HOST>/
```

No database change belongs to this application. Rolling back the UI does not roll back API migrations.

## 7. What is still unknown

- `<GIT_REMOTE_UI>`, `<SSH_HOST>`, and the approved UAT hostnames
- A reviewed Angular `uat` build configuration. Until it exists, UAT deployment of this UI is blocked
- CI uses Node 24. Confirm the UAT host is on the same Node 24 LTS patch used for `npm ci` and `npm run build:prod`
- No deployment command in this document has been executed against UAT or Production
