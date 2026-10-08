/* Drive product page behavior. Buy box: sections/reserve-drive-pdp.liquid. Supplement facts
   dialog: sections/reserve-drive-ingredients.liquid. Closing banner: sections/reserve-drive-cta.liquid.
   Several Drive sections load this file, so it guards against running twice. */
(function () {
  if (window.ReserveDrivePdp) return;
  window.ReserveDrivePdp = true;

  function initBuy(root) {
    if (!root || root.hasAttribute('data-dp-ready')) return;
    root.setAttribute('data-dp-ready', '');

    var main = root.querySelector('.dp-main-img');
    var mainPh = root.querySelector('[data-dp-main-ph]');
    var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-dp-thumb]'));
    var current = function () {
      for (var k = 0; k < thumbs.length; k++) if (thumbs[k].getAttribute('aria-current') === 'true') return k;
      return 0;
    };
    // Real slots swap the main image; placeholder slots show their placeholder graphic instead.
    var show = function (i) {
      var t = thumbs[i];
      if (!t) return;
      if (t.hasAttribute('data-dp-ph')) {
        if (!mainPh) return;
        mainPh.innerHTML = t.innerHTML;
        mainPh.hidden = false;
        if (main) main.hidden = true;
      } else {
        if (!main) return;
        main.hidden = false;
        main.removeAttribute('srcset');
        main.src = t.getAttribute('data-src');
        main.alt = t.getAttribute('data-alt') || '';
        if (mainPh) mainPh.hidden = true;
      }
      thumbs.forEach(function (x, k) { if (k === i) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
    };
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
    var prev = root.querySelector('[data-dp-prev]');
    var next = root.querySelector('[data-dp-next]');
    if (prev) prev.addEventListener('click', function () { show((current() - 1 + thumbs.length) % thumbs.length); });
    if (next) next.addEventListener('click', function () { show((current() + 1) % thumbs.length); });

    var panel = root.querySelector('[data-dp-form]');
    var form = panel && panel.querySelector('form');
    if (form) {
      var qty = form.querySelector('input[name="quantity"]');
      var setQty = function (v) { qty.value = Math.max(1, parseInt(v, 10) || 1); };
      var dec = form.querySelector('[data-dp-dec]');
      var inc = form.querySelector('[data-dp-inc]');
      if (qty && dec) dec.addEventListener('click', function () { setQty(Number(qty.value) - 1); });
      if (qty && inc) inc.addEventListener('click', function () { setQty(Number(qty.value) + 1); });
      if (qty) qty.addEventListener('change', function () { setQty(qty.value); });

      var prices = {};
      try { prices = JSON.parse(panel.querySelector('[data-dp-prices]').textContent); } catch (e) {}
      var servings = parseInt(panel.getAttribute('data-servings'), 10) || 0;
      var fmt = new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency: root.getAttribute('data-currency') || 'USD' });
      var addPrice = form.querySelector('[data-dp-add-price]');
      var perPrice = form.querySelector('[data-dp-per-price]');
      // The Recharge widget writes a hidden selling_plan input into this form; read it to price the selection.
      var render = function () {
        var fd = new FormData(form);
        var v = prices[fd.get('id')] || prices[Object.keys(prices)[0]];
        if (!v) return;
        var plan = fd.get('selling_plan');
        var unit = plan && v.s[plan] != null ? v.s[plan] : v.p;
        var q = Math.max(1, parseInt(fd.get('quantity'), 10) || 1);
        if (addPrice) addPrice.textContent = fmt.format(unit * q / 100);
        if (perPrice && servings > 0) perPrice.textContent = fmt.format(Math.round(unit / servings) / 100);
      };
      var select = form.querySelector('[data-dp-variant-select]');
      var idInput = form.querySelector('[data-dp-variant-id]');
      if (select && idInput) select.addEventListener('change', function () { idInput.value = select.value; render(); });
      var later = function () { setTimeout(render, 30); setTimeout(render, 300); };
      ['click', 'input', 'change', 'keyup'].forEach(function (t) { form.addEventListener(t, later); });
      [0, 800, 2000, 4000].forEach(function (ms) { setTimeout(render, ms); });
    }

    var sticky = root.querySelector('[data-dp-sticky]');
    var buy = root.querySelector('.dp-buy-row');
    if (sticky && buy) {
      // Show the bar once the buy button has scrolled above the viewport, until the closing banner
      // (its own section) comes into view. Checked on scroll so jumps past the button still count.
      var ticking = false;
      var update = function () {
        ticking = false;
        if (!buy.isConnected) return;
        var close = document.querySelector('.dp-close');
        var on = buy.getBoundingClientRect().bottom < 0 && (!close || close.getBoundingClientRect().top > window.innerHeight);
        sticky.classList.toggle('is-on', on);
        if (on) sticky.removeAttribute('inert'); else sticky.setAttribute('inert', '');
      };
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      }, { passive: true });
      update();
    }
  }

  // The facts dialog lives in the ingredients section; buttons anywhere on the page open it,
  // and hide themselves when that section has been removed.
  function initFacts() {
    var dlg = document.querySelector('.dp-sfd');
    if (dlg && dlg.showModal && !dlg.hasAttribute('data-dp-ready')) {
      dlg.setAttribute('data-dp-ready', '');
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      var x = dlg.querySelector('[data-dp-sf-close]');
      if (x) x.addEventListener('click', function () { dlg.close(); });
    }
    document.querySelectorAll('[data-dp-sf-open]').forEach(function (btn) {
      btn.style.display = dlg ? '' : 'none';
      if (btn.hasAttribute('data-dp-ready')) return;
      btn.setAttribute('data-dp-ready', '');
      btn.addEventListener('click', function () {
        var d = document.querySelector('.dp-sfd');
        if (d && d.showModal) d.showModal();
      });
    });
  }

  function initAll() {
    document.querySelectorAll('[data-dp-root]').forEach(initBuy);
    initFacts();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
  document.addEventListener('shopify:section:load', initAll);
  document.addEventListener('shopify:section:unload', function () { setTimeout(initFacts, 0); });
})();