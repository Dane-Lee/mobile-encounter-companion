export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    await navigator.serviceWorker.register(serviceWorkerUrl);
  } catch (error) {
    console.error('Service worker registration failed.', error);
  }
};
