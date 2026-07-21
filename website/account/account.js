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
   * Read the Turnstile response token from the first widget on the page.
   * Returns an empty string when Turnstile has not been solved or is absent.
   */
  function turnstileToken() {
    try {
      if (global.turnstile && typeof global.turnstile.getResponse === "function") {
        return global.turnstile.getResponse() || "";
      }
    } catch (e) {
      /* widget not ready */
    }
    var input = document.querySelector('input[name="cf-turnstile-response"]');
    return input ? input.value : "";
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
