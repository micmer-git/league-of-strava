(function () {
  const toggle = document.getElementById('site-nav-toggle');
  const nav = document.getElementById('site-primary-nav');
  if (!toggle || !nav) {
    return;
  }

  const closeNav = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  nav.querySelectorAll('a, button').forEach(control => {
    control.addEventListener('click', closeNav);
  });
})();
