function apply_background_effect(target) {
  const el = document.querySelector(target);
  if (!el) return;

  el.style.background = 'radial-gradient(circle at center, #111 0%, #000 100%)';
}
