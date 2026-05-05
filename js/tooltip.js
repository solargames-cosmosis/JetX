document.querySelectorAll('[data-tooltip]').forEach(el => {
  el.addEventListener('mouseenter', () => {
    const tooltip = document.createElement('div');
    tooltip.innerText = el.getAttribute('data-tooltip');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    const rect = el.getBoundingClientRect();
    tooltip.style.position = 'absolute';
    tooltip.style.top = rect.top - 30 + 'px';
    tooltip.style.left = rect.left + 'px';

    el._tooltip = tooltip;
  });

  el.addEventListener('mouseleave', () => {
    if (el._tooltip) el._tooltip.remove();
  });
});
