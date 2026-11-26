import { createECDH, createPrivateKey, createSign, createCipheriv, createHmac, randomBytes } from 'node:crypto';
import type { Db } from './db';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function b64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function fromB64url(value: string) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function hmac(key: Buffer, value: Buffer) {
  return createHmac('sha256', key).update(value).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(blocks).length < length) {
    previous = hmac(prk, Buffer.concat([previous, info, Buffer.from([counter])]));
    blocks.push(previous);
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  const publicBytes = fromB64url(publicKey);
  const privateBytes = fromB64url(privateKey);
  if (publicBytes.length !== 65 || privateBytes.length !== 32) return null;
  return { publicKey, publicBytes, privateBytes, subject };
}

function createVapidToken(audience: string, config: NonNullable<ReturnType<typeof vapidConfig>>) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: config.subject,
  }));
  const unsigned = `${header}.${payload}`;
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64url(config.publicBytes.subarray(1, 33)),
    y: b64url(config.publicBytes.subarray(33, 65)),
    d: b64url(config.privateBytes),
  };
  const key = createPrivateKey({ key: jwk, format: 'jwk' });
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${b64url(signature)}`;
}

function encryptPayload(payload: Buffer, clientPublicKey: Buffer, authSecret: Buffer) {
  const ecdh = createECDH('prime256v1');
  const serverPublicKey = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(clientPublicKey);
  const authPrk = hmac(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    clientPublicKey,
    serverPublicKey,
  ]);
  const inputKeyMaterial = hkdfExpand(authPrk, keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hmac(salt, inputKeyMaterial);
  const cek = hkdfExpand(prk, Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'), 16);
  const nonce = hkdfExpand(prk, Buffer.from('Content-Encoding: nonce\0', 'utf8'), 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = serverPublicKey.length;
  return Buffer.concat([header, serverPublicKey, encrypted]);
}

async function sendOne(subscription: PushSubscriptionRow, payload: Buffer, config: NonNullable<ReturnType<typeof vapidConfig>>) {
  const endpointUrl = new URL(subscription.endpoint);
  if (endpointUrl.protocol !== 'https:') throw new Error('Invalid push endpoint');
  const token = createVapidToken(endpointUrl.origin, config);
  const body = encryptPayload(payload, fromB64url(subscription.p256dh), fromB64url(subscription.auth));
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${config.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
}

/** Send push to subscribed devices. Missing VAPID configuration keeps in-app notifications working. */
export async function sendPushToUsers(
  db: Db,
  userIds: string[],
  message: { title: string; body: string; url?: string },
) {
  const config = vapidConfig();
  if (!config || userIds.length === 0) return { sent: 0, removed: 0, configured: Boolean(config) };

  const { rows } = await db.query(
    `select id, endpoint, p256dh, auth
       from push_subscriptions
      where user_id = any($1::uuid[])`,
    [userIds],
  ) as { rows: PushSubscriptionRow[] };

  const payload = Buffer.from(JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url ?? '/m/communication',
    tag: 'mmv-announcement',
  }));

  let sent = 0;
  let removed = 0;
  await Promise.all(rows.map(async (subscription) => {
    try {
      const response = await sendOne(subscription, payload, config);
      if (response.status === 404 || response.status === 410) {
        await db.query('delete from push_subscriptions where id = $1', [subscription.id]);
        removed += 1;
      } else if (response.ok) {
        sent += 1;
      } else {
        console.warn('[push] provider rejected a notification', response.status);
      }
    } catch (error) {
      console.warn('[push] delivery failed', error instanceof Error ? error.message : 'unknown error');
    }
  }));
  return { sent, removed, configured: true };
}

export function getPushPublicKey() {
  const config = vapidConfig();
  return config?.publicKey ?? null;
}
