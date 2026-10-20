/* Rules for the Company License invoice form on eagleview_payment.html.
   Pure functions, no DOM, so they can be tested in Node. Three kinds:
     filter.*  what a field lets you TYPE (runs on every keystroke and paste, so letters never reach the phone box);
     norm*     tidy a finished value (strip "https://" and "www." from a domain, drop spaces from a GSTIN);
     check*    '' when the value is fine, otherwise the message shown under the field.
   The Student form (eagleview_student_rules.js) reuses the typing filters and the email check from here. */
(function (root) {
  'use strict';

  var OWNER = 'dev@pearlfox.io';
  var FREE_DOMAINS = ['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com','yahoo.com','yahoo.co.in','yahoo.co.uk','ymail.com','rocketmail.com','icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','zoho.com','gmx.com','mail.com','yandex.com','rediffmail.com'];
  var GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  var LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  var TLD = /^([a-z]{2,24}|xn--[a-z0-9-]{2,})$/;
  var LOCAL = /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/;

  var MSG = {
    country: 'Choose your country from the list.',
    dial: 'Choose your phone country code from the list.',
    gstin: 'Enter your GSTIN. It has 15 characters, for example 27ABCDE1234F1Z5.'   // required for India only
  };

  // ---- filters: what may be typed -------------------------------------------------------------------------------

  // Free text (name, address): no control characters or angle brackets, no runs of spaces, no leading space.
  function tidy(s) { return String(s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, ''); }

  var filter = {
    name: tidy,
    address: tidy,
    domain: function (s) { return String(s).toLowerCase().replace(/[^a-z0-9.@:\/-]/g, ''); },  // : and / only so a pasted URL survives until it is tidied
    email: function (s) { return String(s).replace(/\s/g, ''); },
    // GSTIN (India): 15 letters and digits, nothing else. Other countries: letters, digits, spaces, dots, slashes, dashes.
    tax: function (s, india) {
      s = String(s).toUpperCase().replace(india ? /[^A-Z0-9]/g : /[^A-Z0-9 .\/-]/g, '');
      if (!india) s = s.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
      return s.slice(0, india ? 15 : 30);
    },
    // Digits, spaces and the usual separators. A "+" is allowed only first, so a pasted "+91 98765 43210" can be split.
    phone: function (s) { return String(s).replace(/[^\d\s()+.-]/g, '').replace(/(?!^)\+/g, '').replace(/\s{2,}/g, ' '); }
  };

  // ---- normalisers ----------------------------------------------------------------------------------------------

  // "https://www.Acme.com/about", "@acme.com" and "me@acme.com" all become "acme.com".
  function normDomain(s) {
    var t = String(s).trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
    if (t.indexOf('@') >= 0) t = t.slice(t.lastIndexOf('@') + 1);
    return t.replace(/^www\./, '').replace(/\.+$/, '');
  }

  function normTax(s, india) {
    s = String(s).trim().toUpperCase();
    return india ? s.replace(/\s+/g, '') : s.replace(/\s{2,}/g, ' ');
  }

  // ---- checks: '' means fine ------------------------------------------------------------------------------------

  function validHost(h) {
    if (!h || h.length > 253) return false;
    var labels = h.split('.');
    if (labels.length < 2) return false;
    for (var i = 0; i < labels.length; i++) if (!LABEL.test(labels[i])) return false;
    return TLD.test(labels[labels.length - 1]);
  }

  function checkName(s) {
    var t = String(s).trim();
    if (!t) return 'Enter your company name.';
    if (t.length < 2) return 'The company name is too short.';
    if (!/[\p{L}\p{N}]/u.test(t)) return 'The company name must contain letters or numbers.';
    return '';
  }

  function checkDomain(d) {
    if (!d) return 'Enter your company email domain, for example acme.com.';
    if (!validHost(d)) return 'That is not a valid domain. Use the part after the @ in your company email, for example acme.com.';
    if (FREE_DOMAINS.indexOf(d) >= 0) return 'Free email domains such as gmail.com cannot be used. Enter your company\'s own domain.';
    return '';
  }

  // domain: the already-normalised company domain; the email must be on it, but only when that domain is itself acceptable
  // (no point telling someone to use name@gmail.com).
  function checkEmail(e, domain) {
    e = String(e).trim().toLowerCase();
    if (!e) return 'Enter the contact email address.';
    var at = e.lastIndexOf('@'), local = e.slice(0, at), host = e.slice(at + 1);
    if (at < 1 || e.indexOf('@') !== at || local.length > 64 || !LOCAL.test(local) ||
        local.charAt(0) === '.' || local.slice(-1) === '.' || local.indexOf('..') >= 0 || !validHost(host)) {
      return 'Enter a valid email address, for example name@acme.com.';
    }
    if (domain && !checkDomain(domain) && host !== domain) return 'The contact email must be on the same domain (name@' + domain + ').';
    return '';
  }

  function checkCountry(c) { return c ? '' : MSG.country; }

  function checkTax(s, india) {
    var t = normTax(s, india);
    if (!t) return india ? MSG.gstin : '';  // required for India (an Indian tax invoice needs it); optional elsewhere
    if (india) return GSTIN.test(t) ? '' : 'Check the GSTIN: it has 15 characters, for example 27ABCDE1234F1Z5.';
    return /^[A-Z0-9][A-Z0-9 .\/-]{2,29}$/.test(t) ? '' : 'Check the tax ID: 3 to 30 letters, numbers, spaces, dots or dashes.';
  }

  function checkAddress(s) {
    var t = String(s).trim();
    if (!t) return 'Enter your billing address.';
    if (t.length < 8) return 'The billing address is too short. Include the street, city and postal code.';
    if (!/\p{L}.*\p{L}.*\p{L}/u.test(t)) return 'Enter a real billing address with the street and city.';
    return '';
  }

  /* raw: what is in the number box. dial: the chosen country {code, dial} or null. lenient: the code box is not available,
     so a leading "+" is accepted. Returns {num, msg}: num is the digits to use, msg is '' when fine. */
  function checkPhone(raw, dial, lenient) {
    var t = String(raw).trim();
    if (!t) return { num: '', msg: 'Enter your phone number.' };
    if (t.charAt(0) === '+') {
      if (!lenient) return { num: '', msg: 'Leave out the + and the country code here. Choose the code in the Code box.' };
      t = t.slice(1);
    }
    var num = t.replace(/[\s().-]/g, '');
    if (/\D/.test(num)) return { num: num, msg: 'The phone number can contain digits only.' };
    if (dial && dial.code === 'IN') {
      num = num.replace(/^0/, '');  // 098765 43210 -> 98765 43210
      if (num.length !== 10) return { num: num, msg: 'An Indian phone number has 10 digits, for example 98765 43210.' };
    } else if (num.length < 4 || num.length > (lenient ? 15 : 14) || (dial && dial.dial.length + num.length > 15)) {
      return { num: num, msg: lenient ? 'Enter a valid phone number with its country code.' : 'Enter a valid phone number: 4 to 14 digits, without the country code.' };
    }
    return { num: num, msg: '' };
  }

  // ---- the email that gets opened ---------------------------------------------------------------------------------

  // v: {company, domain, email, country, india, gstin, address, phone} with clean values.
  function buildMailto(v) {
    var lines = [
      'Hello PearlFox team,', '',
      'We would like to purchase the Eagle View Company License (annual, 1 year) and request an invoice for Rs 28,999 (GST included).', '',
      'Company details',
      'Company name: ' + v.company, 'Email domain to license: @' + v.domain, 'Contact email: ' + v.email, 'Country: ' + v.country,
      (v.india ? 'GSTIN: ' : 'Tax or VAT ID: ') + (v.gstin || '-'), 'Billing address: ' + v.address, 'Phone: ' + v.phone, '',
      'Please send the invoice to the contact email above. We will pay it online and look forward to your confirmation once the license is set up.', '',
      'Thank you,', v.company];
    return 'mailto:' + OWNER + '?subject=' + encodeURIComponent('Invoice request: Eagle View Company License (' + v.company + ')') +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  var api = {
    OWNER: OWNER, MSG: MSG, FREE_DOMAINS: FREE_DOMAINS, filter: filter,
    normDomain: normDomain, normTax: normTax,
    checkName: checkName, checkDomain: checkDomain, checkEmail: checkEmail, checkCountry: checkCountry,
    checkTax: checkTax, checkAddress: checkAddress, checkPhone: checkPhone, buildMailto: buildMailto
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CompanyRules = api;
})(this);
