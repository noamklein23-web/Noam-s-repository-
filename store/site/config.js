// ================================================================
//  Store settings: the ONLY file you need to edit on the website.
//  See SETUP.he.md for where each value comes from.
// ================================================================
window.STORE = {
  name: 'שלנו',

  // The web-app URL from Google Apps Script (Deploy → Web app). Ends with /exec.
  // While empty, the site runs in DEMO mode: nothing is saved or sent.
  appsScriptUrl: '',

  // Payment links from your payment provider (Allpay / Grow / Pelecard...), one per offer.
  // In the provider, set the "success / return URL" of BOTH links to:  https://YOUR-SITE/thank-you.html
  paymentLinks: {
    single: '',   // ₪139 link: one necklace
    pair: '',     // ₪229 link: two necklaces (two names)
  },

  prices: { single: 139, pair: 229 },

  // Delivery time shown to customers. Use what your supplier really promises.
  // The current AliExpress listing: ships within 14 days, arrives in about 6–7 weeks in total.
  // With an Israeli jeweler this drops to about 7–10 business days: change it then.
  deliveryText: '5–7 שבועות',

  // WhatsApp number in international format, no + or dashes: 9725XXXXXXXX
  whatsapp: '9725XXXXXXXX',
  email: 'hello@example.com',

  // Required by law on Israeli online stores
  businessName: '[שם העסק]',
  businessId: '[מספר עוסק]',
};
