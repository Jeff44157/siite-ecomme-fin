document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dots .dot');
  const slider = document.getElementById('heroSlider');
  if (!slides.length) return;

  let currentIndex = 0;
  let slideInterval;
  const intervalTime = 3000; // max ~3s avant passage auto

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === currentIndex));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function startAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, intervalTime);
  }

  function resetAutoSlide() {
    clearInterval(slideInterval);
    startAutoSlide();
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.index) || 0);
      resetAutoSlide();
    });
  });

  if (slider) {
    slider.addEventListener('mouseenter', () => clearInterval(slideInterval));
    slider.addEventListener('mouseleave', startAutoSlide);
  }

  startAutoSlide();
});
