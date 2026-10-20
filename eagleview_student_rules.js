/* Rules for the Student License application on eagleview_payment.html.
   Pure functions, no DOM, so they can be tested in Node. Same three kinds as eagleview_company_rules.js, whose typing
   filters and email check are reused here (load that file first). The limits mirror the server
   (supabase/functions/activate-license/student.ts), which checks everything again. */
(function (root) {
  'use strict';

  var C = root.CompanyRules || (typeof require === 'function' ? require('./eagleview_company_rules.js') : null);
  if (!C) return;

  var MAX_BYTES = 5 * 1024 * 1024;
  var GUID = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
  var hasText = function (t) { return /[\p{L}\p{N}]/u.test(t); };

  var MSG = {
    name: 'Enter your full name.',
    institution: 'Enter the name of your college or university.',
    country: 'Choose your country from the list.',
    email: 'Enter your email address.',
    machine: 'Paste the Machine ID exactly as Eagle View shows it (it looks like 8A1B2C3D-0000-4000-8000-123456789ABC).',
    file: 'Attach your proof of enrolment.',
    consent: 'Please confirm the declaration.'
  };

  var filter = { text: C.filter.name, email: C.filter.email, machine: function (s) { return String(s).replace(/[^0-9A-Fa-f-]/g, '').slice(0, 36); } };

  function checkName(s) {
    var t = String(s).trim();
    if (!t) return MSG.name;
    if (t.length < 2 || !hasText(t)) return 'Enter your full name as it appears on your student ID.';
    return '';
  }

  function checkInstitution(s) {
    var t = String(s).trim();
    if (!t) return MSG.institution;
    if (t.length < 3 || !hasText(t)) return 'The name of the college or university is too short.';
    return '';
  }

  function checkCountry(c) { return c ? '' : MSG.country; }

  function checkEmail(s) {
    if (!String(s).trim()) return MSG.email;
    return C.checkEmail(s, '');
  }

  function checkMachine(s) { return GUID.test(String(s).trim()) ? '' : MSG.machine; }

  // file: a File (name, size) or null. The server looks at the real bytes; this only saves a wasted upload.
  function checkFile(file) {
    if (!file) return MSG.file;
    if (!file.size) return 'That file is empty. Choose your proof of enrolment.';
    if (file.size > MAX_BYTES) return 'The file is too large (' + formatSize(file.size) + '). The limit is 5 MB.';
    if (!/\.(pdf|jpe?g|png)$/i.test(String(file.name))) return 'Use a PDF, JPG or PNG file.';
    return '';
  }

  function checkConsent(on) { return on ? '' : MSG.consent; }

  function formatSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  var api = {
    MSG: MSG, MAX_BYTES: MAX_BYTES, filter: filter, formatSize: formatSize,
    checkName: checkName, checkInstitution: checkInstitution, checkCountry: checkCountry,
    checkEmail: checkEmail, checkMachine: checkMachine, checkFile: checkFile, checkConsent: checkConsent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StudentRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
