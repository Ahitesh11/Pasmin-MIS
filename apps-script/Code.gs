/**
 * ============================================================================
 * Pasmin MIS Ranking - Google Apps Script backend (REST Web App)
 * ============================================================================
 * Deploy / update:
 * 1. Google Sheet -> Extensions -> Apps Script.
 * 2. Replace all code in Code.gs with this file and Save (Ctrl+S).
 * 3. First time: Deploy -> New deployment -> Web app,
 *    Execute as: Me, Who has access: Anyone. Copy the Web App URL into .env.
 *    Updates: Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy
 *    (keeps the same URL).
 *
 * Sheets used:
 *  - Staff     : Employee Code, Employee Name, Company, Date Of Joining, Location,
 *                Designation, Attendance Mode, Incentive Category, HOD Name,
 *                Day1..Day7, Rank Avg  (Rank Avg may be your own formula; it is never overwritten)
 *  - Login     : Username / User ID, Password, Type / Role (Admin or Hod), optional Name
 *  - Records   : weekly history. Columns are detected from the header row, so your
 *                existing layout (e.g. Week Start, Week End, Name, Rank Avg, Month, Year) is kept.
 *  - Daily Log : created automatically. EVERY rank (daily page, monthly page, bulk) is saved here
 *                with its date: the complete record of all staff in one sheet.
 *
 * Security: login returns a signed token. Every other action requires it.
 * "Keep me signed in" sessions last 180 days and are renewed while the app is used.
 * Changing a user's password (or role / status) in the Login sheet ends their old sessions.
 * HODs can only read and rank their own staff; admins can see everything.
 * ============================================================================
 */

var STAFF_SHEET_NAME = "Staff";
var RECORDS_SHEET_NAME = "Records";
var DAILY_LOG_SHEET_NAME = "Daily Log";
var STAFF_COLUMNS = 17; // A..Q

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = params.action || "test";

  try {
    if (action === "test") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        status: "success",
        message: "Google Apps Script API is active and connected!",
        sheetName: ss.getName(),
        recordsHeaders: getHeaderRow(ss.getSheetByName(RECORDS_SHEET_NAME)),
        serverTime: new Date().toISOString()
      });
    }

    var auth = verifyToken(params.token);
    if (!auth) return authError();

    switch (action) {
      case "renewSession":
        return handleRenewSession(auth);

      case "getEmployees":
        return jsonResponse({ status: "success", data: getVisibleEmployees(auth) });

      case "getWeeklyRecords":
        return jsonResponse({
          status: "success",
          data: getWeeklyRecordsFromSheet(auth.role === "HOD" ? auth.hodName : params.hodName)
        });

      case "getMonthlyRanks":
        return jsonResponse({
          status: "success",
          data: getMonthlyRanksFromSheet(params.month, auth.role === "HOD" ? auth.hodName : params.hodName)
        });

      default:
        return jsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
    }

    var action = body.action || "";
    if (action === "login") return handleLogin(body);

    var auth = verifyToken(body.token);
    if (!auth) return authError();

    switch (action) {
      case "saveRanking":
        return handleSaveRanking(auth, body);

      case "saveDailyRank":
        return handleSaveDailyRank(auth, body);

      case "saveDailyRanksBulk":
        return handleSaveDailyRanksBulk(auth, body);

      case "submitWeeklyRecords":
        return handleSubmitWeeklyRecords(auth, body);

      case "resetWeekCycle":
        if (auth.role !== "ADMIN") {
          return jsonResponse({ status: "error", message: "Only an administrator can reset the week cycle." });
        }
        return handleResetWeekCycle();

      default:
        return jsonResponse({ status: "error", message: "Unknown POST action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function authError() {
  return jsonResponse({ status: "error", code: "AUTH", message: "Your session has expired. Please sign in again." });
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Remove invisible characters (zero-width, NBSP) and collapse repeated spaces */
function cleanText(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Comparison key for names / IDs: lowercase letters and digits only */
function nameKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scriptTz() {
  return Session.getScriptTimeZone() || "GMT";
}

function formatDate(value, pattern) {
  return Utilities.formatDate(value, scriptTz(), pattern);
}

/** Date cell or text -> "yyyy-MM-dd" ("" if not a date) */
function toIsoDate(value) {
  if (value instanceof Date) return formatDate(value, "yyyy-MM-dd");
  var s = cleanText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var d = new Date(s);
  return s && !isNaN(d.getTime()) ? formatDate(d, "yyyy-MM-dd") : "";
}

/** ISO week id ("2026-W40") for a "yyyy-MM-dd" date */
function isoWeekId(isoDate) {
  var p = isoDate.split("-");
  var date = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  var week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + "-W" + (week < 10 ? "0" : "") + week;
}

function getHeaderRow(sheet) {
  if (!sheet || sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanText);
}

/**
 * Locate a column by header. Exact (normalized) match first; partial match only for
 * candidates of 4+ characters. Columns listed in usedCols are skipped. Returns 0-based index or -1.
 */
function findHeaderCol(headers, candidates, usedCols) {
  var norm = headers.map(function(h) { return nameKey(h); });
  for (var c = 0; c < candidates.length; c++) {
    for (var i = 0; i < norm.length; i++) {
      if (usedCols.indexOf(i) === -1 && norm[i] === candidates[c]) return i;
    }
  }
  for (var c2 = 0; c2 < candidates.length; c2++) {
    if (candidates[c2].length < 4) continue;
    for (var k = 0; k < norm.length; k++) {
      if (usedCols.indexOf(k) === -1 && norm[k] && norm[k].indexOf(candidates[c2]) !== -1) return k;
    }
  }
  return -1;
}

/** Average of the valid 1-10 scores, rounded to 1 decimal (null if none) */
function averageScore(values) {
  var scores = values.filter(function(v) { return typeof v === "number" && !isNaN(v) && v > 0; });
  if (!scores.length) return null;
  var sum = scores.reduce(function(a, b) { return a + b; }, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Auth (signed token)
// ---------------------------------------------------------------------------

var REMEMBER_TTL_MS = 180 * 24 * 60 * 60 * 1000; // "Keep me signed in": 180 days, renewed while in use
var SESSION_TTL_MS = 12 * 60 * 60 * 1000;        // not remembered: 12 hours
var LOGIN_CACHE_KEY = "login_users_v1";

function getAuthSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("AUTH_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("AUTH_SECRET", secret);
  }
  return secret;
}

function signPayload(payload) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, getAuthSecret(), Utilities.Charset.UTF_8)
  );
}

/** Short fingerprint of a password: changing the password in the Login sheet ends old sessions */
function passwordVersion(password) {
  return signPayload("pw:" + cleanText(password)).substring(0, 16);
}

function getLoginSheet() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === "login") return sheets[i];
  }
  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getName().toLowerCase().indexOf("login") !== -1) return sheets[j];
  }
  return null;
}

/**
 * Read users from the 'Login' sheet. Columns are detected by header:
 * User ID / Username / Email, Password, Role / Type, optional Name / HOD Name, optional Status.
 * Returns { error } or { users: { <nameKey(userId)>: { userId, name, role, hodName, password, active } } }
 */
function readLoginUsers() {
  var sheet = getLoginSheet();
  if (!sheet) return { error: "'Login' sheet not found in the spreadsheet." };
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: "Login sheet has no users." };

  var headers = data[0];
  var used = [];
  var idCol = findHeaderCol(headers, ["userid", "loginid", "username", "user", "id", "email", "emailid"], used);
  if (idCol !== -1) used.push(idCol);
  var passCol = findHeaderCol(headers, ["password", "pass", "pwd", "pin"], used);
  if (passCol !== -1) used.push(passCol);
  var roleCol = findHeaderCol(headers, ["role", "usertype", "type", "access", "accesslevel", "loginas"], used);
  if (roleCol !== -1) used.push(roleCol);
  var nameCol = findHeaderCol(headers, ["hodname", "hod", "name", "fullname", "employeename", "displayname"], used);
  if (nameCol !== -1) used.push(nameCol);
  var statusCol = findHeaderCol(headers, ["status", "active", "enabled"], used);
  if (idCol === -1 || passCol === -1) return { error: "Login sheet must have a 'User ID' and a 'Password' column." };

  var users = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var key = nameKey(row[idCol]);
    if (!key || users[key]) continue;
    var userId = cleanText(row[idCol]);
    var roleRaw = roleCol !== -1 ? cleanText(row[roleCol]).toLowerCase() : "";
    var isAdmin = roleRaw.indexOf("admin") !== -1 || (!roleRaw && userId.toLowerCase().indexOf("admin") !== -1);
    var name = (nameCol !== -1 ? cleanText(row[nameCol]) : "") || userId;
    var st = statusCol !== -1 ? cleanText(row[statusCol]).toLowerCase() : "";
    users[key] = {
      userId: userId,
      name: name,
      role: isAdmin ? "ADMIN" : "HOD",
      hodName: isAdmin ? "" : name,
      password: cleanText(row[passCol]),
      active: ["inactive", "no", "false", "blocked", "disabled"].indexOf(st) === -1
    };
  }
  return { users: users };
}

/** Per-user session check data, cached for 5 minutes so requests stay fast */
function getLoginIndex() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(LOGIN_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  var res = readLoginUsers();
  var index = {};
  if (res.users) {
    Object.keys(res.users).forEach(function(k) {
      var u = res.users[k];
      index[k] = { pv: passwordVersion(u.password), role: u.role, active: u.active };
    });
  }
  cache.put(LOGIN_CACHE_KEY, JSON.stringify(index), 300);
  return index;
}

function issueToken(user, remember) {
  var payload = Utilities.base64EncodeWebSafe(
    JSON.stringify({
      u: user.userId, n: user.name, r: user.role, h: user.hodName,
      pv: user.pv, m: remember ? 1 : 0,
      exp: Date.now() + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS)
    }),
    Utilities.Charset.UTF_8
  );
  return payload + "." + signPayload(payload);
}

/**
 * Returns { userId, name, role, hodName, pv, remember } or null when the token is missing,
 * forged, expired, or the user's password / role / status changed in the Login sheet.
 */
function verifyToken(token) {
  token = String(token || "");
  var parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (signPayload(parts[0]) !== parts[1]) return null;
  var data;
  try {
    data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString("UTF-8"));
  } catch (err) {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;

  var role = data.r === "ADMIN" ? "ADMIN" : "HOD";
  var current = getLoginIndex()[nameKey(data.u)];
  if (!current || !current.active || current.pv !== data.pv || current.role !== role) return null;

  return { userId: data.u, name: data.n, role: role, hodName: data.h || "", pv: data.pv, remember: data.m === 1 };
}

/**
 * The HOD an action is performed for. A HOD always acts as themselves;
 * an admin acts for the HOD they chose with "View as".
 */
function actingHodName(auth, requestedHod) {
  return auth.role === "HOD" ? auth.hodName : cleanText(requestedHod);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** Login against the 'Login' sheet. The password is never sent back. */
function handleLogin(payload) {
  var userId = cleanText(payload.userId);
  var password = cleanText(payload.password);
  var remember = payload.remember !== false;
  if (!userId || !password) {
    return jsonResponse({ status: "error", message: "Please enter your User ID and Password." });
  }

  var res = readLoginUsers();
  if (res.error) return jsonResponse({ status: "error", message: res.error });

  var u = res.users[nameKey(userId)];
  if (!u) return jsonResponse({ status: "error", message: "User ID not found." });
  if (u.password !== password) return jsonResponse({ status: "error", message: "Incorrect password." });
  if (!u.active) return jsonResponse({ status: "error", message: "This account is inactive. Contact the administrator." });

  CacheService.getScriptCache().remove(LOGIN_CACHE_KEY); // pick up any recent Login sheet edits
  var user = { userId: u.userId, name: u.name, role: u.role, hodName: u.hodName, pv: passwordVersion(u.password) };
  var data = { userId: user.userId, name: user.name, role: user.role, hodName: user.hodName, token: issueToken(user, remember) };
  return jsonResponse({ status: "success", message: "Login successful", data: data });
}

/** Extend a valid session (called by the app while in use), so remembered users never need to log in again */
function handleRenewSession(auth) {
  var user = { userId: auth.userId, name: auth.name, role: auth.role, hodName: auth.hodName, pv: auth.pv };
  return jsonResponse({ status: "success", data: { token: issueToken(user, auth.remember) } });
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

function getStaffSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAFF_SHEET_NAME);
}

/** Read only columns A..Q of the Staff sheet (faster than the whole data range) */
function readStaffRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var width = Math.min(STAFF_COLUMNS, Math.max(sheet.getLastColumn(), 1));
  var rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return rows.map(function(r) {
    while (r.length < STAFF_COLUMNS) r.push("");
    return r;
  });
}

function toScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}

function getAllEmployeesFromSheet() {
  var sheet = getStaffSheet();
  if (!sheet) return [];
  var employees = [];
  readStaffRows(sheet).forEach(function(r) {
    if (!cleanText(r[0])) return;
    var days = [toScore(r[9]), toScore(r[10]), toScore(r[11]), toScore(r[12]), toScore(r[13]), toScore(r[14]), toScore(r[15])];
    employees.push({
      employeeCode: cleanText(r[0]),
      employeeName: cleanText(r[1]),
      company: cleanText(r[2]),
      dateOfJoining: r[3] instanceof Date ? formatDate(r[3], "yyyy-MM-dd") : cleanText(r[3]),
      location: cleanText(r[4]),
      designation: cleanText(r[5]),
      attendanceMode: cleanText(r[6]),
      incentiveCategory: cleanText(r[7]),
      hodName: cleanText(r[8]),
      day1: days[0], day2: days[1], day3: days[2], day4: days[3], day5: days[4], day6: days[5], day7: days[6],
      // Always computed from Day1-Day7 (the sheet's own Rank Avg column may use a different scale)
      rankAvg: averageScore(days)
    });
  });
  return employees;
}

/** HODs only receive their own staff; admins receive everyone */
function getVisibleEmployees(auth) {
  var all = getAllEmployeesFromSheet();
  if (auth.role === "ADMIN") return all;
  var key = nameKey(auth.hodName);
  return all.filter(function(e) { return nameKey(e.hodName) === key; });
}

function getEmployeeByCode(code) {
  var key = cleanText(code).toUpperCase();
  var all = getAllEmployeesFromSheet();
  for (var i = 0; i < all.length; i++) {
    if (all[i].employeeCode.toUpperCase() === key) return all[i];
  }
  return null;
}

/** Clear Day1-Day7 for a fresh week. Rank Avg formulas are kept. */
function handleResetWeekCycle() {
  var sheet = getStaffSheet();
  if (!sheet) return jsonResponse({ status: "error", message: "Staff sheet not found" });

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 10, lastRow - 1, 7).clearContent(); // J..P = Day1..Day7
    var avgRange = sheet.getRange(2, STAFF_COLUMNS, lastRow - 1, 1);
    var formulas = avgRange.getFormulas();
    var hasFormula = formulas.some(function(f) { return !!f[0]; });
    if (!hasFormula) avgRange.clearContent();
  }

  return jsonResponse({ status: "success", message: "Day 1 to Day 7 cleared. Fresh week started." });
}

// ---------------------------------------------------------------------------
// Weekly records ('Records' sheet, layout detected from its header row)
// ---------------------------------------------------------------------------

var RECORD_FIELDS = [
  ["weekStartDate", ["weekstartdate", "weekstart", "startdate", "datestart", "startingdate", "fromdate", "datefrom", "from", "weekfrom", "start"]],
  ["weekEndDate", ["weekenddate", "weekend", "enddate", "dateend", "endingdate", "todate", "dateto", "to", "weekto", "end"]],
  ["weekId", ["weekid", "weekno", "weeknumber", "week"]],
  ["employeeCode", ["employeecode", "empcode", "staffcode", "code"]],
  ["employeeName", ["employeename", "empname", "staffname", "name", "employee"]],
  ["hodName", ["hodname", "hod"]],
  ["company", ["company"]],
  ["dateOfJoining", ["dateofjoining", "doj", "joiningdate"]],
  ["location", ["location"]],
  ["designation", ["designation"]],
  ["attendanceMode", ["attendancemode", "attendance"]],
  ["incentiveCategory", ["incentivecategory", "incentive"]],
  ["day1", ["day1"]], ["day2", ["day2"]], ["day3", ["day3"]], ["day4", ["day4"]],
  ["day5", ["day5"]], ["day6", ["day6"]], ["day7", ["day7"]],
  ["rankAvg", ["rankavg", "avgrank", "averagerank", "average", "avg", "rank", "score", "percentage"]],
  ["month", ["month"]],
  ["year", ["year"]],
  ["submittedDate", ["submitteddate", "submittedon", "submitdate"]],
  ["submittedBy", ["submittedby"]]
];

/** Map field -> column index for the Records sheet */
function getRecordsLayout(sheet) {
  var headers = getHeaderRow(sheet);
  var layout = {};
  var used = [];
  RECORD_FIELDS.forEach(function(f) {
    var col = findHeaderCol(headers, f[1], used);
    if (col !== -1) { layout[f[0]] = col; used.push(col); }
  });
  // Fallback for a 6-column sheet without recognisable headers:
  // Week Start, Week End, Employee Name, Rank Avg, Month, Year
  if (layout.weekStartDate === undefined && layout.employeeName === undefined && headers.length <= 8) {
    layout = { weekStartDate: 0, weekEndDate: 1, employeeName: 2, rankAvg: 3, month: 4, year: 5 };
  }
  layout.width = Math.max(headers.length, 1);
  return layout;
}

/** True when the sheet stores Rank Avg as a fraction (0.78 = 7.8/10) */
function recordsUseFractionScale(rows, layout) {
  if (layout.rankAvg === undefined) return false;
  var max = 0;
  rows.forEach(function(r) {
    var v = toScore(r[layout.rankAvg]);
    if (v !== null && v > max) max = v;
  });
  return max > 0 && max <= 1;
}

function getWeeklyRecordsFromSheet(filterHodName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RECORDS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var layout = getRecordsLayout(sheet);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, layout.width).getValues();
  var fraction = recordsUseFractionScale(rows, layout);

  var staffByCode = {};
  var staffByName = {};
  getAllEmployeesFromSheet().forEach(function(emp) {
    staffByCode[emp.employeeCode.toUpperCase()] = emp;
    staffByName[nameKey(emp.employeeName)] = emp;
  });

  var hodKey = filterHodName ? nameKey(filterHodName) : "";
  var get = function(r, field) { return layout[field] === undefined ? "" : r[layout[field]]; };
  var list = [];

  rows.forEach(function(r, i) {
    var code = cleanText(get(r, "employeeCode"));
    var name = cleanText(get(r, "employeeName"));
    if (!code && !name) return;

    var emp = (code && staffByCode[code.toUpperCase()]) || (name && staffByName[nameKey(name)]) || null;
    var hod = cleanText(get(r, "hodName")) || (emp ? emp.hodName : "");
    if (hodKey && nameKey(hod) !== hodKey) return;

    var start = toIsoDate(get(r, "weekStartDate"));
    var end = toIsoDate(get(r, "weekEndDate"));
    var weekId = cleanText(get(r, "weekId"));
    if (!/^\d{4}-W\d{2}$/.test(weekId)) weekId = start ? isoWeekId(start) : weekId;

    var avg = toScore(get(r, "rankAvg"));
    if (avg !== null && fraction) avg = avg * 10;
    if (avg !== null) avg = Math.round(avg * 10) / 10;

    var submitted = get(r, "submittedDate");
    list.push({
      id: "rec_" + (i + 2),
      weekId: weekId,
      weekStartDate: start,
      weekEndDate: end,
      employeeCode: code || (emp ? emp.employeeCode : ""),
      employeeName: name || (emp ? emp.employeeName : ""),
      company: cleanText(get(r, "company")) || (emp ? emp.company : ""),
      dateOfJoining: toIsoDate(get(r, "dateOfJoining")) || (emp ? emp.dateOfJoining : ""),
      location: cleanText(get(r, "location")) || (emp ? emp.location : ""),
      designation: cleanText(get(r, "designation")) || (emp ? emp.designation : ""),
      attendanceMode: cleanText(get(r, "attendanceMode")) || (emp ? emp.attendanceMode : ""),
      incentiveCategory: cleanText(get(r, "incentiveCategory")) || (emp ? emp.incentiveCategory : ""),
      hodName: hod,
      day1: toScore(get(r, "day1")), day2: toScore(get(r, "day2")), day3: toScore(get(r, "day3")),
      day4: toScore(get(r, "day4")), day5: toScore(get(r, "day5")), day6: toScore(get(r, "day6")),
      day7: toScore(get(r, "day7")),
      rankAvg: avg,
      submittedDate: submitted instanceof Date ? formatDate(submitted, "yyyy-MM-dd HH:mm") : cleanText(submitted),
      submittedBy: cleanText(get(r, "submittedBy"))
    });
  });
  return list;
}

/**
 * Append weekly records in the Records sheet's own layout.
 * Duplicate (week start + employee) rows are skipped. A HOD can only submit their own staff.
 */
function handleSubmitWeeklyRecords(auth, payload) {
  var weekId = cleanText(payload.weekId);
  var records = payload.records;
  var hodName = auth.role === "HOD" ? auth.hodName : cleanText(payload.hodName);
  var submittedBy = auth.name || hodName || "Admin";

  if (!weekId || !records || !records.length) {
    return jsonResponse({ status: "error", message: "Missing weekId or records" });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RECORDS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RECORDS_SHEET_NAME);
    var headers = ["Week ID", "Week Start Date", "Week End Date", "Employee Code", "Employee Name", "HOD Name",
      "Day1", "Day2", "Day3", "Day4", "Day5", "Day6", "Day7", "Rank Avg", "Submitted Date", "Submitted By"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var layout = getRecordsLayout(sheet);
    var existingRows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, layout.width).getValues()
      : [];
    var fraction = recordsUseFractionScale(existingRows, layout);

    var staffByCode = {};
    getAllEmployeesFromSheet().forEach(function(emp) { staffByCode[emp.employeeCode.toUpperCase()] = emp; });

    var dupKey = function(start, codeOrName) { return start + "|" + nameKey(codeOrName); };
    var existing = {};
    existingRows.forEach(function(r) {
      var start = layout.weekStartDate !== undefined ? toIsoDate(r[layout.weekStartDate]) : "";
      var wk = layout.weekId !== undefined ? cleanText(r[layout.weekId]) : "";
      var period = start || wk;
      if (layout.employeeCode !== undefined && cleanText(r[layout.employeeCode])) existing[dupKey(period, r[layout.employeeCode])] = true;
      if (layout.employeeName !== undefined && cleanText(r[layout.employeeName])) existing[dupKey(period, r[layout.employeeName])] = true;
    });

    var submittedAt = formatDate(new Date(), "yyyy-MM-dd HH:mm");
    var newRows = [];
    var skippedDuplicates = [];
    var unauthorizedSkipped = [];

    records.forEach(function(rec) {
      var emp = staffByCode[cleanText(rec.employeeCode).toUpperCase()];
      if (!emp) { unauthorizedSkipped.push(rec.employeeCode); return; }
      if (hodName && nameKey(emp.hodName) !== nameKey(hodName)) { unauthorizedSkipped.push(emp.employeeCode); return; }

      var start = cleanText(rec.weekStartDate);
      var end = cleanText(rec.weekEndDate);
      var period = layout.weekStartDate !== undefined ? start : weekId;
      var useCode = layout.employeeCode !== undefined;
      if (existing[dupKey(period, useCode ? emp.employeeCode : emp.employeeName)]) {
        skippedDuplicates.push(emp.employeeCode);
        return;
      }

      var avg = averageScore([emp.day1, emp.day2, emp.day3, emp.day4, emp.day5, emp.day6, emp.day7]);
      var startDate = start ? new Date(start + "T00:00:00") : new Date();
      var values = {
        weekId: weekId,
        weekStartDate: start,
        weekEndDate: end,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        hodName: emp.hodName,
        company: emp.company,
        dateOfJoining: emp.dateOfJoining,
        location: emp.location,
        designation: emp.designation,
        attendanceMode: emp.attendanceMode,
        incentiveCategory: emp.incentiveCategory,
        day1: emp.day1, day2: emp.day2, day3: emp.day3, day4: emp.day4, day5: emp.day5, day6: emp.day6, day7: emp.day7,
        rankAvg: avg === null ? "" : (fraction ? avg / 10 : avg),
        month: formatDate(startDate, "MMMM"),
        year: Number(formatDate(startDate, "yyyy")),
        submittedDate: submittedAt,
        submittedBy: submittedBy
      };

      var row = [];
      for (var c = 0; c < layout.width; c++) row.push("");
      Object.keys(values).forEach(function(field) {
        if (layout[field] !== undefined) {
          var v = values[field];
          row[layout[field]] = v === null || v === undefined ? "" : v;
        }
      });
      newRows.push(row);
      existing[dupKey(period, useCode ? emp.employeeCode : emp.employeeName)] = true;
    });

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, layout.width).setValues(newRows);
    }

    return jsonResponse({
      status: "success",
      message: "Weekly records submitted (" + newRows.length + " added)",
      insertedCount: newRows.length,
      skippedDuplicates: skippedDuplicates,
      unauthorizedSkipped: unauthorizedSkipped
    });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Daily Log (month-wise, date-wise ranking)
// ---------------------------------------------------------------------------

function getDailyLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DAILY_LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DAILY_LOG_SHEET_NAME);
    var headers = ["Date", "Employee Code", "Employee Name", "HOD Name", "Rank", "Updated At", "Updated By"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.getRange("A:A").setNumberFormat("@"); // keep dates as plain yyyy-MM-dd text
  }
  return sheet;
}

/** Monday..Sunday ("yyyy-MM-dd") of the week containing today */
function currentWeekBounds() {
  var now = new Date();
  var today = formatDate(now, "yyyy-MM-dd");
  var p = today.split("-");
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  var offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  var start = new Date(d.getTime() - offset * 86400000);
  var end = new Date(start.getTime() + 6 * 86400000);
  var iso = function(x) { return x.toISOString().substring(0, 10); };
  return { today: today, start: iso(start), end: iso(end) };
}

/** Day number in the week for a "yyyy-MM-dd" date: Monday = 1 ... Sunday = 7 */
function weekDayNumber(isoDate) {
  var p = isoDate.split("-");
  var day = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Date ("yyyy-MM-dd") of Day 1-7 in the current week */
function dateForCurrentWeekDay(day) {
  var start = currentWeekBounds().start.split("-");
  var d = new Date(Date.UTC(Number(start[0]), Number(start[1]) - 1, Number(start[2])) + (day - 1) * 86400000);
  return d.toISOString().substring(0, 10);
}

/**
 * Single place where every rank is saved.
 * changes = [{ employeeCode, date: "yyyy-MM-dd", rank: 1-10 or null (clear) }]
 *  - 'Daily Log' sheet: the permanent, date-wise record of every rank (all HODs, all staff).
 *  - 'Staff' sheet Day1-Day7: kept in sync for dates in the current week.
 * Validates HOD ownership, date format, no future dates and rank 1-10. Uses batch writes.
 */
function applyRankChanges(auth, hodName, changes) {
  var week = currentWeekBounds();
  var updatedAt = formatDate(new Date(), "yyyy-MM-dd HH:mm");
  var updatedBy = auth.name || hodName;
  var saved = [];
  var skipped = [];

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var staffSheet = getStaffSheet();
    if (!staffSheet) return { saved: saved, skipped: ["Staff sheet not found"] };
    var staffRows = readStaffRows(staffSheet);
    var staffIndex = {};
    staffRows.forEach(function(r, i) {
      var code = cleanText(r[0]).toUpperCase();
      if (code) staffIndex[code] = i;
    });

    var logSheet = getDailyLogSheet();
    var logData = logSheet.getDataRange().getValues();
    var header = logData.shift();
    var width = header.length;
    var oldCount = logData.length;
    var logIndex = {};
    logData.forEach(function(row, i) {
      row[0] = toIsoDate(row[0]);
      logIndex[row[0] + "|" + cleanText(row[1]).toUpperCase()] = i;
    });

    var dayBlock = staffRows.map(function(r) { return r.slice(9, 16); });
    var staffChanged = {};

    (changes || []).forEach(function(ch) {
      ch = ch || {};
      var code = cleanText(ch.employeeCode).toUpperCase();
      var date = cleanText(ch.date);
      var clear = ch.rank === null || ch.rank === undefined || ch.rank === "";
      var rank = clear ? null : parseInt(ch.rank, 10);
      var si = staffIndex[code];
      var row = si === undefined ? null : staffRows[si];

      var problem = "";
      if (!row) problem = "employee not found";
      else if (nameKey(row[8]) !== nameKey(hodName)) problem = "not your staff";
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problem = "bad date";
      else if (date > week.today) problem = "future date";
      else if (weekDayNumber(date) === 7) problem = "Sunday is a holiday";
      else if (!clear && (isNaN(rank) || rank < 1 || rank > 10)) problem = "rank must be 1-10";
      if (problem) { skipped.push(code + " " + date + ": " + problem); return; }

      // 1) Daily Log (permanent record)
      var key = date + "|" + code;
      var logRow = clear ? null
        : [date, cleanText(row[0]), cleanText(row[1]), cleanText(row[8]), rank, updatedAt, updatedBy];
      if (logIndex.hasOwnProperty(key)) {
        logData[logIndex[key]] = logRow;
      } else if (!clear) {
        logIndex[key] = logData.length;
        logData.push(logRow);
      }

      // 2) Staff Day1-Day7 for the current week
      if (date >= week.start && date <= week.end) {
        dayBlock[si][weekDayNumber(date) - 1] = clear ? "" : rank;
        staffChanged[si] = true;
      }
      saved.push({ employeeCode: cleanText(row[0]), date: date, rank: rank });
    });

    // Write Daily Log (rows set to null were cleared)
    var kept = logData.filter(function(r) { return r !== null; }).map(function(r) {
      var out = r.slice(0, width);
      while (out.length < width) out.push("");
      return out;
    });
    if (kept.length > 0) {
      logSheet.getRange(2, 1, kept.length, 1).setNumberFormat("@");
      logSheet.getRange(2, 1, kept.length, width).setValues(kept);
    }
    if (oldCount > kept.length) {
      logSheet.getRange(kept.length + 2, 1, oldCount - kept.length, width).clearContent();
    }

    // Write Staff Day1-Day7 (and Rank Avg only when that column has no formula)
    var changedRows = Object.keys(staffChanged);
    if (changedRows.length > 0) {
      staffSheet.getRange(2, 10, dayBlock.length, 7).setValues(dayBlock);
      var avgRange = staffSheet.getRange(2, STAFF_COLUMNS, staffRows.length, 1);
      var hasFormula = avgRange.getFormulas().some(function(f) { return !!f[0]; });
      if (!hasFormula) {
        var fraction = staffRows.some(function(r) { var v = toScore(r[16]); return v !== null && v > 0 && v <= 1; });
        var avgValues = staffRows.map(function(r, i) {
          if (!staffChanged[i]) return [r[16]];
          var avg = averageScore(dayBlock[i].map(toScore));
          return [avg === null ? "" : (fraction ? avg / 10 : avg)];
        });
        avgRange.setValues(avgValues);
      }
    }

    // Fresh averages for the rows that changed
    saved.forEach(function(s) {
      var i = staffIndex[s.employeeCode.toUpperCase()];
      s.rankAvg = averageScore(dayBlock[i].map(toScore));
    });
  } finally {
    lock.releaseLock();
  }
  return { saved: saved, skipped: skipped };
}

function rankResponse(result, okMessage) {
  var ok = result.saved.length > 0;
  return jsonResponse({
    status: ok ? "success" : "error",
    message: ok
      ? okMessage + (result.skipped.length ? " (" + result.skipped.length + " skipped)" : "")
      : "Rank not saved: " + (result.skipped[0] || "nothing to save"),
    savedCount: result.saved.length,
    skipped: result.skipped,
    data: result.saved.length === 1 ? result.saved[0] : undefined
  });
}

/**
 * Daily Ranking page: rank for Day 1-7 of the current week.
 * Saved to the Daily Log with the real date, and to the Staff Day column.
 */
function handleSaveRanking(auth, payload) {
  var hodName = actingHodName(auth, payload.hodName);
  var day = parseInt(payload.day, 10);
  if (isNaN(day) || day < 1 || day > 7) return jsonResponse({ status: "error", message: "Day must be between 1 and 7" });
  var date = /^\d{4}-\d{2}-\d{2}$/.test(cleanText(payload.date)) ? cleanText(payload.date) : dateForCurrentWeekDay(day);
  var result = applyRankChanges(auth, hodName, [{ employeeCode: payload.employeeCode, date: date, rank: payload.rank }]);
  var s = result.saved[0];
  return rankResponse(result, s ? "Rank saved: " + s.rank + "/10 for " + s.date : "");
}

/** Monthly page: one cell (rank = null clears it) */
function handleSaveDailyRank(auth, payload) {
  var hodName = actingHodName(auth, payload.hodName);
  var clear = payload.rank === null || payload.rank === undefined || payload.rank === "";
  var result = applyRankChanges(auth, hodName, [{ employeeCode: payload.employeeCode, date: payload.date, rank: payload.rank }]);
  var s = result.saved[0];
  return rankResponse(result, s ? (clear ? "Rank cleared for " + s.date : "Rank saved: " + s.rank + "/10 for " + s.date) : "");
}

/** Bulk Rank: many cells in one request (max 5000) */
function handleSaveDailyRanksBulk(auth, payload) {
  var hodName = actingHodName(auth, payload.hodName);
  var entries = payload.entries;
  if (!hodName || !entries || !entries.length) return jsonResponse({ status: "error", message: "Missing HOD or entries" });
  if (entries.length > 5000) return jsonResponse({ status: "error", message: "Too many entries in one request (max 5000)" });
  var result = applyRankChanges(auth, hodName, entries);
  return rankResponse(result, "Saved " + result.saved.length + " ranks");
}

function getMonthlyRanksFromSheet(month, filterHodName) {
  month = cleanText(month);
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DAILY_LOG_SHEET_NAME);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var hod = filterHodName ? nameKey(filterHodName) : "";
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var date = toIsoDate(data[i][0]);
    if (date.indexOf(month) !== 0) continue;
    if (hod && nameKey(data[i][3]) !== hod) continue;
    var rank = Number(data[i][4]);
    if (!rank) continue;
    list.push({ date: date, employeeCode: cleanText(data[i][1]), rank: rank });
  }
  return list;
}

// ---------------------------------------------------------------------------
// One-time setup (only creates missing sheets; never overwrites existing headers)
// ---------------------------------------------------------------------------

function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(STAFF_SHEET_NAME)) {
    var staff = ss.insertSheet(STAFF_SHEET_NAME);
    var headers = ["Employee Code", "Employee Name", "Company", "Date Of Joining", "Location",
      "Designation", "Attendance Mode", "Incentive Category", "HOD Name",
      "Day1", "Day2", "Day3", "Day4", "Day5", "Day6", "Day7", "Rank Avg"];
    staff.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    staff.setFrozenRows(1);
  }
  getDailyLogSheet();
  return "Spreadsheet ready.";
}
