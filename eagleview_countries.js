/* Country picker for the Company invoice form on eagleview_payment.html.
   One searchable combobox (type to filter, arrow keys, Enter, Escape, screen-reader roles) over every
   country a company can sit in. Names come from the browser (Intl.DisplayNames), so there is no name list to
   keep in step; only the ISO code, the phone dial code and a few everyday aliases ("UK", "UAE", "Holland") live here.
   Territories nobody can be a company in (Antarctica, Bouvet Island and similar) are left out on purpose. */
(function () {
  'use strict';

  // ISO 3166-1 alpha-2 code immediately followed by the phone dial code. North American island nations carry
  // their area code (Jamaica 1876) so the phone box gets the full prefix.
  var DATA = ('AD376,AE971,AF93,AG1268,AI1264,AL355,AM374,AO244,AR54,AS1684,AT43,AU61,AW297,AX358,AZ994,' +
    'BA387,BB1246,BD880,BE32,BF226,BG359,BH973,BI257,BJ229,BL590,BM1441,BN673,BO591,BQ599,BR55,BS1242,BT975,BW267,BY375,BZ501,' +
    'CA1,CC61,CD243,CF236,CG242,CH41,CI225,CK682,CL56,CM237,CN86,CO57,CR506,CU53,CV238,CW599,CX61,CY357,CZ420,' +
    'DE49,DJ253,DK45,DM1767,DO1809,DZ213,EC593,EE372,EG20,EH212,ER291,ES34,ET251,' +
    'FI358,FJ679,FK500,FM691,FO298,FR33,' +
    'GA241,GB44,GD1473,GE995,GF594,GG44,GH233,GI350,GL299,GM220,GN224,GP590,GQ240,GR30,GT502,GU1671,GW245,GY592,' +
    'HK852,HN504,HR385,HT509,HU36,ID62,IE353,IL972,IM44,IN91,IO246,IQ964,IR98,IS354,IT39,' +
    'JE44,JM1876,JO962,JP81,KE254,KG996,KH855,KI686,KM269,KN1869,KP850,KR82,KW965,KY1345,KZ7,' +
    'LA856,LB961,LC1758,LI423,LK94,LR231,LS266,LT370,LU352,LV371,LY218,' +
    'MA212,MC377,MD373,ME382,MF590,MG261,MH692,MK389,ML223,MM95,MN976,MO853,MP1670,MQ596,MR222,MS1664,MT356,MU230,MV960,MW265,MX52,MY60,MZ258,' +
    'NA264,NC687,NE227,NF672,NG234,NI505,NL31,NO47,NP977,NR674,NU683,NZ64,OM968,' +
    'PA507,PE51,PF689,PG675,PH63,PK92,PL48,PM508,PN64,PR1787,PS970,PT351,PW680,PY595,QA974,' +
    'RE262,RO40,RS381,RU7,RW250,' +
    'SA966,SB677,SC248,SD249,SE46,SG65,SH290,SI386,SJ47,SK421,SL232,SM378,SN221,SO252,SR597,SS211,ST239,SV503,SX1721,SY963,SZ268,' +
    'TC1649,TD235,TG228,TH66,TJ992,TK690,TL670,TM993,TN216,TO676,TR90,TT1868,TV688,TW886,TZ255,' +
    'UA380,UG256,US1,UY598,UZ998,VA39,VC1784,VE58,VG1284,VI1340,VN84,VU678,WF681,WS685,XK383,YE967,YT262,ZA27,ZM260,ZW263').split(',');

  // Several countries share one dial code (+1, +44, +7 ...). The main one is listed first and is what a typed or pasted code means.
  var PRIMARY = ['US', 'GB', 'RU', 'AU', 'FI', 'IT', 'NO', 'NZ', 'MA', 'GP', 'RE', 'CW', 'NF'];

  // Other names people type for the same place (matched in addition to the name the browser gives).
  var ALIAS = {
    GB: 'uk england scotland wales britain', US: 'usa america', AE: 'uae emirates', KR: 'korea south korea',
    KP: 'dprk', NL: 'holland', CZ: 'czech republic', CI: 'ivory coast', MM: 'burma', TR: 'turkey',
    MK: 'macedonia', VA: 'vatican', RU: 'russia', CD: 'drc', TW: 'taiwan', SZ: 'swaziland', CV: 'cape verde',
    TL: 'east timor', HK: 'hong kong', MO: 'macau', FM: 'micronesia', PS: 'palestine'
  };

  // lower-case and drop accents, so "turkiye", "cote d'ivoire" and "Curacao" are all found by plain typing
  function norm(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  function dialLabel(d) { return d.charAt(0) === '1' && d.length > 1 ? '+1 ' + d.slice(1) : '+' + d; }

  function buildCountries() {
    var names = null;
    try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* very old browser: show codes */ }
    return DATA.map(function (item) {
      var code = item.slice(0, 2), dial = item.slice(2), name = (names && names.of(code)) || code;
      return { code: code, name: name, n: norm(name), dial: dial, dialText: dialLabel(dial),
        alias: ALIAS[code] ? ALIAS[code].split(' ').concat(norm(ALIAS[code])) : [] };
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'en'); });
  }

  var COUNTRIES = buildCountries();
  var LIST_SPACE = 270;  // px a full list needs: its max-height (see .cb-list in eagleview_payment.css) plus a margin

  // Lower is better, -1 is no match. 0 = exactly an alias ("uk" finds the United Kingdom before Ukraine), 1 = name starts
  // with the text, 2 = a word of the name does, 3 = name contains it, 4 = an alias starts with it, 5 = the dial code is
  // exactly this, 6 = the dial code starts with this.
  function rank(c, q) {
    var digits = q.replace(/\s/g, '');
    if (/^\+?\d+$/.test(digits)) {
      var d = digits.replace('+', '');
      return c.dial === d ? 5 : c.dial.indexOf(d) === 0 ? 6 : -1;
    }
    if (c.alias.indexOf(q) >= 0) return 0;
    if (c.n.indexOf(q) === 0) return 1;
    if (c.n.indexOf(' ' + q) >= 0) return 2;
    if (c.n.indexOf(q) >= 0) return 3;
    for (var i = 0; i < c.alias.length; i++) if (c.alias[i].indexOf(q) === 0) return 4;
    return -1;
  }

  function isPrimary(c) { return PRIMARY.indexOf(c.code) >= 0 ? 1 : 0; }

  function search(text) {
    var q = norm(text);
    if (!q) return COUNTRIES.slice();
    return COUNTRIES.map(function (c) { return { c: c, r: rank(c, q) }; })
      .filter(function (x) { return x.r >= 0; })
      // Equal rank: for dial codes the lower code first ("+4" lists +40, +41, +43 ...), then the main country of a shared code.
      .sort(function (a, b) {
        return (a.r - b.r) || (a.r >= 5 ? Number(a.c.dial) - Number(b.c.dial) : 0) || (isPrimary(b.c) - isPrimary(a.c));
      })
      .map(function (x) { return x.c; });
  }

  // The country whose name (or everyday alias, like "uk") is exactly what was typed, or null.
  function findExact(text) {
    var q = norm(text);
    if (!q) return null;
    for (var i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      if (c.n === q || c.alias.indexOf(q) >= 0) return c;
    }
    return null;
  }

  // The country a dial code belongs to ("44" -> United Kingdom), or null. For shared codes the main country wins.
  function byDial(dial) {
    var hit = null;
    for (var i = 0; i < COUNTRIES.length; i++) {
      if (COUNTRIES[i].dial === dial && (!hit || (isPrimary(COUNTRIES[i]) && !isPrimary(hit)))) hit = COUNTRIES[i];
    }
    return hit;
  }

  // For the phone-code box: "+91" or "91" means that code, anything else is looked up as a country name.
  function exactDial(text) {
    var t = String(text).trim();
    return /^\+?[\d\s]+$/.test(t) ? byDial(t.replace(/\D/g, '')) : findExact(t);
  }

  function byCode(code) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].code === code) return COUNTRIES[i];
    return null;
  }

  // The visitor's country from the browser language (en-IN -> India), or null when it only says "en".
  function guessCountry() {
    var langs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (var i = 0; i < langs.length; i++) {
      var m = /^[a-z]{2,3}-([A-Za-z]{2})\b/.exec(langs[i] || '');
      var c = m && byCode(m[1].toUpperCase());
      if (c) return c;
    }
    return null;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Name with the typed part marked, built from text nodes only (nothing is ever parsed as HTML).
  function nameNode(c, q) {
    var span = el('span', 'cb-name'), i = q ? c.n.indexOf(q) : -1;
    if (i < 0 || c.n.length !== c.name.length) { span.textContent = c.name; return span; }
    span.appendChild(document.createTextNode(c.name.slice(0, i)));
    span.appendChild(el('mark', '', c.name.slice(i, i + q.length)));
    span.appendChild(document.createTextNode(c.name.slice(i + q.length)));
    return span;
  }

  /* attach(input, list, opts): turns an <input> and an empty <ul> into the combobox.
     opts.onChange(country|null) runs whenever the chosen country changes; opts.format(country) is the text the box shows;
     opts.exact(text) finds the country for text typed without choosing. */
  function attach(input, list, opts) {
    var box = input.parentNode, onChange = (opts && opts.onChange) || function () {};
    // What the box shows once a country is chosen (default its name; the phone-code box shows "+91"), and how a typed
    // text is matched when the box is left without choosing from the list.
    var show = (opts && opts.format) || function (c) { return c.name; };
    var exact = (opts && opts.exact) || findExact;
    var chosen = null, shown = [], active = -1;

    function isOpen() { return !list.hidden; }

    function setChosen(c) {
      var changed = (c && c.code) !== (chosen && chosen.code);
      chosen = c;
      if (c) input.value = show(c);
      if (changed) onChange(c);
    }

    function paint(text) {
      var q = norm(text || '');
      shown = search(text);
      list.textContent = '';
      if (!shown.length) {
        list.appendChild(el('li', 'cb-none', 'No country found. Check the spelling.'));
        active = -1;
        input.removeAttribute('aria-activedescendant');
        return;
      }
      shown.forEach(function (c, i) {
        var li = el('li', 'cb-opt');
        li.id = 'cb-' + c.code;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', chosen && chosen.code === c.code ? 'true' : 'false');
        li.appendChild(nameNode(c, q));
        li.appendChild(el('span', 'cb-dial', c.dialText));
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        list.appendChild(li);
      });
    }

    function highlight(i, scroll) {
      var items = list.querySelectorAll('.cb-opt');
      if (!items.length) return;
      active = Math.max(0, Math.min(items.length - 1, i));
      for (var k = 0; k < items.length; k++) items[k].classList.toggle('act', k === active);
      input.setAttribute('aria-activedescendant', items[active].id);
      if (scroll) {
        var it = items[active];  // scroll the list itself only; scrollIntoView would also move the whole page
        if (it.offsetTop < list.scrollTop) list.scrollTop = it.offsetTop - 6;
        else if (it.offsetTop + it.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = it.offsetTop + it.offsetHeight - list.clientHeight + 6;
      }
    }

    function open() {
      if (isOpen()) return;
      // Showing a finished choice? offer the whole list. Otherwise filter by what is typed.
      paint(chosen ? '' : input.value);
      if (chosen) input.select();  // typing now replaces the finished choice instead of extending it
      list.hidden = false;
      // Not enough room below the field for a full list, and more room above? Open upward. Decided once per opening,
      // from the list's full height, so it does not flip back and forth while the typed text shortens the list.
      var r = input.getBoundingClientRect();
      var below = window.innerHeight - r.bottom, above = r.top;
      box.classList.toggle('up', below < LIST_SPACE && above > below);
      box.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
      var at = chosen ? shown.indexOf(chosen) : 0;
      highlight(at < 0 ? 0 : at, true);
    }

    function close() {
      list.hidden = true;
      box.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function choose(i) {
      if (shown[i]) setChosen(shown[i]);
      close();
    }

    // Entering the box selects what is in it, so typing replaces it ("Germanyuk" never happens). The first mouseup after
    // focusing is swallowed, otherwise the click would drop that selection straight away.
    var justFocused = false;
    input.addEventListener('focus', function () { justFocused = true; input.select(); open(); });
    input.addEventListener('mouseup', function (e) { if (justFocused) { e.preventDefault(); justFocused = false; } });
    input.addEventListener('click', open);

    input.addEventListener('input', function () {
      if (chosen) { chosen = null; onChange(null); }
      if (!isOpen()) { list.hidden = false; box.classList.add('open'); input.setAttribute('aria-expanded', 'true'); }
      paint(input.value);
      highlight(0, true);
      list.scrollTop = 0;
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        highlight(active + (e.key === 'ArrowDown' ? 1 : -1), true);
      } else if (e.key === 'Enter' && isOpen()) {
        e.preventDefault();  // choosing a country must not submit the form
        if (active >= 0) choose(active);
      } else if (e.key === 'Escape' && isOpen()) {
        e.preventDefault();
        close();
      }
    });

    // Leaving the box: a typed name that is exactly a country (or "uk", "uae"...) counts as chosen.
    input.addEventListener('blur', function () {
      close();
      if (!chosen) { var c = exact(input.value); if (c) setChosen(c); }
    });

    return {
      get: function () { return chosen; },
      set: function (c) { setChosen(c); }
    };
  }

  window.CountryPicker = { attach: attach, guess: guessCountry, byCode: byCode, byDial: byDial, all: COUNTRIES, search: search, findExact: findExact, exactDial: exactDial };
})();
