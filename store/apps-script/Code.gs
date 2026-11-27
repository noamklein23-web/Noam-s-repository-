/**
 * Order automation for the necklace store.
 *
 * What it does:
 *  1. The website sends a new order here → it is saved in the sheet as "ממתין לתשלום" (waiting for payment).
 *  2. After the customer pays, the thank-you page tells this script → status becomes "שולם" (paid),
 *     and an email goes to the SUPPLIER (to make and ship), to YOU (copy) and to the CUSTOMER (confirmation).
 *  3. If you change a status to "שולם" by hand in the sheet, the supplier email is sent the same way.
 *
 * Setup: see store/site/SETUP.he.md. Only the CONFIG block below needs editing.
 */

const CONFIG = {
  STORE_NAME: 'שלנו',
  OWNER_EMAIL: 'your-email@example.com',      // your email: gets a copy of every paid order
  SUPPLIER_EMAIL: 'supplier@example.com',     // the jeweler's email: gets orders to make and ship
  AUTO_SEND_TO_SUPPLIER: true,                // false = only you get the order, you forward it yourself
  SEND_CUSTOMER_CONFIRMATION: true,           // send the customer an email with their order details
  DELIVERY_TEXT: '7–10 ימי עסקים',            // must match deliveryText in site/config.js
  WHATSAPP: '9725XXXXXXXX',                   // for the customer email; same as in site/config.js
  SHEET_NAME: 'הזמנות',
  // Must match the prices of your payment links. The amount is charged by the payment link;
  // this is only what gets written in the sheet.
  PRICES: { single: 139, multi: 169 },
};

const STATUS_PENDING = 'ממתין לתשלום';
const STATUS_PAID = 'שולם';

const HEADERS = [
  'מספר הזמנה', 'תאריך', 'סטטוס', 'סוג', 'שמות לחריטה', 'גוון', 'אורך שרשרת',
  'ברכה לכרטיס', 'שם הלקוח', 'טלפון', 'מייל', 'עיר', 'כתובת', 'מיקוד', 'מחיר',
  'נשלח לספק', 'אסימון',
];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));

const VARIANT_LABEL = { single: 'שם אחד', multi: '2–4 שמות' };
const COLOR_LABEL = { gold: 'זהב', silver: 'כסף', rose: 'רוז גולד' };
const LENGTHS = ['40', '45', '50'];

// ---------------------------------------------------------------- web endpoint

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'create') return json_(createOrder_(data));
    if (data.action === 'paid') return json_(markPaidFromSite_(data));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('OK: order script is running.');
}

// ---------------------------------------------------------------- actions

function createOrder_(d) {
  const variant = d.variant === 'multi' ? 'multi' : 'single';
  const names = (Array.isArray(d.names) ? d.names : [])
    .map(n => clean_(n, 12))
    .filter(Boolean);
  const maxNames = variant === 'multi' ? 4 : 1;
  const minNames = variant === 'multi' ? 2 : 1;
  if (names.length < minNames || names.length > maxNames) {
    throw new Error('מספר השמות לא תואם לסוג השרשרת');
  }
  if (!COLOR_LABEL[d.color]) throw new Error('גוון לא תקין');
  if (LENGTHS.indexOf(String(d.length)) === -1) throw new Error('אורך לא תקין');

  const required = { customerName: 'שם', phone: 'טלפון', email: 'מייל', city: 'עיר', address: 'כתובת' };
  Object.keys(required).forEach(k => {
    if (!clean_(d[k], 200)) throw new Error('חסר שדה: ' + required[k]);
  });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email))) throw new Error('מייל לא תקין');
  if (d.spellingConfirmed !== true) throw new Error('יש לאשר את איות השמות');

  const sheet = getSheet_();
  const orderId = nextOrderId_(sheet);
  const token = Utilities.getUuid();

  sheet.appendRow([
    orderId,
    new Date(),
    STATUS_PENDING,
    VARIANT_LABEL[variant],
    safe_(names.join(' · ')),
    COLOR_LABEL[d.color],
    d.length + ' ס"מ',
    safe_(clean_(d.cardMessage, 200)),
    safe_(clean_(d.customerName, 80)),
    "'" + clean_(d.phone, 20),   // ' keeps the leading 0
    safe_(clean_(d.email, 120)),
    safe_(clean_(d.city, 60)),
    safe_(clean_(d.address, 150)),
    "'" + clean_(d.zip, 10),
    CONFIG.PRICES[variant],
    '',
    token,
  ]);

  return { ok: true, orderId: orderId, token: token };
}

function markPaidFromSite_(d) {
  const sheet = getSheet_();
  const row = findRow_(sheet, d.orderId);
  if (!row) throw new Error('הזמנה לא נמצאה');
  const storedToken = sheet.getRange(row, COL['אסימון']).getValue();
  if (!d.token || d.token !== storedToken) throw new Error('אסימון לא תקין');

  if (sheet.getRange(row, COL['סטטוס']).getValue() !== STATUS_PAID) {
    sheet.getRange(row, COL['סטטוס']).setValue(STATUS_PAID);
  }
  sendIfNeeded_(sheet, row);
  return { ok: true, orderId: d.orderId };
}

/**
 * Installable trigger: when you set a status to "שולם" by hand, the order goes out.
 * Installed by setup().
 */
function onStatusEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (range.getColumn() !== COL['סטטוס'] || range.getRow() < 2) return;
  if (range.getValue() === STATUS_PAID) sendIfNeeded_(sheet, range.getRow());
}

// ---------------------------------------------------------------- emails

function sendIfNeeded_(sheet, row) {
  const sentCell = sheet.getRange(row, COL['נשלח לספק']);
  if (sentCell.getValue()) return; // already sent, never send twice

  const o = readOrder_(sheet, row);

  if (CONFIG.AUTO_SEND_TO_SUPPLIER) {
    MailApp.sendEmail({
      to: CONFIG.SUPPLIER_EMAIL,
      cc: CONFIG.OWNER_EMAIL,
      subject: 'הזמנה חדשה #' + o.id + ' – ' + CONFIG.STORE_NAME,
      htmlBody: supplierEmail_(o),
      name: CONFIG.STORE_NAME,
      replyTo: CONFIG.OWNER_EMAIL,
    });
    sentCell.setValue(new Date());
  } else {
    MailApp.sendEmail({
      to: CONFIG.OWNER_EMAIL,
      subject: 'הזמנה ששולמה #' + o.id + ' – להעביר לספק',
      htmlBody: supplierEmail_(o),
      name: CONFIG.STORE_NAME,
    });
    sentCell.setValue('נשלח אליך בלבד ' + Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM HH:mm'));
  }

  if (CONFIG.SEND_CUSTOMER_CONFIRMATION && o.email) {
    MailApp.sendEmail({
      to: o.email,
      subject: 'ההזמנה שלך התקבלה! #' + o.id + ' – ' + CONFIG.STORE_NAME,
      htmlBody: customerEmail_(o),
      name: CONFIG.STORE_NAME,
      replyTo: CONFIG.OWNER_EMAIL,
    });
  }
}

function supplierEmail_(o) {
  return wrap_(
    '<h2 style="margin:0 0 12px">הזמנה חדשה #' + esc_(o.id) + '</h2>' +
    '<p style="margin:0 0 6px;color:#555">השמות לחריטה (להעתיק בדיוק, מימין לשמאל):</p>' +
    '<div style="font-size:32px;font-weight:bold;padding:14px 18px;border:2px solid #b8860b;border-radius:10px;display:inline-block;margin-bottom:16px">' +
    esc_(o.names) + '</div>' +
    table_([
      ['סוג', o.variant], ['גוון', o.color], ['אורך שרשרת', o.length],
      ['ברכה לכרטיס', o.card || '—'],
    ]) +
    '<h3 style="margin:20px 0 8px">משלוח אל</h3>' +
    table_([
      ['שם', o.name], ['טלפון', o.phone], ['עיר', o.city], ['כתובת', o.address], ['מיקוד', o.zip || '—'],
    ]) +
    '<p style="margin-top:20px;padding:12px;background:#fff8e6;border-radius:8px">' +
    '⚠️ בבקשה לשלוח באריזה ניטרלית: <b>בלי מחיר, בלי חשבונית ובלי לוגו</b>.<br>' +
    'אחרי השליחה – נא להשיב למייל הזה עם מספר המעקב. תודה!</p>'
  );
}

function customerEmail_(o) {
  return wrap_(
    '<h2 style="margin:0 0 12px">תודה ' + esc_(o.name) + '! ההזמנה שלך התקבלה 🤍</h2>' +
    '<p>מספר הזמנה: <b>#' + esc_(o.id) + '</b></p>' +
    '<p style="margin:0 0 6px;color:#555">השמות שייחרטו:</p>' +
    '<div style="font-size:26px;font-weight:bold;margin-bottom:14px">' + esc_(o.names) + '</div>' +
    table_([['סוג', o.variant], ['גוון', o.color], ['אורך שרשרת', o.length]]) +
    '<p>השרשרת נכנסת עכשיו לייצור. זמן הכנה ומשלוח: <b>' + esc_(CONFIG.DELIVERY_TEXT) + '</b>. ' +
    'נשלח לך מספר מעקב ברגע שהיא יוצאת לדרך.</p>' +
    '<p>שאלה? פשוט השיבו למייל הזה' +
    (CONFIG.WHATSAPP && CONFIG.WHATSAPP.indexOf('X') === -1
      ? ' או כתבו לנו <a href="https://wa.me/' + esc_(CONFIG.WHATSAPP) + '">בוואטסאפ</a>' : '') +
    '.</p>'
  );
}

function wrap_(inner) {
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#222;max-width:560px">' +
    inner + '<p style="color:#888;font-size:13px;margin-top:24px">' + esc_(CONFIG.STORE_NAME) + '</p></div>';
}

function table_(rows) {
  return '<table style="border-collapse:collapse">' + rows.map(r =>
    '<tr><td style="padding:4px 0 4px 16px;color:#666">' + esc_(r[0]) + '</td><td style="padding:4px 0"><b>' +
    esc_(r[1]) + '</b></td></tr>').join('') + '</table>';
}

// ---------------------------------------------------------------- setup & helpers

/** Run once from the Apps Script editor (select "setup" → Run). */
function setup() {
  getSheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onStatusEdit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(ss).onEdit().create();
}

/** Optional: run from the editor to check the emails look right (sends to OWNER_EMAIL only). */
function sendTestEmail() {
  const o = {
    id: 'TEST', variant: '2–4 שמות', names: 'נועה · איתי', color: 'זהב', length: '45 ס"מ',
    card: 'אמא, אוהבים אותך!', name: 'ישראלה ישראלי', phone: '050-0000000', email: CONFIG.OWNER_EMAIL,
    city: 'תל אביב', address: 'הרצל 1', zip: '',
  };
  MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: 'בדיקה – מייל לספק', htmlBody: supplierEmail_(o) });
  MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: 'בדיקה – מייל ללקוח', htmlBody: customerEmail_(o) });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e9d2');
    sheet.hideColumns(COL['אסימון']);
  }
  return sheet;
}

function nextOrderId_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 1001;
  const prev = Number(sheet.getRange(last, COL['מספר הזמנה']).getValue());
  return (isNaN(prev) ? 1000 + last : prev) + 1;
}

function findRow_(sheet, orderId) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const ids = sheet.getRange(2, COL['מספר הזמנה'], last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(orderId)) return i + 2;
  }
  return 0;
}

function readOrder_(sheet, row) {
  const v = sheet.getRange(row, 1, 1, HEADERS.length).getDisplayValues()[0];
  const g = h => v[COL[h] - 1];
  return {
    id: g('מספר הזמנה'), variant: g('סוג'), names: g('שמות לחריטה'), color: g('גוון'),
    length: g('אורך שרשרת'), card: g('ברכה לכרטיס'), name: g('שם הלקוח'), phone: g('טלפון'),
    email: g('מייל'), city: g('עיר'), address: g('כתובת'), zip: g('מיקוד'),
  };
}

function clean_(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

/** Stops text that starts with = + - @ from being run as a spreadsheet formula. */
function safe_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
