/**
 * Obiter Marketing Site — Main Script
 */

(function () {
  "use strict";

  // -------------------------------------------------------
  // Mobile navigation toggle
  // -------------------------------------------------------

  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".site-nav__links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close mobile nav when a link is clicked
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // -------------------------------------------------------
  // Smooth scrolling for anchor links
  // -------------------------------------------------------

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var targetId = this.getAttribute("href");
      if (targetId === "#") return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // -------------------------------------------------------
  // Contact form submission (contact.html)
  // -------------------------------------------------------

  document.querySelectorAll(".contact-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var statusEl = form.querySelector(".form-status");
      var submitBtn = form.querySelector('button[type="submit"]');
      var typeSelect = form.querySelector('select[name="type"]');
      var formType = typeSelect ? typeSelect.value : (form.dataset.formType || "general");

      if (!statusEl || !submitBtn) return;

      // Clear previous status
      statusEl.className = "form-status";
      statusEl.textContent = "";

      // Basic validation
      var name = form.querySelector('input[name="name"]');
      var email = form.querySelector('input[name="email"]');
      var message = form.querySelector('textarea[name="message"]');

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        statusEl.className = "form-status form-status--error";
        statusEl.textContent = "All fields are required.";
        return;
      }

      // Disable button during submission
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending\u2026";

      var payload = {
        type: formType,
        name: name.value.trim(),
        email: email.value.trim(),
        message: message.value.trim()
      };

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Server returned " + response.status);
          }
          return response.json();
        })
        .then(function () {
          statusEl.className = "form-status form-status--success";
          statusEl.textContent = "Message sent. Thank you.";
          form.reset();
        })
        .catch(function () {
          statusEl.className = "form-status form-status--error";
          statusEl.textContent =
            "Unable to send your message. Please try again or email directly.";
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        });
    });
  });

  // -------------------------------------------------------
  // Open letter signatures (aglc5.html)
  // -------------------------------------------------------

  // Load and display approved signatures
  var sigList = document.getElementById("signature-list");
  var sigCount = document.getElementById("signature-count");

  if (sigList) {
    fetch("/api/signatures")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (sigCount) {
          sigCount.textContent = data.count + " signator" + (data.count !== 1 ? "ies" : "y");
        }

        if (data.signatures && data.signatures.length > 0) {
          sigList.innerHTML = "";
          data.signatures.forEach(function (sig) {
            var li = document.createElement("li");
            li.className = "signature-item";
            li.innerHTML =
              "<span class=\"signature-name\">" + escapeHtml(sig.name) + "</span>" +
              "<span class=\"signature-title\">" + escapeHtml(sig.title) + "</span>";
            sigList.appendChild(li);
          });
        } else {
          sigList.innerHTML = "<li class=\"signature-empty\">Be the first to sign.</li>";
        }
      })
      .catch(function () {
        sigList.innerHTML = "<li class=\"signature-empty\">Unable to load signatures.</li>";
      });
  }

  // Signature form submission
  var sigForm = document.getElementById("signature-form");

  if (sigForm) {
    sigForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var statusEl = sigForm.querySelector(".form-status");
      var submitBtn = sigForm.querySelector('button[type="submit"]');

      if (!statusEl || !submitBtn) return;

      statusEl.className = "form-status";
      statusEl.textContent = "";

      var name = sigForm.querySelector('input[name="name"]');
      var title = sigForm.querySelector('input[name="title"]');
      var institution = sigForm.querySelector('input[name="institution"]');
      var email = sigForm.querySelector('input[name="email"]');

      if (!name.value.trim() || !title.value.trim() || !email.value.trim()) {
        statusEl.className = "form-status form-status--error";
        statusEl.textContent = "Name, title, and email are required.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting\u2026";

      var payload = {
        name: name.value.trim(),
        title: title.value.trim(),
        institution: institution ? institution.value.trim() : "",
        email: email.value.trim()
      };

      fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "Server returned " + response.status);
            }
            return data;
          });
        })
        .then(function (data) {
          statusEl.className = "form-status form-status--success";
          statusEl.textContent = data.message || "Verification email sent. Please check your inbox.";
          sigForm.reset();
        })
        .catch(function (err) {
          statusEl.className = "form-status form-status--error";
          statusEl.textContent = err.message || "Unable to submit your signature. Please try again.";
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign the Letter";
        });
    });
  }

  // -------------------------------------------------------
  // Helper: escape HTML
  // -------------------------------------------------------

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
