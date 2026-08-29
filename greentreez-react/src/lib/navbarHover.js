// Make navbar dropdowns open on hover for desktop
export function enableNavbarHover() {
  // Only enable hover on desktop (> 900px)
  if (window.innerWidth <= 900) return;

  const navItems = document.querySelectorAll('nested-menu header-details-disclosure');

  navItems.forEach((item) => {
    const details = item.querySelector('details');
    if (!details) return;

    let hoverTimeout;

    const openDropdown = () => {
      clearTimeout(hoverTimeout);
      details.setAttribute('open', '');
    };

    const closeDropdown = () => {
      hoverTimeout = setTimeout(() => {
        details.removeAttribute('open');
      }, 100);
    };

    item.addEventListener('mouseenter', openDropdown);
    item.addEventListener('mouseleave', closeDropdown);

    // Keep dropdown open when hovering over it
    const dropdown = item.querySelector('.nav__sub');
    if (dropdown) {
      dropdown.addEventListener('mouseenter', openDropdown);
      dropdown.addEventListener('mouseleave', closeDropdown);
    }
  });
}

// Re-enable on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    enableNavbarHover();
  }, 250);
});
