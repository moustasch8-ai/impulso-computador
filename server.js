import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v27.0';
const PUBLIC_BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || PUBLIC_BASE_URL + '/auth/instagram/callback';
const SCOPES = process.env.INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_manage_insights';
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('Configure SESSION_SECRET com pelo menos 32 caracteres no .env.');
  process.exit(1);
}

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(session({
  name: 'impulso.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 60 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(__dirname, { index: 'index.html', etag: true, maxAge: isProduction ? '1h' : 0 }));

function configured() {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && REDIRECT_URI);
}
function graphUrl(pathname) {
  return 'https://graph.instagram.com/' + API_VERSION + '/' + pathname.replace(/^\//, '');
}
async function graphGet(pathname, token, params = {}) {
  const url = new URL(graphUrl(pathname));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  url.searchParams.set('access_token', token);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = new Error(payload.error?.message || 'Instagram API respondeu HTTP ' + response.status);
    error.status = response.status;
    throw error;
  }
  return payload;
}
async function refreshTokenIfNeeded(req) {
  const ig = req.session.instagram;
  if (!ig?.accessToken) throw Object.assign(new Error('Instagram não conectado.'), { status: 401 });
  const now = Date.now();
  const canRefresh = now - Number(ig.createdAt || 0) >= 24 * 60 * 60 * 1000;
  if (Number(ig.expiresAt || 0) - now < 7 * 24 * 60 * 60 * 1000 && canRefresh) {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', ig.accessToken);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.access_token) {
      ig.accessToken = data.access_token;
      ig.expiresAt = now + Number(data.expires_in || 0) * 1000;
      ig.createdAt = now;
      req.session.instagram = ig;
    }
  }
  return ig;
}
async function loadProfile(ig) {
  const payload = await graphGet('me', ig.accessToken, {
    fields: 'user_id,username,account_type,profile_picture_url,followers_count,follows_count,media_count'
  });
  return Array.isArray(payload.data) ? payload.data[0] : payload;
}
function safeError(res, error) {
  const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500;
  res.status(status).json({ error: error.message || 'Erro interno ao comunicar com o Instagram.' });
}

app.get('/auth/instagram', (req, res) => {
  if (!configured()) return res.redirect('/?instagram=error');
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  const authorizationUrl = new URL('https://www.instagram.com/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID);
  authorizationUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', SCOPES);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('enable_fb_login', '0');
  res.redirect(authorizationUrl.toString());
});

app.get('/auth/instagram/callback', async (req, res) => {
  try {
    if (req.query.error) return res.redirect('/?instagram=denied');
    const code = String(req.query.code || '').replace(/#_$/, '');
    if (!code || !req.query.state || req.query.state !== req.session.oauthState) {
      return res.status(400).send('A autorização falhou: código ou estado OAuth inválido. Volte ao Impulso e tente novamente.');
    }
    delete req.session.oauthState;
    const body = new FormData();
    body.set('client_id', process.env.INSTAGRAM_APP_ID);
    body.set('client_secret', process.env.INSTAGRAM_APP_SECRET);
    body.set('grant_type', 'authorization_code');
    body.set('redirect_uri', REDIRECT_URI);
    body.set('code', code);
    const shortResponse = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
    const shortPayload = await shortResponse.json().catch(() => ({}));
    if (!shortResponse.ok) throw new Error(shortPayload.error_message || shortPayload.error?.message || 'A Meta não aceitou o código de autorização.');
    const shortToken = Array.isArray(shortPayload.data) ? shortPayload.data[0]?.access_token : shortPayload.access_token;
    if (!shortToken) throw new Error('A Meta não retornou um token de acesso.');

    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET);
    longUrl.searchParams.set('access_token', shortToken);
    const longResponse = await fetch(longUrl, { headers: { Accept: 'application/json' } });
    const longPayload = await longResponse.json().catch(() => ({}));
    if (!longResponse.ok || !longPayload.access_token) throw new Error(longPayload.error?.message || 'Não foi possível trocar o token por uma versão de longa duração.');

    const ig = {
      accessToken: longPayload.access_token,
      expiresAt: Date.now() + Number(longPayload.expires_in || 0) * 1000,
      createdAt: Date.now(),
      grantedPermissions: shortPayload.permissions || null
    };
    req.session.instagram = ig;
    ig.profile = await loadProfile(ig);
    req.session.instagram = ig;
    res.redirect('/?instagram=connected');
  } catch (error) {
    console.error('Falha no OAuth do Instagram:', error.message);
    res.redirect('/?instagram=error');
  }
});

app.get('/api/instagram/status', async (req, res) => {
  if (!configured()) return res.json({ configured: false, connected: false });
  if (!req.session.instagram?.accessToken) return res.json({ configured: true, connected: false });
  try {
    const ig = await refreshTokenIfNeeded(req);
    const profile = await loadProfile(ig);
    ig.profile = profile;
    req.session.instagram = ig;
    res.json({ configured: true, connected: true, profile, expiresAt: ig.expiresAt });
  } catch (error) {
    if (error.status === 401) req.session.instagram = null;
    safeError(res, error);
  }
});

app.get('/api/instagram/insights', async (req, res) => {
  try {
    const ig = await refreshTokenIfNeeded(req);
    const profile = ig.profile || await loadProfile(ig);
    const userId = profile.user_id || profile.id;
    if (!userId) throw new Error('Não foi possível identificar a conta profissional do Instagram.');
    const insights = await graphGet(encodeURIComponent(userId) + '/insights', ig.accessToken, {
      metric: 'views,reach,accounts_engaged,total_interactions',
      period: 'day',
      metric_type: 'total_value'
    });
    res.json(insights);
  } catch (error) { safeError(res, error); }
});

app.post('/api/instagram/disconnect', (req, res) => {
  req.session.instagram = null;
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true, configured: configured() }));
app.listen(PORT, () => console.log('Impulso rodando em http://localhost:' + PORT));
