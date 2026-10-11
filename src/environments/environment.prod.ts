import { officialBrand } from '../app/core/config/official-brand';

export const environment = {
  production: true,
  apiUrl: officialBrand.apiBaseUrl,
  /** Public marketing site. Contact Support opens `{websiteUrl}/#contact`. */
  websiteUrl: officialBrand.websiteUrl,
  appName: officialBrand.productName,
  appVersion: '1.0.0',
  enableDevTools: false,
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr'],
  tokenKey: 'ekklesia_access_token',
  refreshTokenKey: 'ekklesia_refresh_token',
  expiryTimeKey: 'ekklesia_expiry_time',
  userIdKey: 'ekklesia_user_id',
  roleIdKey: 'ekklesia_role_id',
  tenantKey: 'ekklesia_tenant_id',
  userKey: 'ekklesia_user'
};

