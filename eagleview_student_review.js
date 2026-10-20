/* Owner-only page behind the link in the "Student license to review" email. It loads one application, shows the proof, and
   sends the owner's decision to the server. The link carries a signed token that the server checks on every call, so this page
   holds no secret. Everything from the student is shown as plain text (textContent), never as HTML. */
(function () {
  'use strict';
  var EDGE = 'https://aerpehamlfipdzfsysre.supabase.co/functions/v1/activate-license';
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(window.location.search), id = q.get('id') || '', token = q.get('t') || '';
  var state = $('state'), app = $('app'), result = $('result'), approveBtn = $('approve'), rejectBtn = $('reject');

  var studentEmail = '';
  var LABEL = { pending_review: 'Waiting for your decision', approved: 'Approved', rejected: 'Rejected', awaiting_payment: 'Not paid yet', expired: 'Expired' };

  function call(action, body) {
    return fetch(EDGE + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function say(text, good) { result.textContent = text; result.className = 'msg ' + (good ? 'good' : 'bad'); result.hidden = false; }
  function fact(dl, k, v) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v || '-'; dl.appendChild(dt); dl.appendChild(dd); return dd; }
  function when(s) { return s ? new Date(s).toLocaleString() : ''; }

  function show(r, proofUrl) {
    var dl = $('facts'); dl.textContent = ''; studentEmail = r.email || '';
    fact(dl, 'Name', r.name); fact(dl, 'College or university', r.institution); fact(dl, 'Country', r.country);
    fact(dl, 'Email (key goes here)', r.email); fact(dl, 'Machine ID', r.machine_id);
    fact(dl, 'Paid', when(r.paid_at));
    var st = fact(dl, 'Status', ''); st.textContent = ''; var pill = document.createElement('span');
    pill.className = 'pill ' + r.status; pill.textContent = LABEL[r.status] || r.status; st.appendChild(pill);
    if (r.reject_reason) fact(dl, 'Reason given', r.reject_reason);

    var box = $('proof'); box.textContent = '';
    if (proofUrl && /^image\//.test(r.proof_mime)) {
      var img = document.createElement('img'); img.src = proofUrl; img.alt = 'Proof of enrolment'; box.appendChild(img);
    }
    if (proofUrl) {
      var a = document.createElement('a'); a.href = proofUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open ' + (r.proof_name || 'the proof') + ' in a new tab';
      var wrap = document.createElement('div'); wrap.appendChild(a); box.appendChild(wrap);
      var s = document.createElement('small'); s.textContent = 'This link works for 10 minutes. Reload the page for a new one.'; box.appendChild(s);
    } else {
      box.textContent = 'The proof file has been deleted (files are kept for 30 days after a decision).';
    }
    $('decide').hidden = r.status !== 'pending_review';
    if (r.status !== 'pending_review') say('This application is already decided: ' + (LABEL[r.status] || r.status) + '.', r.status === 'approved');
    state.hidden = true; app.hidden = false;
  }

  function load() {
    if (!id || !token) { state.textContent = 'This link is not valid.'; return; }
    call('student-review-load', { id: id, t: token }).then(function (res) {
      if (!res.ok) { state.textContent = res.j.error || 'Could not load the application.'; return; }
      show(res.j.request, res.j.proof_url);
    }).catch(function () { state.textContent = 'Could not reach the server. Check your connection and reload.'; });
  }

  function decide(decision) {
    var reason = $('reason').value.trim();
    if (decision === 'reject' && reason.length < 3) { say('Write a short reason first. The student will see it.', false); $('reason').focus(); return; }
    var ask = decision === 'approve' ? 'Approve this student and email the key now?' : 'Reject this application and refund Rs 500 now?';
    if (!window.confirm(ask)) return;
    approveBtn.disabled = rejectBtn.disabled = true; result.hidden = true;
    call('student-review-decide', { id: id, t: token, decision: decision, reason: reason }).then(function (res) {
      if (!res.ok) { approveBtn.disabled = rejectBtn.disabled = false; say(res.j.error || 'Something went wrong. Nothing was changed.', false); return; }
      if (res.j.already) { say('Already decided: ' + (LABEL[res.j.already] || res.j.already) + '. Nothing was changed.', false); return; }
      $('decide').hidden = true;
      // The refund went through but the e-mail to the student failed: say so plainly, with who to write to and what to tell them.
      if (res.j.status === 'rejected' && res.j.mail_sent === false) { say('Rejected and the Rs 500 refund has started, BUT the e-mail to the student could not be sent. Please write to ' + studentEmail + ' yourself and tell them why: ' + reason, false); return; }
      say(res.j.status === 'approved' ? 'Approved. The license key has been emailed to the student.' : 'Rejected. The Rs 500 refund has started and the student has been told why.', true);
    }).catch(function () { approveBtn.disabled = rejectBtn.disabled = false; say('Could not reach the server. Nothing was changed. Please try again.', false); });
  }

  approveBtn.addEventListener('click', function () { decide('approve'); });
  rejectBtn.addEventListener('click', function () { decide('reject'); });
  load();
})();
