(function () {
  let deferredPrompt = null;
  const installButtons = Array.from(document.querySelectorAll('[data-install-trigger]'));
  const installBanner = document.querySelector('[data-install-banner]');
  const dismissButtons = Array.from(document.querySelectorAll('[data-install-dismiss]'));

  const showInstall = () => {
    installButtons.forEach((button) => button.classList.add('is-visible'));
    if (installBanner) {
      installBanner.hidden = false;
      installBanner.classList.add('is-visible');
    }
  };

  const hideBanner = () => {
    if (installBanner) {
      installBanner.classList.remove('is-visible');
      installBanner.hidden = true;
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showInstall();
  });

  installButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }

      button.disabled = true;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        hideBanner();
      }
      deferredPrompt = null;
      button.disabled = false;
    });
  });

  dismissButtons.forEach((button) => {
    button.addEventListener('click', () => {
      hideBanner();
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
