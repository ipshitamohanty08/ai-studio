import type { Request } from 'express';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './db.ts';
import fs from 'fs';
import path from 'path';

// Read fallback OAuth client ID from firebase-applet-config.json if not set in process.env
let fallbackClientId = '';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    fallbackClientId = parsed.oAuthClientId || '';
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json for OAuth Client ID fallback');
}

export function getClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || fallbackClientId || '';
}

export function getClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

export function getRedirectUri(req?: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/+$/, '')}/api/auth/google/callback`;
  }
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}/api/auth/google/callback`;
  }
  return 'https://localhost:3000/api/auth/google/callback';
}

export interface StoredGoogleToken {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number; // timestamp in ms
  scope?: string;
  updatedAt: string;
}

const TOKENS_COL = 'google_tokens';

// Generate Google OAuth 2.0 Consent URL
export function generateAuthUrl(userId: string, req: Request): { url: string; redirectUri: string } {
  const clientId = getClientId();
  const redirectUri = getRedirectUri(req);

  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured. Set GOOGLE_CLIENT_ID.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const statePayload = Buffer.from(JSON.stringify({ userId, t: Date.now() })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline', // Mandatory for receiving a Refresh Token
    prompt: 'consent',     // Forces consent prompt to ensure refresh_token is returned
    include_granted_scopes: 'true',
    state: statePayload,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  };
}

// Exchange authorization code for access and refresh tokens
export async function exchangeCodeForTokens(
  code: string,
  userId: string,
  req: Request
): Promise<{ email: string; accessToken: string }> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri(req);

  if (!clientId || !clientSecret) {
    throw new Error('Server requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to exchange authorization code.');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errBody = await tokenResponse.json().catch(() => ({}));
    throw new Error(errBody.error_description || errBody.error || `OAuth token exchange failed with status ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;
  const expiryDate = Date.now() + expiresIn * 1000;

  // Retrieve authenticated user's email address from Google
  let userEmail = 'unknown@gmail.com';
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email || userEmail;
    }
  } catch (err) {
    console.warn('Failed to fetch user email during OAuth exchange:', err);
  }

  // Persist token in Firestore securely on backend
  const tokenRecord: Record<string, any> = {
    userId,
    email: userEmail,
    accessToken,
    expiryDate,
    scope: tokenData.scope || 'https://www.googleapis.com/auth/calendar.events',
    updatedAt: new Date().toISOString(),
  };
  if (refreshToken) {
    tokenRecord.refreshToken = refreshToken;
  }

  await setDoc(doc(db, TOKENS_COL, userId), tokenRecord);
  return { email: userEmail, accessToken };
}

// Client-side Token Link (for hybrid popup authorization)
export async function linkClientToken(
  userId: string,
  accessToken: string,
  refreshToken?: string,
  emailHint?: string
): Promise<{ email: string }> {
  let userEmail = emailHint || 'unknown@gmail.com';

  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email || userEmail;
    }
  } catch (err) {
    console.warn('Failed to verify user info from client access token:', err);
  }

  const existingSnap = await getDoc(doc(db, TOKENS_COL, userId));
  const existing = existingSnap.exists() ? (existingSnap.data() as StoredGoogleToken) : null;

  const tokenRecord: Record<string, any> = {
    userId,
    email: userEmail,
    accessToken,
    expiryDate: Date.now() + 3500 * 1000,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    updatedAt: new Date().toISOString(),
  };

  const finalRefreshToken = refreshToken || existing?.refreshToken;
  if (finalRefreshToken) {
    tokenRecord.refreshToken = finalRefreshToken;
  }

  await setDoc(doc(db, TOKENS_COL, userId), tokenRecord);
  return { email: userEmail };
}

// Retrieve valid Google token, refreshing if necessary
export async function getValidGoogleToken(userId: string): Promise<{ accessToken: string; email: string } | null> {
  const snap = await getDoc(doc(db, TOKENS_COL, userId));
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as StoredGoogleToken;
  const now = Date.now();
  const bufferMs = 60 * 1000; // 1 minute safety buffer

  // If token is still fresh, return it
  if (data.expiryDate && data.expiryDate > now + bufferMs) {
    return { accessToken: data.accessToken, email: data.email };
  }

  // Token is expired or expiring soon, attempt refresh
  if (data.refreshToken) {
    const clientId = getClientId();
    const clientSecret = getClientSecret();

    if (clientId && clientSecret) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: data.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          const newAccessToken = refreshedData.access_token;
          const newExpiresIn = refreshedData.expires_in || 3600;
          const newExpiryDate = Date.now() + newExpiresIn * 1000;

          data.accessToken = newAccessToken;
          data.expiryDate = newExpiryDate;
          data.updatedAt = new Date().toISOString();

          await setDoc(doc(db, TOKENS_COL, userId), data);
          return { accessToken: newAccessToken, email: data.email };
        } else {
          console.error('Refresh token request failed:', await refreshRes.text());
        }
      } catch (err) {
        console.error('Error refreshing Google OAuth access token:', err);
      }
    }
  }

  // If we couldn't refresh, still return existing token if present
  if (data.accessToken) {
    return { accessToken: data.accessToken, email: data.email };
  }

  return null;
}

// Disconnect Google Calendar & Revoke Tokens
export async function disconnectGoogle(userId: string): Promise<{ success: boolean; message: string }> {
  const snap = await getDoc(doc(db, TOKENS_COL, userId));
  if (snap.exists()) {
    const data = snap.data() as StoredGoogleToken;
    // Attempt token revocation with Google
    if (data.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.accessToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (err) {
        console.warn('Revoke token network error:', err);
      }
    }
    await deleteDoc(doc(db, TOKENS_COL, userId));
  }

  return { success: true, message: 'Google account disconnected and authorization revoked.' };
}

// Check Connection Status
export async function getGoogleConnectionStatus(userId: string): Promise<{
  connected: boolean;
  email?: string;
  hasRefreshToken?: boolean;
  expiryDate?: number;
  updatedAt?: string;
}> {
  const snap = await getDoc(doc(db, TOKENS_COL, userId));
  if (!snap.exists()) {
    return { connected: false };
  }

  const data = snap.data() as StoredGoogleToken;
  return {
    connected: true,
    email: data.email,
    hasRefreshToken: !!data.refreshToken,
    expiryDate: data.expiryDate,
    updatedAt: data.updatedAt,
  };
}
