// Shared by the extra admin pages (Başlangıç, Son değişiklikler, Şifrem). They are shown inside the
// panel and use the session the panel already has; they never see or store a password.
(function () {
  var direct = false;
  try { direct = top.location.pathname.indexOf('/admin-github') === 0; } catch (e) {}
  var LOGIN = 'https://mehmetcelen-cms-login.corporate-translator.workers.dev';
  var mc = (window.mc = {
    LOGIN: LOGIN,
    REPO: 'mehmetcelen/mehmetcelen-source',
    direct: direct,
    API: direct ? 'https://api.github.com' : LOGIN + '/api/v3',
    user: function () { try { return JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null') || {}; } catch (e) { return {}; } },
    // A call to the content repository on GitHub. https://docs.github.com/en/rest
    gh: function (path, init) {
      init = init || {};
      init.headers = Object.assign({ Authorization: 'token ' + (mc.user().token || ''), Accept: 'application/vnd.github+json' }, init.headers || {});
      init.cache = 'no-store';
      return fetch(mc.API + '/repos/' + mc.REPO + path, init).then(function (r) {
        if (r.status === 401) throw new Error('oturum');
        if (!r.ok) throw new Error('github ' + r.status);
        return (init.headers.Accept || '').indexOf('sha') > 0 ? r.text() : r.json();
      });
    },
    esc: function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },
    ago: function (iso) {
      var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (m < 1) return 'az önce';
      if (m < 60) return m + ' dakika önce';
      if (m < 60 * 24) return Math.round(m / 60) + ' saat önce';
      if (m < 60 * 24 * 14) return Math.round(m / 1440) + ' gün önce';
      return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    // "İçerik: yazilar "x" güncellendi" plus "Editör: Ad (id)" from the commit message.
    read: function (commit) {
      var lines = String(commit.commit.message || '').split('\n');
      var who = (String(commit.commit.message).match(/Editör:\s*([^(\n]+)/) || [])[1];
      return { title: lines[0], who: who ? who.trim() : commit.commit.author && /bot|\[bot\]/i.test(commit.commit.author.name) ? 'Otomatik' : (commit.commit.author || {}).name || '', when: (commit.commit.author || {}).date };
    },
    fail: function (el, error) {
      el.innerHTML = String(error && error.message) === 'oturum'
        ? '<p class="not uyari">Oturumunuzun süresi dolmuş. Sayfayı yenileyip yeniden giriş yapın.</p>'
        : '<p class="not uyari">Bilgiler şu anda alınamadı. Biraz sonra yeniden deneyin.</p>';
    },
  });
})();
