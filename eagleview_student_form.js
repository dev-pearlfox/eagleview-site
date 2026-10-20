/* Student License application on eagleview_payment.html (Student tab): shows the form, wires the country picker and the proof
   upload box, checks every field with eagleview_student_rules.js, then sends the application and the file to the server,
   which stores the proof privately and returns the Rs 500 payment link. Payment comes first; the owner approves afterwards.
   How a field behaves is the same as on the Company form: its message appears once you have left it, "Continue to payment"
   checks everything and jumps to the first problem, and nothing is sent until every field is valid. */
(function () {
  'use strict';
  var R = window.StudentRules, CP = window.CountryPicker;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('stForm'), openBtn = $('stRequest');
  if (!form || !openBtn || !R || !window.EDGE_URL) return;   // the button stays disabled and the "needs JavaScript" line stays

  $('stNoJs').hidden = true;
  openBtn.disabled = false;

  var PAY_HOST = /^https:\/\/([a-z0-9-]+\.)?(rzp\.io|razorpay\.com)\//;   // only ever send the buyer to Razorpay
  var F = { name: $('stName'), inst: $('stInst'), country: $('stCountry'),
            email: $('stEmail'), machine: $('stMachine'), consent: $('stConsent') };
  var fileInput = $('stFile'), drop = $('stDrop'), info = $('stFileInfo'), pickBtn = $('stPick'), clearBtn = $('stClear');
  var summary = $('stErr'), submitBtn = $('stBtn');
  var picker = null, file = null, machineFromLink = false, submitted = false, sending = false, touched = {};
  var INFO_DEFAULT = info.textContent;

  // ---- what the app's Buy button passes along: the sign-in email (locked) and the machine ID ------------------------
  var qs = new URLSearchParams(window.location.search);
  var mail = (qs.get('email') || '').trim(), mid = (qs.get('mid') || '').trim();
  if (mail) { F.email.value = mail; F.email.readOnly = true; $('stEmailHint').textContent = 'Filled in from your Eagle View sign-in. The license key is sent to this address.'; }
  if (mid && !R.checkMachine(mid)) {
    machineFromLink = true; F.machine.value = mid;
    $('stMachineFld').hidden = true; $('stMidOk').style.display = 'flex';
  }
  // Back from the payment. Razorpay adds the link's id and status to the return address. The thank-you note is shown only when
  // the status says paid (or is absent), and the server is asked to check with Razorpay: a second way to learn about the payment,
  // so the application reaches the owner even if Razorpay's own notification to the server is late or lost.
  if (/[?&]student=paid(&|$)/.test(window.location.search)) {
    var linkStatus = qs.get('razorpay_payment_link_status'), linkId = qs.get('razorpay_payment_link_id') || '';
    if (!linkStatus || linkStatus === 'paid') {
      $('stPaid').hidden = false;
      if (/^plink_[A-Za-z0-9]{1,40}$/.test(linkId)) {
        var confirmPayment = function (retry) {
          fetch(window.EDGE_URL + '?action=student-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_link_id: linkId }) })
            .then(function (r) { if (!r.ok && retry) setTimeout(function () { confirmPayment(false); }, 8000); })
            .catch(function () { if (retry) setTimeout(function () { confirmPayment(false); }, 8000); });
        };
        confirmPayment(true);
      }
    }
  }

  if (CP) picker = CP.attach(F.country, $('stCountryList'), { onChange: refresh });

  // ---- what each field checks (an array of {f: input, m: message}, empty when fine) -------------------------------
  function one(input, msg) { return msg ? [{ f: input, m: msg }] : []; }
  var groups = [
    { msg: 'stName-e', inputs: [F.name], check: function () { return one(F.name, R.checkName(F.name.value)); } },
    { msg: 'stInst-e', inputs: [F.inst], check: function () { return one(F.inst, R.checkInstitution(F.inst.value)); } },
    { msg: 'stCountry-e', inputs: [F.country], check: function () {
      return one(F.country, picker ? R.checkCountry(picker.get()) : (F.country.value.trim().length < 2 ? R.MSG.country : ''));
    } },
    { msg: 'stEmail-e', inputs: [F.email], check: function () { return one(F.email, R.checkEmail(F.email.value)); } },
    { msg: 'stMachine-e', inputs: [F.machine], check: function () { return machineFromLink ? [] : one(F.machine, R.checkMachine(F.machine.value)); } },
    { msg: 'stFile-e', inputs: [pickBtn], check: function () { return one(pickBtn, R.checkFile(file)); } },
    { msg: 'stConsent-e', inputs: [F.consent], check: function () { return one(F.consent, R.checkConsent(F.consent.checked)); } }
  ];

  // A problem is shown once its field has been left (or after a submit attempt), so nobody is told off mid-typing.
  function render(g) {
    var errs = g.check(), shown = null;
    for (var i = 0; i < errs.length && !shown; i++) if (submitted || touched[errs[i].f.id]) shown = errs[i];
    g.inputs.forEach(function (input) {
      var bad = !!shown && shown.f === input;
      input.classList.toggle('bad', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
    if (g.inputs[0] === pickBtn) drop.classList.toggle('bad', !!shown);
    var m = $(g.msg);
    m.textContent = shown ? shown.m : '';
    m.classList.toggle('on', !!shown);
    return errs;
  }

  function refresh() {
    var total = 0;
    groups.forEach(function (g) { total += render(g).length; });
    if (submitted && !total) summary.style.display = 'none';
  }

  // ---- typing filters (the caret stays where the buyer was typing) ----------------------------------------------
  var filters = { stName: R.filter.text, stInst: R.filter.text, stEmail: R.filter.email, stMachine: R.filter.machine };
  function applyFilter(input, fn) {
    var v = input.value, f = fn(v);
    if (f === v) return;
    var pos = input.selectionStart, caret = pos == null ? f.length : fn(v.slice(0, pos)).length;
    input.value = f;
    try { input.setSelectionRange(caret, caret); } catch (e) { /* not a text input */ }
  }
  var tidyOnLeave = {
    stName: function () { F.name.value = F.name.value.trim(); },
    stInst: function () { F.inst.value = F.inst.value.trim(); },
    stEmail: function () { F.email.value = F.email.value.trim(); },
    stMachine: function () { F.machine.value = F.machine.value.trim().toUpperCase(); }
  };
  Object.keys(F).forEach(function (key) {
    var input = F[key];
    input.addEventListener('input', function () { if (filters[input.id]) applyFilter(input, filters[input.id]); refresh(); });
    input.addEventListener('blur', function () { touched[input.id] = true; if (tidyOnLeave[input.id]) tidyOnLeave[input.id](); refresh(); });
  });
  F.consent.addEventListener('change', function () { touched[F.consent.id] = true; refresh(); });

  // ---- the proof upload box ---------------------------------------------------------------------------------------
  function setFile(f) {
    file = f || null;
    touched[pickBtn.id] = true;
    drop.classList.toggle('has', !!file);
    info.textContent = file ? file.name + ' (' + R.formatSize(file.size) + ')' : INFO_DEFAULT;
    pickBtn.textContent = file ? 'Choose a different file' : 'Choose proof of enrolment';
    clearBtn.hidden = !file;
    refresh();
  }
  pickBtn.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { setFile(fileInput.files && fileInput.files[0]); });
  clearBtn.addEventListener('click', function () { fileInput.value = ''; setFile(null); pickBtn.focus(); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
  ['dragleave', 'dragend', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('drag'); }); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { fileInput.value = ''; setFile(f); }   // the input cannot hold a dropped file, so the file is kept here
  });

  openBtn.addEventListener('click', function () {
    openBtn.hidden = true; openBtn.setAttribute('aria-expanded', 'true');
    form.hidden = false; form.classList.add('coupon-in');
    var g = picker && !picker.get() && CP.guess();
    if (g) picker.set(g);
    F.name.focus();
  });

  // ---- sending ----------------------------------------------------------------------------------------------------
  function fail(message) {
    sending = false; submitBtn.disabled = false; submitBtn.textContent = 'Continue to payment';
    summary.textContent = message; summary.style.display = 'block';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    submitted = true;
    var first = null;
    groups.forEach(function (g) { var errs = render(g); if (errs.length && !first) first = errs[0].f; });
    if (first) { summary.textContent = 'Please correct the highlighted fields.'; summary.style.display = 'block'; first.focus(); return; }
    if (navigator.onLine === false) { fail('You appear to be offline. Please connect to the internet and try again.'); return; }
    summary.style.display = 'none';

    var fd = new FormData();
    fd.append('name', F.name.value.trim());
    fd.append('institution', F.inst.value.trim());
    fd.append('country', picker ? picker.get().code : F.country.value.trim());
    fd.append('email', F.email.value.trim().toLowerCase());
    fd.append('machine_id', F.machine.value.trim());
    fd.append('consent', 'yes');
    fd.append('proof', file, file.name);

    sending = true; submitBtn.disabled = true; submitBtn.textContent = 'Uploading your proof...';
    fetch(window.EDGE_URL + '?action=student-apply', { method: 'POST', body: fd })   // no Content-Type header: the browser adds the file boundary
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.pay_url && PAY_HOST.test(res.j.pay_url)) { submitBtn.textContent = 'Opening payment...'; window.location.href = res.j.pay_url; return; }
        fail(res.j.error && res.j.error !== 'Internal server error' ? res.j.error : 'Something went wrong on our side. Please try again in a few minutes, or write to dev@pearlfox.io.');
      })
      .catch(function () { fail('Could not reach the server. Check your connection and try again.'); });
  });
})();
