/** Артефакт-прев'ю не підтримує Service Worker — заглушка для virtual:pwa-register/react. */
export function useRegisterSW() {
  const noop = () => {};
  return { needRefresh: [false, noop] as const, offlineReady: [false, noop] as const, updateServiceWorker: async () => {} };
}
