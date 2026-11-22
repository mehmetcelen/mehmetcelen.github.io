// Small additions on top of Sveltia CMS (see panel.css; the parts that must be registered before
// the panel starts are in panel-kayit.js):
// 1. a welcome strip with the editor's first name and shortcut buttons,
// 2. the "Sveltia CMS is now available on mobile" notice is hidden for everyone,
// 3. messages after a save: warnings, "Kaydedildi" and, once the site is rebuilt, "Yayında",
// 4. a jump to the first field with an error when a save is refused,
// 5. text pasted from Word arrives clean, with its footnotes.
(function () {
  var strip = document.createElement('div');
  strip.className = 'hosgeldin';
  strip.hidden = true;
  strip.innerHTML =
    '<div class="hosgeldin-metin"><strong><span data-ad></span> <span class="hosgeldin-el" aria-hidden="true">👋</span></strong>' +
    '<span>Bugün ne paylaşmak istersin? Aşağıdan başlayabilirsin.</span></div>' +
    '<nav class="hosgeldin-dugmeler" aria-label="Kısayollar">' +
    // Ready starts: the address fills in the category or type, so the form opens half done.
    // https://decapcms.org/docs/dynamic-default-values/
    '<a class="ana" href="#/collections/yazilar/new?category=makaleler">✍️ Yeni makale</a>' +
    '<a href="#/collections/yazilar/new?category=haberler">📰 Haber</a>' +
    '<a href="#/collections/konusmalar/new?type=konferans">🎙️ Konuşma</a>' +
    '<a href="#/collections/kitaplar/new">📚 Kitap</a>' +
    '<a href="#/collections/yazilar/new?category=videolar">🎬 Video</a>' +
    '<a href="#/assets">🖼️ Görseller</a>' +
    '<a href="/admin/yardim/" target="_blank" rel="noopener">❓ Yardım</a>' +
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

  var leaving = false;

  function update() {
    var main = document.querySelector('.app-shell .main');
    // On a phone the panel has a bottom bar instead of the top toolbar.
    var signedIn = main && main.querySelector('.toolbar-wrapper, .bottom-navigation');
    // Not shown while writing: the editor needs the room.
    var editing = /\/(new|entries)(\/|$)/.test(location.hash);
    if (signedIn && strip.parentElement !== main) main.prepend(strip);
    var name = firstName();
    strip.querySelector('[data-ad]').textContent = name ? 'Hoş geldin, ' + name + '!' : 'Hoş geldin!';
    strip.hidden = !signedIn || editing;

    // Simple login (/admin): the editors never see GitHub. When the session has ended or the editor
    // signed out, Sveltia empties its stored user and shows its own sign-in button; we show our own
    // login again instead. While Sveltia is still signing in, the stored session is there: do nothing.
    if (!signedIn && location.pathname.indexOf('/admin-github') !== 0 && !leaving) {
      var button = Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return /GitHub/.test(b.textContent || ''); });
      var session = false;
      try { session = !!(JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null') || {}).token; } catch (e) {}
      // Right after a sign-in a missing session means the panel refused it: stay, so its error can be read
      // (otherwise the page would go round in circles).
      var justSignedIn = false;
      try { justSignedIn = Date.now() - Number(sessionStorage.getItem('mc-login-at') || 0) < 20000; } catch (e) {}
      if (button && !session && !justSignedIn) { leaving = true; location.reload(); }
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

// ---------- Messages: saved, live, warnings ----------
(function () {
  var box = document.createElement('div');
  box.className = 'mc-bildirim-kutu';
  box.setAttribute('aria-live', 'polite');
  document.body.appendChild(box);

  function bildir(kind, icon, title, html, life) {
    var el = document.createElement('div');
    el.className = 'mc-bildirim ' + kind;
    el.innerHTML = '<span class="simge" aria-hidden="true"></span><strong></strong><button type="button" aria-label="Kapat">×</button><div class="metin"></div>';
    el.querySelector('.simge').textContent = icon;
    el.querySelector('strong').textContent = title;
    el.querySelector('.metin').innerHTML = html;
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
    box.appendChild(el);
    if (life) setTimeout(function () { el.remove(); }, life);
    return el;
  }
  function esc(text) { return String(text == null ? '' : text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.mcBildir = bildir;

  window.addEventListener('mc-uyari', function (event) {
    var notes = event.detail || [];
    if (notes.length) bildir('uyari', '💡', 'Kaydedildi, ama bir göz atın', '<ul>' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>', 30000);
  });

  // Where the panel reaches GitHub: through our login Worker, or directly on the spare /admin-github/ door.
  var direct = location.pathname.indexOf('/admin-github') === 0;
  var API = direct ? 'https://api.github.com' : 'https://mehmetcelen-cms-login.corporate-translator.workers.dev/api/v3';
  var REPO = 'mehmetcelen/mehmetcelen-source';
  function token() { try { return (JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null') || {}).token || ''; } catch (e) { return ''; } }
  // The newest commit on main, as plain text. https://docs.github.com/en/rest/commits/commits#get-a-commit
  function latest() {
    return fetch(API + '/repos/' + REPO + '/commits/main', { headers: { Authorization: 'token ' + token(), Accept: 'application/vnd.github.sha' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { return /^[0-9a-f]{40}$/.test(t.trim()) ? t.trim() : ''; }).catch(function () { return ''; });
  }
  function live() {
    return fetch('/surum.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return j.sha || ''; }).catch(function () { return ''; });
  }
  // Texts that also exist in English or Arabic: those versions are written by hand and do not follow
  // a change in the Turkish text. Said once per text and session, not on every save.
  var translated = null, told = {};
  function translations(d) {
    var id = d.collection + '/' + d.slug;
    if (!d.slug || told[id]) return;
    (translated || (translated = fetch('/admin/ceviriler.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }))).then(function (list) {
      var langs = list[id];
      if (!langs || !langs.length || told[id]) return;
      told[id] = true;
      var names = langs.map(function (l) { return { en: 'İngilizce', ar: 'Arapça' }[l] || l; }).join(' ve ');
      bildir('uyari', '🌍', 'Bu yazının ' + names + ' çevirisi var', 'Çeviriler kendiliğinden değişmez. Metinde anlamı değiştiren bir düzeltme yaptıysanız Agah’a haber verin, çeviri de güncellensin. Küçük yazım düzeltmeleri için gerek yok.', 25000);
    });
  }
  var PATHS = { yazilar: '/yazilar/', konusmalar: '/konusma/', kitaplar: '/kitaplar/', sayfalar: '/' };
  var watch = 0;

  window.addEventListener('mc-kaydedildi', function (event) {
    var d = event.detail || {}, mine = ++watch;
    box.querySelectorAll('.mc-bildirim.bekliyor').forEach(function (el) { el.remove(); });
    translations(d);
    if (d.draft) { bildir('tamam', '📝', 'Taslak kaydedildi', 'Taslaklar sitede görünmez. Hazır olunca "Taslak" işaretini kaldırıp yeniden kaydedin.', 12000); return; }
    var wait = bildir('bekliyor', '⏳', 'Kaydedildi! Site güncelleniyor…', 'Yaklaşık 2 dakika sürer. Bu pencereyi kapatmadan çalışmaya devam edebilirsiniz.<div class="cubuk"><i></i></div>');
    var bar = wait.querySelector('.cubuk i'), started = Date.now(), LIMIT = 8 * 60 * 1000;
    var page = PATHS[d.collection] && d.slug ? PATHS[d.collection] + d.slug + '/' : '/';
    function tick() {
      if (mine !== watch || !wait.isConnected) return;
      var passed = Date.now() - started;
      bar.style.width = Math.min(95, passed / 1300) + '%';
      Promise.all([latest(), live()]).then(function (r) {
        if (mine !== watch) return;
        if (r[0] && r[0] === r[1]) {
          wait.remove();
          bildir('tamam', '🎉', 'Yayında!', 'Değişikliğiniz artık sitede. <a href="' + esc(page) + '?v=' + r[0].slice(0, 7) + '" target="_blank" rel="noopener">Sayfayı aç</a>', 60000);
        } else if (passed > LIMIT) {
          wait.remove();
          bildir('uyari', '⏰', 'Site henüz güncellenmedi', 'Yazınız kaydedildi ve güvende. Birkaç dakika sonra siteye tekrar bakın; yine görünmüyorsa Agah’a haber verin.');
        } else setTimeout(tick, 10000);
      });
    }
    // The first check waits a little: the save has to reach GitHub first.
    setTimeout(tick, 8000);
  });

  // A refused save (an empty required field, for example) shows its reason next to the field,
  // which may be far up or down the page: go there and say so.
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('button');
    if (!button || !/^(Kaydet|Save|Yayımla|Publish)/.test((button.textContent || '').trim())) return;
    setTimeout(function () {
      var bad = document.querySelector('[role="alert"], .validation');
      var field = bad && (bad.closest('section[data-key-path]') || bad);
      if (!field || !bad.textContent.trim()) return;
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      bildir('uyari', '✋', 'Kaydedilemedi', 'Bir alan eksik ya da hatalı. Sizi o alana götürdük; kırmızı yazıyı okuyup düzeltin, sonra yeniden kaydedin.', 12000);
    }, 500);
  }, true);
})();

// ---------- Paste from Word ----------
// Word puts its footnotes at the end of the copied text and links to them with "[1]" marks, which
// would arrive as broken links. Here every mark becomes a real footnote, ^[note], at its place
// (see src/lib/remark-dipnot.mjs) and Word's footnote list is dropped. Other pastes are not touched.
(function () {
  var again = false;
  document.addEventListener('paste', function (event) {
    if (again || !event.clipboardData) return;
    var html = event.clipboardData.getData('text/html');
    if (!html || !/_ftnref|MsoFootnote|_ednref/.test(html)) return;
    var target = event.target;
    if (!(target.closest && target.closest('[contenteditable="true"]'))) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var notes = {};
    doc.querySelectorAll('div[id^="ftn"], div[id^="edn"]').forEach(function (div) {
      var copy = div.cloneNode(true);
      copy.querySelectorAll('a[href^="#_ftnref"], a[href^="#_ednref"]').forEach(function (a) { a.remove(); });
      notes[div.id] = copy.textContent.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
      div.remove();
    });
    var found = 0, missing = 0;
    doc.querySelectorAll('a[href^="#_ftn"], a[href^="#_edn"]').forEach(function (a) {
      var id = (a.getAttribute('href') || '').slice(2);
      if (/ref/.test(id)) { a.remove(); return; }
      var note = notes[id];
      if (note) { found += 1; a.replaceWith(doc.createTextNode('^[' + note + ']')); } else { missing += 1; a.replaceWith(doc.createTextNode(a.textContent)); }
    });
    // What is left of Word's footnote area (a line and empty boxes).
    doc.querySelectorAll('hr, br[clear]').forEach(function (el) { if (!el.nextElementSibling || !el.nextElementSibling.textContent.trim()) el.remove(); });
    event.preventDefault();
    event.stopImmediatePropagation();
    var data = new DataTransfer();
    data.setData('text/html', doc.body.innerHTML);
    data.setData('text/plain', doc.body.textContent);
    again = true;
    try { target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); } finally { again = false; }
    if (window.mcBildir) {
      if (found) window.mcBildir('tamam', '📎', found + ' dipnot yerine yerleştirildi', 'Word’deki dipnotlar metnin içine alındı. Sağdaki önizlemede her biri [dipnot] olarak görünür.', 15000);
      if (missing) window.mcBildir('uyari', '💡', 'Dipnot metinleri gelmedi', missing + ' dipnot işareti var ama metinleri kopyalanmamış. Word’de bütün yazıyı (Ctrl+A) seçip kopyalarsanız dipnotlar da gelir.', 25000);
    }
  }, true);
})();
