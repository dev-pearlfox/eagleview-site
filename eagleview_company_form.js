/* Company License invoice form on eagleview_payment.html: shows the form, wires the country and phone-code pickers, and
   checks every field with the rules in eagleview_company_rules.js.
   How a field behaves:
     - it only accepts characters that make sense for it (no letters in the phone box);
     - its message appears under it once you have left it, and updates as you fix it;
     - "Send by email" checks everything, marks every problem, and jumps to the first one;
     - only when all fields are valid does the buyer's mail app open, with a ready-to-send message. */
(function () {
  'use strict';
  var R = window.CompanyRules, CP = window.CountryPicker;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('coForm'), openBtn = $('coRequest');
  if (!form || !openBtn || !R) return;

  var F = { name: $('coName'), domain: $('coDomain'), email: $('coEmail'), country: $('coCountry'), tax: $('coTax'),
            addr: $('coAddr'), dial: $('coDial'), phone: $('coPhone') };
  var summary = $('coErr');
  var picker = null, dialPicker = null, dialAuto = true, settingDial = false, submitted = false, touched = {};

  function isIndia() { return !!picker && !!picker.get() && picker.get().code === 'IN'; }
  function setDial(c) { settingDial = true; dialPicker.set(c); settingDial = false; }

  // ---- pickers --------------------------------------------------------------------------------------------------
  function onCountry(c) {
    var india = isIndia();
    F.tax.placeholder = !c ? 'GSTIN / Tax ID (optional)' : india ? 'GSTIN (if registered)' : 'Tax or VAT ID (optional)';
    F.tax.setAttribute('aria-label', F.tax.placeholder);
    F.tax.value = R.filter.tax(F.tax.value, india);  // India allows letters and digits only, so tidy what is already typed
    // The phone code follows the country until the buyer picks a code themselves (a company in India can have a contact abroad).
    if (c && dialPicker && dialAuto) setDial(c);
    refresh();
  }
  if (CP) {
    picker = CP.attach(F.country, $('coCountryList'), { onChange: onCountry });
    dialPicker = CP.attach(F.dial, $('coDialList'), {
      format: function (c) { return c.dialText; }, exact: CP.exactDial,
      onChange: function (c) { if (c && !settingDial) dialAuto = false; refresh(); }  // only a code the buyer chose stops it following the country
    });
  } else {
    $('coDialBox').hidden = true;  // picker file missing: plain country box, and the phone is typed with its code
    $('coDialBox').parentNode.style.display = 'block';
  }

  /* A number pasted with its code ("+91 98765 43210") is split: the longest matching code goes to the code box, the rest stays
     in the number box. Done on paste and when leaving the box, never while typing, so "+1" then "876" is not misread. */
  function splitPastedCode() {
    var t = F.phone.value.trim();
    if (!dialPicker || t.charAt(0) !== '+') return;
    var digits = t.replace(/\D/g, '');
    for (var n = 4; n >= 1; n--) {
      var c = CP.byDial(digits.slice(0, n));
      if (c) { setDial(c); dialAuto = false; F.phone.value = digits.slice(n); return; }
    }
  }

  // ---- what each field checks (an array of {f: input, m: message}, empty when fine) -------------------------------
  function one(input, msg) { return msg ? [{ f: input, m: msg }] : []; }
  var groups = [
    { msg: 'coName-e', inputs: [F.name], check: function () { return one(F.name, R.checkName(F.name.value)); } },
    { msg: 'coDomain-e', inputs: [F.domain], check: function () { return one(F.domain, R.checkDomain(R.normDomain(F.domain.value))); } },
    { msg: 'coEmail-e', inputs: [F.email], check: function () { return one(F.email, R.checkEmail(F.email.value, R.normDomain(F.domain.value))); } },
    { msg: 'coCountry-e', inputs: [F.country], check: function () {
      return one(F.country, picker ? R.checkCountry(picker.get()) : (F.country.value.trim().length < 2 ? R.MSG.country : ''));
    } },
    { msg: 'coTax-e', inputs: [F.tax], check: function () { return one(F.tax, R.checkTax(F.tax.value, isIndia())); } },
    { msg: 'coAddr-e', inputs: [F.addr], check: function () { return one(F.addr, R.checkAddress(F.addr.value)); } },
    { msg: 'coPhone-e', inputs: [F.dial, F.phone], check: function () {
      var d = dialPicker ? dialPicker.get() : null, out = [];
      if (dialPicker && !d) out.push({ f: F.dial, m: R.MSG.dial });
      var p = R.checkPhone(F.phone.value, d, !dialPicker);
      if (p.msg) out.push({ f: F.phone, m: p.msg });
      return out;
    } }
  ];

  // ---- showing the result ---------------------------------------------------------------------------------------
  // A problem is shown once its field has been left (or after a submit attempt), so nobody is told off mid-typing.
  function render(g) {
    var errs = g.check(), shown = null;
    for (var i = 0; i < errs.length && !shown; i++) if (submitted || touched[errs[i].f.id]) shown = errs[i];
    g.inputs.forEach(function (input) {
      var bad = !!shown && shown.f === input;
      input.classList.toggle('bad', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
    var m = $(g.msg);
    m.textContent = shown ? shown.m : '';
    m.classList.toggle('on', !!shown);
    return errs;
  }

  function refresh() {
    var total = 0;
    groups.forEach(function (g) { total += render(g).length; });
    if (submitted && !total) summary.style.display = 'none';  // everything fixed after a failed attempt
  }

  // ---- typing filters (the caret stays where the buyer was typing) ----------------------------------------------
  var filters = {
    coName: R.filter.name, coAddr: R.filter.address, coDomain: R.filter.domain, coEmail: R.filter.email, coPhone: R.filter.phone,
    coTax: function (s) { return R.filter.tax(s, isIndia()); }
  };

  function applyFilter(input, fn) {
    var v = input.value, f = fn(v);
    if (f === v) return;
    var pos = input.selectionStart, caret = pos == null ? f.length : fn(v.slice(0, pos)).length;
    input.value = f;
    try { input.setSelectionRange(caret, caret); } catch (e) { /* not a text input */ }
  }

  // ---- tidy a value when the buyer leaves the field -------------------------------------------------------------
  var tidyOnLeave = {
    coName: function () { F.name.value = F.name.value.trim(); },
    coAddr: function () { F.addr.value = F.addr.value.trim(); },
    coDomain: function () { F.domain.value = R.normDomain(F.domain.value); },
    coEmail: function () {
      F.email.value = F.email.value.trim();
      var host = F.email.value.toLowerCase().split('@')[1];  // convenience: fill the domain box from the email if it is empty
      if (host && !F.domain.value.trim()) F.domain.value = R.normDomain(host);
    },
    coTax: function () { F.tax.value = R.normTax(F.tax.value, isIndia()); },
    coPhone: splitPastedCode
  };

  Object.keys(F).forEach(function (key) {
    var input = F[key];
    input.addEventListener('input', function () {
      if (filters[input.id]) applyFilter(input, filters[input.id]);
      refresh();
    });
    input.addEventListener('blur', function () {  // the pickers' own blur handlers were attached first, so a typed country is already chosen
      touched[input.id] = true;
      if (tidyOnLeave[input.id]) tidyOnLeave[input.id]();
      refresh();
    });
  });
  F.phone.addEventListener('paste', function () { setTimeout(function () { splitPastedCode(); applyFilter(F.phone, R.filter.phone); refresh(); }, 0); });

  openBtn.addEventListener('click', function () {
    openBtn.hidden = true; openBtn.setAttribute('aria-expanded', 'true');
    form.hidden = false; form.classList.add('coupon-in');
    // Start from the visitor's own country when the browser language names one (en-IN -> India), as a convenience they can change.
    var g = picker && !picker.get() && CP.guess();
    if (g) picker.set(g);
    F.name.focus();
  });

  function values() {
    var d = dialPicker ? dialPicker.get() : null, india = isIndia();
    return {
      company: F.name.value.trim(), domain: R.normDomain(F.domain.value), email: F.email.value.trim().toLowerCase(),
      country: picker ? picker.get().name : F.country.value.trim(), india: india, gstin: R.normTax(F.tax.value, india),
      address: F.addr.value.trim(), phone: (d ? d.dialText + ' ' : '+') + R.checkPhone(F.phone.value, d, !dialPicker).num  // no code box: the number already starts with its code
    };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    splitPastedCode();
    submitted = true;
    var first = null;
    groups.forEach(function (g) { var errs = render(g); if (errs.length && !first) first = errs[0].f; });
    if (first) {
      summary.textContent = 'Please correct the highlighted fields.';
      summary.style.display = 'block';
      first.focus();
      return;
    }
    summary.style.display = 'none';
    window.location.href = R.buildMailto(values());
  });
})();
