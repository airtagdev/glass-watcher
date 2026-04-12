import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const VAPID_PUBLIC_KEY = "BFzmvouggvmbOnSIgS5Ri18HL2Y9tpTQsq1SOM6kVz6UxYRfATavRr-x4Xb0wE9WtCVVvcWBt69yZkCYFtzlCxo";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const isNative = Capacitor.isNativePlatform();

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check current state on mount
  useEffect(() => {
    if (isNative) {
      PushNotifications.checkPermissions().then(({ receive }) => {
        if (receive === "granted") {
          setPermission("granted");
          setIsSubscribed(true);
        } else if (receive === "denied") {
          setPermission("denied");
        }
      });
    } else {
      // Web path
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        });
      }
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (isNative) {
      return subscribeNative(setPermission, setIsSubscribed);
    }
    return subscribeWeb(setPermission, setIsSubscribed);
  }, []);

  return { permission, isSubscribed, subscribe };
}

/* ---- Native (Capacitor) path ---- */
async function subscribeNative(
  setPermission: (p: NotificationPermission) => void,
  setIsSubscribed: (v: boolean) => void
) {
  try {
    let permResult = await PushNotifications.checkPermissions();
    if (permResult.receive === "prompt" || permResult.receive === "prompt-with-rationale") {
      permResult = await PushNotifications.requestPermissions();
    }

    if (permResult.receive !== "granted") {
      setPermission("denied");
      return false;
    }

    setPermission("granted");

    // Listen for registration success
    return new Promise<boolean>((resolve) => {
      PushNotifications.addListener("registration", async (token) => {
        console.log("Native push token:", token.value);
        const deviceId = getDeviceId();

        await supabase.from("push_subscriptions").upsert(
          {
            device_id: deviceId,
            endpoint: `apns://${token.value}`,
            p256dh: "",
            auth: token.value,
          },
          { onConflict: "device_id" }
        );

        setIsSubscribed(true);
        resolve(true);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Native push registration error:", err);
        resolve(false);
      });

      PushNotifications.register();
    });
  } catch (err) {
    console.error("Native push subscription failed:", err);
    return false;
  }
}

/* ---- Web (Service Worker) path ---- */
async function subscribeWeb(
  setPermission: (p: NotificationPermission) => void,
  setIsSubscribed: (v: boolean) => void
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const keys = sub.toJSON();
    const deviceId = getDeviceId();

    await supabase.from("push_subscriptions").upsert(
      {
        device_id: deviceId,
        endpoint: sub.endpoint,
        p256dh: keys.keys?.p256dh || "",
        auth: keys.keys?.auth || "",
      },
      { onConflict: "device_id" }
    );

    setIsSubscribed(true);
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}
