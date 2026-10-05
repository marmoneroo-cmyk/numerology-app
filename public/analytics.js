// ANALYTICS — fill the IDs below to activate (leave empty to disable).
// Turning one on also needs its hosts added to the Content-Security-Policy in vercel.json
// (script-src, connect-src and img-src), or the browser will block it.
window.GA4_ID = "";        // e.g. "G-XXXXXXXXXX"
window.META_PIXEL_ID = ""; // e.g. "1234567890"
window.CLARITY_ID = "";    // e.g. "abcdefghij"
(function () {
  if (window.GA4_ID) { var s = document.createElement('script'); s.async = 1; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.GA4_ID; document.head.appendChild(s); window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', window.GA4_ID); }
  if (window.CLARITY_ID) { (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, "clarity", "script", window.CLARITY_ID); }
  if (window.META_PIXEL_ID) { !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'); fbq('init', window.META_PIXEL_ID); fbq('track', 'PageView'); }
})();
