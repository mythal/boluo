if (typeof document !== 'undefined') {
  const head = document.head;
  if (head) {
    const selectors = ["link[rel='icon']", "link[rel='shortcut icon']"];
    const faviconUrl = '/boluo-pixel.png';

    selectors.forEach((selector) => {
      const existing = head.querySelector<HTMLLinkElement>(selector);
      if (existing) {
        existing.type = 'image/png';
        existing.href = faviconUrl;
      }
    });

    if (!head.querySelector("link[rel='icon']")) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = faviconUrl;
      head.appendChild(link);
    }
  }
}
