/*
 * Obiter — Account pages shared helpers (ACCT-005)
 *
 * Plain browser JS (no build step) shared by the account pages served from
 * obiter.com.au. Talks to the account API at the same origin. No key material
 * or token is logged. The auth page additionally runs inside an Office Dialog
 * and messages the token pair back to the task pane via Office.messageParent.
 */
(function (global) {
  "use strict";

  var API = "/api";

  /** Read a query-string parameter. */
  function queryParam(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name);
  }

  /** POST JSON and resolve the parsed body; rejects with the server error text. */
  function postJson(path, body) {
    return fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (json) {
          if (!res.ok) {
            var err = new Error(json.error || "Request failed (" + res.status + ").");
            err.code = json.code;
            err.status = res.status;
            throw err;
          }
          return json;
        });
    });
  }

  /**
   * Read the Turnstile response token from the solved widget in the currently
   * visible view. The auth page renders TWO widgets (sign-in + sign-up), so
   * `turnstile.getResponse()` without a widgetId is unreliable — it can return
   * the wrong widget's (empty) response. Read the hidden `cf-turnstile-response`
   * input written by the widget instead, preferring one inside a view that is
   * not `.account-hidden`. Returns "" when nothing has been solved.
   */
  function turnstileToken() {
    var inputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
    // Prefer the token of a widget in the currently visible view.
    for (var i = 0; i < inputs.length; i++) {
      var hidden = inputs[i].closest && inputs[i].closest(".account-hidden");
      if (!hidden && inputs[i].value) return inputs[i].value;
    }
    // Fallback: any solved widget on the page.
    for (var j = 0; j < inputs.length; j++) {
      if (inputs[j].value) return inputs[j].value;
    }
    return "";
  }

  /** True when the page is running inside an Office Dialog (task-pane sign-in). */
  function inOfficeDialog() {
    return !!(
      global.Office &&
      global.Office.context &&
      global.Office.context.ui &&
      typeof global.Office.context.ui.messageParent === "function"
    );
  }

  /**
   * Post the token pair + email back to the Office task pane, if we are running
   * inside an Office Dialog. Returns true when the message was sent.
   */
  function messageTokensToParent(tokens, email) {
    if (!inOfficeDialog()) return false;
    // office.js is loaded on the auth page so this can be reached from a plain
    // browser too; messageParent throws outside a real dialog. Treat any failure
    // as "not in a dialog" so the caller falls back to the web-session redirect.
    try {
      global.Office.context.ui.messageParent(
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          email: email,
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  // ─── Web session (portal use — not the Office Dialog bridge) ────────────────
  // The account portal (index.html) runs as an ordinary web page and keeps the
  // token pair in sessionStorage, mirroring admin.html. Access token is
  // short-lived; a 401 triggers one refresh via /api/auth/refresh.

  var ACCESS_KEY = "obiterAccountAccess";
  var REFRESH_KEY = "obiterAccountRefresh";

  function saveSession(tokens) {
    try {
      sessionStorage.setItem(ACCESS_KEY, (tokens && tokens.accessToken) || "");
      sessionStorage.setItem(REFRESH_KEY, (tokens && tokens.refreshToken) || "");
    } catch (e) { /* storage unavailable */ }
  }
  function getAccessToken() {
    try { return sessionStorage.getItem(ACCESS_KEY) || ""; } catch (e) { return ""; }
  }
  function getRefreshToken() {
    try { return sessionStorage.getItem(REFRESH_KEY) || ""; } catch (e) { return ""; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(ACCESS_KEY); sessionStorage.removeItem(REFRESH_KEY); } catch (e) { /* */ }
  }

  function tryRefresh() {
    var rt = getRefreshToken();
    if (!rt) return Promise.resolve(false);
    return fetch(API + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    }).then(function (r) {
      if (!r.ok) return false;
      return r.json().then(function (d) {
        if (d && d.accessToken) { saveSession({ accessToken: d.accessToken, refreshToken: d.refreshToken || rt }); return true; }
        return false;
      });
    }).catch(function () { return false; });
  }

  /**
   * Authenticated fetch for the portal. Injects the access token, and on a 401
   * refreshes once and retries. Resolves the parsed JSON body; rejects (with
   * err.status / err.code) on a non-ok response. On terminal 401 it clears the
   * session so the caller can redirect to sign-in.
   */
  function authFetch(path, opts) {
    opts = opts || {};
    function attempt() {
      var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      headers["Authorization"] = "Bearer " + getAccessToken();
      return fetch(API + path, Object.assign({}, opts, { headers: headers }));
    }
    return attempt().then(function (r) {
      if (r.status !== 401) return r;
      return tryRefresh().then(function (ok) {
        if (!ok) { clearSession(); return r; }
        return attempt();
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (json) {
        if (!r.ok) {
          var err = new Error(json.error || "Request failed (" + r.status + ").");
          err.code = json.code; err.status = r.status;
          throw err;
        }
        return json;
      });
    });
  }

  global.ObiterAccount = {
    queryParam: queryParam,
    postJson: postJson,
    turnstileToken: turnstileToken,
    messageTokensToParent: messageTokensToParent,
    inOfficeDialog: inOfficeDialog,
    saveSession: saveSession,
    getAccessToken: getAccessToken,
    clearSession: clearSession,
    authFetch: authFetch,
  };
})(window);
