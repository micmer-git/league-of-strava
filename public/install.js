(function () {
  let deferredPrompt = null;
  const targetInteraction = Math.random() < 0.5 ? 4 : 10;
  let interactionCount = 0;
  let hasShownInstall = false;
  const installButtons = Array.from(document.querySelectorAll('[data-install-trigger]'));
  const installBanner = document.querySelector('[data-install-banner]');
  const dismissButtons = Array.from(document.querySelectorAll('[data-install-dismiss]'));

  const showInstall = () => {
    if (hasShownInstall || !deferredPrompt) {
      return;
    }

    hasShownInstall = true;
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

  const maybeShowInstall = () => {
    if (!deferredPrompt) {
      return;
    }

    if (interactionCount >= targetInteraction) {
      showInstall();
      document.removeEventListener('pointerdown', handleInteraction, true);
    }
  };

  const handleInteraction = () => {
    interactionCount += 1;
    maybeShowInstall();
  };

  document.addEventListener('pointerdown', handleInteraction, true);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    maybeShowInstall();
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
