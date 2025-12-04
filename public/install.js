(function () {
  let deferredPrompt = null;
  const installButtons = Array.from(document.querySelectorAll('[data-install-trigger]'));

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  installButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }

      button.disabled = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.disabled = false;
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* noop */
      });
    }
  });
})();
