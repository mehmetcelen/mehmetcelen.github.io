// Small additions on top of Sveltia CMS (see panel.css):
// 1. a welcome strip with the editor's first name and shortcut buttons,
// 2. the "Sveltia CMS is now available on mobile" notice is hidden for everyone.
(function () {
  var strip = document.createElement('div');
  strip.className = 'hosgeldin';
  strip.hidden = true;
  strip.innerHTML =
    '<div class="hosgeldin-metin"><strong><span data-ad></span> <span class="hosgeldin-el" aria-hidden="true">👋</span></strong>' +
    '<span>Bugün ne paylaşmak istersin? Aşağıdan başlayabilirsin.</span></div>' +
    '<nav class="hosgeldin-dugmeler" aria-label="Kısayollar">' +
    '<a class="ana" href="#/collections/yazilar/new">✍️ Yeni yazı</a>' +
    '<a href="#/collections/kitaplar/new">📚 Yeni kitap</a>' +
    '<a href="#/collections/konusmalar/new">🎙️ Yeni konuşma</a>' +
    '<a href="#/assets">🖼️ Görseller</a>' +
    '<a href="/" target="_blank" rel="noopener">🌐 Siteyi gör</a></nav>';

  // Only the display name is read from what Sveltia stores about the signed-in user.
  function firstName() {
    try {
      var user = JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null');
      var name = user && (user.name || user.login);
      return name ? String(name).trim().split(/\s+/)[0] : '';
    } catch (e) {
      return '';
    }
  }

  function update() {
    var main = document.querySelector('.app-shell .main');
    var signedIn = main && main.querySelector('.toolbar-wrapper');
    // Not shown while writing: the editor needs the room.
    var editing = /\/(new|entries)(\/|$)/.test(location.hash);
    if (signedIn && strip.parentElement !== main) main.prepend(strip);
    var name = firstName();
    strip.querySelector('[data-ad]').textContent = name ? 'Hoş geldin, ' + name + '!' : 'Hoş geldin!';
    strip.hidden = !signedIn || editing;

    // With the simple login the editors never see GitHub, so the sign-in button should not name it.
    if (!signedIn && location.pathname.indexOf('/panel') === 0) {
      document.querySelectorAll('button').forEach(function (button) {
        var label = button.querySelector('.label') || button;
        if (/GitHub/.test(label.textContent || '') && !label.querySelector('button')) label.textContent = 'Giriş yap';
      });
    }

    document.querySelectorAll('.infobar').forEach(function (bar) {
      if (/mobil/i.test(bar.textContent || '')) bar.style.display = 'none';
    });
  }

  var waiting = false;
  new MutationObserver(function () {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(function () { waiting = false; update(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', update);
  update();
})();
