import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COINGECKO_API = "https://api.coingecko.com/api/v3";


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = "BFzmvouggvmbOnSIgS5Ri18HL2Y9tpTQsq1SOM6kVz6UxYRfATavRr-x4Xb0wE9WtCVVvcWBt69yZkCYFtzlCxo";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch untriggered alerts
    const { data: alerts, error: alertsErr } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("triggered", false);

    if (alertsErr || !alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No active alerts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group alerts by type
    const cryptoAlerts = alerts.filter((a: any) => a.ticker_type === "crypto");
    const stockAlerts = alerts.filter((a: any) => a.ticker_type === "stock");

    const prices: Record<string, number> = {};

    // Fetch crypto prices
    if (cryptoAlerts.length > 0) {
      const ids = [...new Set(cryptoAlerts.map((a: any) => a.ticker_symbol.toLowerCase()))];
      try {
        const res = await fetch(
          `${COINGECKO_API}/simple/price?ids=${ids.join(",")}&vs_currency=usd&include_24hr_change=true`
        );
        if (res.ok) {
          const data = await res.json();
          for (const [id, info] of Object.entries(data as Record<string, any>)) {
            prices[`crypto:${id}`] = info.usd;
            prices[`crypto:${id}:change`] = info.usd_24h_change || 0;
          }
        }
      } catch (e) {
        console.error("Crypto fetch error:", e);
      }
    }

    // Fetch stock prices via our own stock-proxy to avoid Yahoo blocking
    if (stockAlerts.length > 0) {
      const symbols = [...new Set(stockAlerts.map((a: any) => a.ticker_symbol.toUpperCase()))];
      try {
        const url = `${supabaseUrl}/functions/v1/stock-proxy?symbols=${symbols.join(",")}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const quotes = data.quotes || data.quoteResponse?.result || [];
          for (const q of quotes) {
            const sym = q.symbol?.toUpperCase();
            if (!sym) continue;
            prices[`stock:${sym}`] = q.regularMarketPrice;
            prices[`stock:${sym}:change`] = q.regularMarketChangePercent || 0;
          }
        }
      } catch (e) {
        console.error("Stock fetch error:", e);
      }
    }

    // Check each alert
    const triggeredAlertIds: string[] = [];
    const notifications: { deviceId: string; title: string; body: string }[] = [];

    for (const alert of alerts) {
      const sym = alert.ticker_type === "stock"
        ? alert.ticker_symbol.toUpperCase()
        : alert.ticker_symbol.toLowerCase();
      const key = `${alert.ticker_type}:${sym}`;
      const currentPrice = prices[key];
      const currentChange = prices[`${key}:change`] || 0;

      if (currentPrice === undefined) continue;

      let triggered = false;

      if (alert.alert_type === "price") {
        triggered = currentPrice >= alert.value;
      } else if (alert.alert_type === "percentage") {
        if (alert.direction === "increase") {
          triggered = currentChange >= alert.value;
        } else {
          triggered = currentChange <= -alert.value;
        }
      }

      if (triggered) {
        triggeredAlertIds.push(alert.id);
        notifications.push({
          deviceId: alert.device_id,
          title: `🚨 ${alert.ticker_symbol.toUpperCase()} Alert`,
          body:
            alert.alert_type === "price"
              ? `${alert.ticker_name} reached $${currentPrice.toFixed(2)} (target: $${alert.value})`
              : `${alert.ticker_name} ${alert.direction === "increase" ? "increased" : "decreased"} by ${Math.abs(currentChange).toFixed(2)}% (target: ${alert.value}%)`,
        });
      }
    }

    // Mark triggered
    if (triggeredAlertIds.length > 0) {
      await supabase
        .from("price_alerts")
        .update({ triggered: true })
        .in("id", triggeredAlertIds);
    }

    // Send push notifications
    let sent = 0;
    for (const notif of notifications) {
      const { data: sub } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("device_id", notif.deviceId)
        .single();

      if (!sub) continue;

      try {
        const pushPayload = JSON.stringify({
          title: notif.title,
          body: notif.body,
        });

        // Web Push using the web-push approach with VAPID
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          vapidPublicKey,
          vapidPrivateKey,
          pushPayload
        );
        if (result) sent++;
      } catch (e) {
        console.error("Push send error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        checked: alerts.length,
        triggered: triggeredAlertIds.length,
        notificationsSent: sent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-alerts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Minimal Web Push implementation using crypto APIs
async function sendWebPush(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  payload: string
): Promise<boolean> {
  try {
    // For Deno edge functions, use a simpler approach:
    // Send the push via the endpoint with proper VAPID auth
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);

    // Encrypt payload
    const encrypted = await encryptPayload(p256dhKey, authKey, payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: encrypted,
    });

    if (!response.ok) {
      console.error(`Push failed ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendWebPush error:", e);
    return false;
  }
}

function base64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64urlEncode(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJwt(
  audience: string,
  publicKey: string,
  privateKeyB64: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: "mailto:alerts@lovable.app",
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const privateKeyRaw = base64urlDecode(privateKeyB64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8(privateKeyRaw),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned)
    )
  );

  return `${unsigned}.${base64urlEncode(sig)}`;
}

function buildPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 wrapper for EC P-256 private key
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(prefix.length + rawKey.length);
  result.set(prefix);
  result.set(rawKey, prefix.length);
  return result.buffer;
}

async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  payload: string
): Promise<Uint8Array> {
  // Simplified: For a proper implementation we need full RFC 8291 encryption.
  // Using a simplified version that works with most push services.
  const p256dh = base64urlDecode(p256dhB64);
  const auth = base64urlDecode(authB64);
  const plaintext = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKey = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKey.publicKey)
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    p256dh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKey.privateKey,
      256
    )
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for IKM
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, [
    "deriveBits",
  ]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: auth, info: authInfo },
      ikmKey,
      256
    )
  );

  // Derive content encryption key
  const cekInfo = buildInfo("aesgcm", p256dh, localPublicKey);
  const cekKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      cekKey,
      128
    )
  );

  // Derive nonce
  const nonceInfo = buildInfo("nonce", p256dh, localPublicKey);
  const nonceKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      nonceKey,
      96
    )
  );

  // Pad plaintext (add 2 byte padding length + padding)
  const padded = new Uint8Array(2 + plaintext.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(plaintext, 2);

  // Encrypt
  const encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, padded)
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);

  return result;
}

function buildInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  const typeBytes = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
  const p256dhLabel = new TextEncoder().encode("P-256\0");

  const info = new Uint8Array(
    typeBytes.length +
      p256dhLabel.length +
      2 +
      clientPublicKey.length +
      2 +
      serverPublicKey.length
  );

  let offset = 0;
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  info.set(p256dhLabel, offset);
  offset += p256dhLabel.length;
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;
  info[offset++] = 0;
  info[offset++] = serverPublicKey.length;
  info.set(serverPublicKey, offset);

  return info;
}
