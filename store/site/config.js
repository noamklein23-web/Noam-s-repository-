// ================================================================
//  Store settings: the ONLY file you need to edit on the website.
//  See SETUP.he.md for where each value comes from.
// ================================================================
window.STORE = {
  name: 'שלנו',

  // The web-app URL from Google Apps Script (Deploy → Web app). Ends with /exec.
  // While empty, the site runs in DEMO mode: nothing is saved or sent.
  appsScriptUrl: '',

  // Payment links from your payment provider (Allpay / Grow / Pelecard...), one per price.
  // In the provider, set the "success / return URL" of BOTH links to:  https://YOUR-SITE/thank-you.html
  paymentLinks: {
    single: '',   // ₪139 link
    multi: '',    // ₪169 link
  },

  prices: { single: 139, multi: 169 },

  // Delivery time shown to customers. Use what your supplier really promises.
  deliveryText: '7–10 ימי עסקים',

  // WhatsApp number in international format, no + or dashes: 9725XXXXXXXX
  whatsapp: '9725XXXXXXXX',
  email: 'hello@example.com',

  // Required by law on Israeli online stores
  businessName: '[שם העסק]',
  businessId: '[מספר עוסק]',
};
