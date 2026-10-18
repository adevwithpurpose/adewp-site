# adewp-site

Source for [adevwithpurpose.com](https://adevwithpurpose.com) - one-page static site, no framework, no build step.

- `index.html` - the page
- `assets/css/styles.css` - "The Network" identity, mobile-first
- `assets/js/main.js` - GSAP scenes + lazy Three.js hero (ES module)
- `assets/js/vendor/` - vendored GSAP, ScrollTrigger, Three.js (no CDN at runtime)
- `.cpanel.yml` - cPanel Git Version Control pull-deploy tasks

Fallbacks: mobile and `prefers-reduced-motion` get the static page; Three.js loads only on desktop.
