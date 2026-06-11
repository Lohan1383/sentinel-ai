export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  await navigator.serviceWorker.register("/sw.js");
}

export function notifyWithVibration(title: string, body: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if ("vibrate" in navigator) {
    navigator.vibrate([120, 40, 120]);
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, silent: true });
  }
}
