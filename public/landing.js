(function () {
  const track = document.querySelector('.carousel-track');
  const slides = Array.from(document.querySelectorAll('.carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.carousel-dot'));
  const prev = document.getElementById('carousel-prev');
  const next = document.getElementById('carousel-next');

  if (!track || slides.length === 0) return;

  let index = 0;
  let autoTimer = null;

  const setActive = (newIndex) => {
    index = (newIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', (!isActive).toString());
    });

    dots.forEach((dot, dotIndex) => {
      const selected = dotIndex === index;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-selected', selected.toString());
    });
  };

  const goNext = () => setActive(index + 1);
  const goPrev = () => setActive(index - 1);

  const restartAutoPlay = () => {
    if (autoTimer) window.clearInterval(autoTimer);
    autoTimer = window.setInterval(goNext, 7000);
  };

  prev?.addEventListener('click', () => {
    goPrev();
    restartAutoPlay();
  });

  next?.addEventListener('click', () => {
    goNext();
    restartAutoPlay();
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetIndex = Number(dot.dataset.target);
      setActive(targetIndex);
      restartAutoPlay();
    });
  });

  setActive(0);
  restartAutoPlay();
})();
