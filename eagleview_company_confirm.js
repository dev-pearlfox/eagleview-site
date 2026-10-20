/* Owner-only page behind the link in the "Confirm company key" email. It shows what the generator sent and records the license
   only when the owner clicks Confirm. The link carries a signed payload that the server checks on every call, so this page holds
   no secret. Everything is shown as plain text (textContent), never as HTML. */
(function () {
  'use strict';
  var EDGE = 'https://aerpehamlfipdzfsysre.supabase.co/functions/v1/activate-license';
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(window.location.search), p = q.get('p') || '', t = q.get('t') || '';
  var state = $('state'), app = $('app'), result = $('result'), btn = $('confirm');

  function call(action) {
    return fetch(EDGE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: p, t: t }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function say(text, good) { result.textContent = text; result.className = 'msg ' + (good ? 'good' : 'bad'); result.hidden = false; }
  function fact(dl, k, v) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v || '-'; dl.appendChild(dt); dl.appendChild(dd); }

  function show(r, confirmed) {
    var dl = $('facts'); dl.textContent = '';
    fact(dl, 'Company', r.company); fact(dl, 'Email domain', '@' + r.domain);
    fact(dl, 'Contact', [r.contact_name, r.contact_email].filter(Boolean).join(', '));
    fact(dl, 'GSTIN', r.gstin); fact(dl, 'Country', r.country); fact(dl, 'Invoice', r.invoice_no);
    fact(dl, 'Amount', r.amount_inr === null || r.amount_inr === undefined ? '' : 'Rs ' + r.amount_inr);
    fact(dl, 'Notes', r.notes); fact(dl, 'Key ends with', r.key_end);
    fact(dl, 'Made in the generator', r.requested_at ? new Date(r.requested_at).toLocaleString() : '');
    if (confirmed) { $('decide').hidden = true; say('Already recorded in the license ledger. Nothing more to do.', true); }
    state.hidden = true; app.hidden = false;
  }

  if (!p || !t) { state.textContent = 'This link is not valid.'; return; }
  call('company-confirm-load').then(function (res) {
    if (!res.ok) { state.textContent = res.j.error || 'Could not load the details.'; return; }
    show(res.j.request, res.j.confirmed);
  }).catch(function () { state.textContent = 'Could not reach the server. Check your connection and reload.'; });

  btn.addEventListener('click', function () {
    btn.disabled = true; result.hidden = true;
    call('company-confirm').then(function (res) {
      if (!res.ok) { btn.disabled = false; say(res.j.error || 'Something went wrong. Nothing was recorded.', false); return; }
      $('decide').hidden = true;
      say(res.j.already ? 'Already recorded in the license ledger. Nothing was changed.' : 'Recorded. The license is now in your license ledger.', true);
    }).catch(function () { btn.disabled = false; say('Could not reach the server. Nothing was recorded. Please try again.', false); });
  });
})();
