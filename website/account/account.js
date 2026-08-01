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

  /**
   * Post the token pair + email back to the Office task pane, if we are running
   * inside an Office Dialog. Returns true when the message was sent.
   */
  function messageTokensToParent(tokens, email) {
    if (
      global.Office &&
      global.Office.context &&
      global.Office.context.ui &&
      typeof global.Office.context.ui.messageParent === "function"
    ) {
      global.Office.context.ui.messageParent(
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          email: email,
        })
      );
      return true;
    }
    return false;
  }

  global.ObiterAccount = {
    queryParam: queryParam,
    postJson: postJson,
    turnstileToken: turnstileToken,
    messageTokensToParent: messageTokensToParent,
  };
})(window);
