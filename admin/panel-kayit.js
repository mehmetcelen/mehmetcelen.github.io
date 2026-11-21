// Additions to Sveltia CMS that must be registered before the panel starts (index.html loads this
// file between the CMS script and CMS.init()). The welcome strip and other page tweaks are in panel.js.
// API of the CMS object: https://sveltiacms.app/en/docs/api
(function () {
  var CMS = window.CMS;
  if (!CMS) return;
  var R = CMS.React, e = R.createElement;
  // A broken addition must never stop the panel from opening.
  function safely(name, fn) { try { fn(); } catch (error) { console.warn('[panel] ' + name, error); } }

  // ---------- 1. Preview that looks like the real site ----------
  // The site's own stylesheet (fixed file name, see astro.config.mjs) is used in the preview pane.
  // https://sveltiacms.app/en/docs/api/preview-styles  https://sveltiacms.app/en/docs/api/preview-templates
  var KATEGORI = { makaleler: 'Makaleler', egitim: 'Eğitim', sorular: 'Sorular', haberler: 'Haberler', videolar: 'Videolar' };
  var TUR = { konferans: 'Konferans', seminer: 'Seminer', panel: 'Panel', 'sempozyum-ulusal': 'Ulusal Sempozyum', 'sempozyum-uluslararasi': 'Uluslararası Sempozyum', roportaj: 'Röportaj' };
  var AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  function tarih(value) {
    var d = value ? new Date(value) : null;
    return d && !isNaN(d) ? d.getDate() + ' ' + AYLAR[d.getMonth()] + ' ' + d.getFullYear() : '';
  }
  function onizleme(kind) {
    return function (props) {
      var get = function (k) { return props.entry.getIn(['data', k]); };
      var label = kind === 'yazilar' ? KATEGORI[get('category')] || 'Yazı' : kind === 'konusmalar' ? TUR[get('type')] || 'Konuşma' : 'Kitaplar';
      var meta = kind === 'kitaplar' ? [get('publisher'), get('year')].filter(Boolean).join(', ') : [tarih(get('date')), get('event'), get('place')].filter(Boolean).join(', ');
      var topics = get('topics');
      topics = topics && topics.toJS ? topics.toJS() : topics || [];
      return e('div', { className: 'wrap' },
        e('article', { className: 'makale' },
          e('header', null,
            e('span', { className: 'kat' }, label),
            e('h1', { dir: 'auto' }, get('title') || 'Başlık burada görünür'),
            meta ? e('p', { className: 'kunye' }, e('span', { className: 'rozet' }, meta)) : null),
          get('cover') ? e('figure', { className: 'kapak' }, props.widgetFor('cover')) : null,
          get('summary') ? e('p', { className: 'onizleme-ozet' }, get('summary')) : null,
          e('div', { className: 'icerik' }, props.widgetFor('body')),
          topics.length ? e('p', { className: 'konu-satir' }, e('span', null, 'Konular'), topics.map(function (t) { return e('span', { className: 'konu-etiket', key: t }, t); })) : null));
    };
  }
  safely('preview', function () {
    CMS.registerPreviewStyle('/_astro/Base.css');
    CMS.registerPreviewStyle(
      'body{padding:0 0 3rem}.makale{padding-block:1.5rem 2rem}.kapak img{max-width:100%;height:auto;border-radius:10px}' +
      '.onizleme-ozet{font-family:var(--sans);color:var(--muted);border-inline-start:3px solid var(--rule);padding-inline-start:.9rem;margin:0 0 1.5rem}' +
      '.icerik sup.dipnot-isaret{color:var(--accent);font-family:var(--sans);font-weight:600;cursor:help}',
      { raw: true });
    ['yazilar', 'konusmalar', 'kitaplar'].forEach(function (kind) { CMS.registerPreviewTemplate(kind, onizleme(kind)); });
  });

  // ---------- 2. Footnote button ----------
  // Insert menu > Dipnot asks for the note and writes it into the text as ^[note]. The site turns
  // these into numbered footnotes when it is built (src/lib/remark-dipnot.mjs). The older way,
  // [^1] in the text and "[^1]: note" at the end, keeps working.
  // https://sveltiacms.app/en/docs/api/editor-components
  function sor(title, value) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'mc-pencere-arka';
      back.innerHTML = '<form class="mc-pencere" role="dialog" aria-modal="true"><h2></h2><p>Dipnot, yazının sonunda numarasıyla birlikte görünür. Yalnızca düz metin yazın.</p>' +
        '<textarea rows="4" required maxlength="1500"></textarea><div class="mc-pencere-dugmeler"><button type="button" data-vazgec>Vazgeç</button><button type="submit" class="ana">Tamam</button></div></form>';
      back.querySelector('h2').textContent = title;
      var area = back.querySelector('textarea');
      area.value = value || '';
      function close(result) { back.remove(); resolve(result); }
      back.querySelector('[data-vazgec]').addEventListener('click', function () { close(null); });
      back.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(null); });
      back.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        // Square brackets and line breaks would break the mark in the text.
        var text = area.value.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
        close(text ? { not: text } : null);
      });
      document.body.appendChild(back);
      area.focus();
    });
  }
  safely('footnote', function () {
    CMS.registerEditorComponent({
      id: 'dipnot',
      label: 'Dipnot',
      icon: 'superscript',
      type: 'inline',
      pattern: /\^\[(?<not>[^\]]+?)\]/,
      trigger: '^[',
      toInline: function (data) { return data && data.not ? '^[' + data.not + ']' : ''; },
      toPreview: function (data) {
        var sup = document.createElement('sup');
        sup.className = 'dipnot-isaret';
        sup.textContent = '[dipnot]';
        sup.title = (data && data.not) || '';
        return sup;
      },
      onInsert: function () { return sor('Dipnot ekle', ''); },
      onEdit: function (context) { return sor('Dipnotu düzelt', context.data && context.data.not); },
    });
  });

  // ---------- 3. Checks before saving, and the "Yayında" message after it ----------
  // https://sveltiacms.app/en/docs/api/events
  function plain(markdown) {
    return String(markdown || '').replace(/\^\[[^\]]*\]/g, '').replace(/\[\^[^\]]+\]/g, '').replace(/[*_]/g, '').replace(/\s+/g, ' ');
  }
  safely('events', function () {
    CMS.registerEventListener({
      name: 'preSave',
      handler: function (args) {
        var data = args.entry.get('data');
        if (!data || !data.get) return;
        var notes = [];
        var body = data.get('body');
        var quotes = data.get('quotes');
        quotes = quotes && quotes.toJS ? quotes.toJS() : quotes || [];
        var text = plain(body);
        quotes.forEach(function (q) {
          var sentence = plain(typeof q === 'string' ? q : q && q.quote).trim();
          if (sentence && text.indexOf(sentence) < 0) notes.push('“' + sentence.slice(0, 60) + '…” cümlesi metinde harfi harfine bulunamadı, sitede gösterilmeyecek.');
        });
        if (quotes.length > 3) notes.push('En fazla 3 öne çıkan cümle gösterilmesi önerilir.');
        if (data.get('cover') && !data.get('cover_alt')) notes.push('Kapak görselinin açıklaması boş. Görme engelli okurlar için bir cümle yazmanız iyi olur.');
        if (typeof body === 'string' && /\[\^[^\]]+\](?!:)/.test(body) && !/^\[\^[^\]]+\]:/m.test(body)) notes.push('Metinde [^1] gibi bir dipnot işareti var ama en altta karşılığı yok.');
        window.dispatchEvent(new CustomEvent('mc-uyari', { detail: notes }));
      },
    });
    CMS.registerEventListener({
      name: 'postSave',
      handler: function (args) {
        var entry = args.entry;
        window.dispatchEvent(new CustomEvent('mc-kaydedildi', {
          detail: { collection: entry.get('collection'), slug: entry.get('slug'), draft: !!entry.getIn(['data', 'draft']), title: entry.getIn(['data', 'title']) },
        }));
      },
    });
  });

  // ---------- 4. Extra pages in the panel's own menu ----------
  // https://sveltiacms.app/en/docs/api/custom-pages
  // They talk to the simple login Worker, so the spare GitHub door (/admin-github/) does not get them.
  safely('pages', function () {
    if (location.pathname.indexOf('/admin-github') === 0) return;
    CMS.registerCustomPage({ id: 'baslangic', label: 'Başlangıç', icon: 'home', url: '/admin/baslangic/' });
    CMS.registerCustomPage({ id: 'gecmis', label: 'Son değişiklikler', icon: 'history', url: '/admin/gecmis/' });
    CMS.registerCustomPage({ id: 'yardim', label: 'Yardım', icon: 'help', url: '/admin/yardim/' });
    CMS.registerCustomPage({ id: 'sifre', label: 'Şifrem', icon: 'key', url: '/admin/sifre/' });
  });
})();
