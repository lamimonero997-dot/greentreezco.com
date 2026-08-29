export function reinitTheme() {
  const theme = window.theme;
  const $ = window.jQuery;
  if (!theme || !$) return;

  try {
    $(document).off('ajaxError.gtz').on('ajaxError.gtz', (_event, _xhr, settings) => {
      console.warn('[store] ajax failed', settings?.url);
    });
  } catch (error) {
    console.warn('[theme] ajax guard failed', error);
  }

  const call = (fn, ...args) => {
    try {
      if (typeof fn === 'function') fn(...args);
    } catch (error) {
      console.warn('[theme] reinit step failed:', error);
    }
  };

  for (const selector of ['.js-page-products', '.js-home-testimonials', '.js-home-collection-list', '.js-events']) {
    document.querySelectorAll(selector).forEach((el) => {
      call(theme.layoutSlider, `.js-layout-slider-${$(el).data('section-id')}`);
    });
  }

  try {
    if ($.fn.fitVids) {
      $('.video-wrapper').fitVids();
      $('.rte iframe[src*="youtube"]').parent().fitVids();
      $('.rte iframe[src*="vimeo"]').parent().fitVids();
    }
    $('.rte table').each(function wrapTable() {
      if (!this.parentElement?.classList?.contains('gtz-table-scroll')) {
        $(this).wrap("<div class='gtz-table-scroll' style='overflow:auto;-webkit-overflow-scrolling:touch'></div>");
      }
    });
    if ($.fn.imagesLoaded) {
      $('.o-layout--masonry').imagesLoaded().always(() => call(theme.masonryLayout));
    }
  } catch (error) {
    console.warn('[theme] reinit helpers failed:', error);
  }

  call(theme.headerScrollUp);
  call(theme.headerStickyClass);
  call(theme.masonryLayout);
  call(theme.triggerActive);
  call(theme.localizeToggle);
  call(theme.magnificVideo);
  call(theme.ageCheckerCookie);
  call(theme.promoPopCookie);
  call(theme.scrollToDiv);
  call(theme.homeVideoGallery);
  call(theme.homeMainCarousel);
  call(theme.homeFeaturedCollection);
  call(theme.testimonialsCarousel);
  call(theme.logoCarousel);
  call(theme.sectionMultiColumn);
  call(theme.thumbsCarousel);

  // ScrollReveal is not loaded; skip so FAQ/page blocks are not left unrevealed.

  try {
    window.lazySizes?.autoSizer?.checkElems?.();
    window.lazySizes?.loader?.checkElems?.();
    document.querySelectorAll('img.lazyload, img.lazyloading, [data-bgset], [data-bg]').forEach((el) => {
      el.classList.remove('lazyloading');
      el.classList.add('lazyload');
    });
  } catch (error) {
    console.warn('[theme] lazyload rescan failed:', error);
  }

  call(theme.setHeaderHeightVars);
  call(theme.setHeaderLogoVars);
  call(theme.setHeaderStyle);
  call(theme.setUpHeaderResizeObservers);
}
