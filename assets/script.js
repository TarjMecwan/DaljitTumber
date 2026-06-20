/* =========================================================
   Daljit Tumber — interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- sticky header ---------- */
  var header = document.querySelector(".header");
  function onScroll() {
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector(".burger");
  var menu = document.querySelector(".mobile-menu");
  function closeMenu() {
    menu.classList.remove("open");
    burger.classList.remove("active");
    document.body.style.overflow = "";
  }
  burger.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    burger.classList.toggle("active", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });

  /* ---------- scroll reveal ---------- */
  /* hero content is above the fold on load — reveal it immediately
     rather than waiting on an intersection that may never fire if it
     sits within the observer's bottom rootMargin. */
  document.querySelectorAll(".hero .reveal, .listing-hero .reveal").forEach(function (el) {
    el.classList.add("in");
  });

  /* ---------- heading typewriters ---------- */
  function twBuildChars(node, emFlag) {
    var chars = [];
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        var text = child.textContent;
        for (var i = 0; i < text.length; i++) chars.push({ ch: text[i], em: emFlag });
      } else if (child.nodeName === "BR") {
        chars.push({ br: true });
      } else if (child.nodeName === "EM") {
        chars = chars.concat(twBuildChars(child, true));
      } else {
        chars = chars.concat(twBuildChars(child, emFlag));
      }
    });
    return chars;
  }

  function twRenderChars(chars, count) {
    var html = "";
    var emOpen = false;
    for (var i = 0; i < count; i++) {
      var c = chars[i];
      if (c.br) {
        if (emOpen) { html += "</em>"; emOpen = false; }
        html += "<br>";
        continue;
      }
      if (c.em && !emOpen) { html += "<em>"; emOpen = true; }
      if (!c.em && emOpen) { html += "</em>"; emOpen = false; }
      html += c.ch;
    }
    if (emOpen) html += "</em>";
    return html;
  }

  function twAriaLabel(el) {
    return el.innerHTML
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function twSetup(el) {
    var chars = twBuildChars(el, false);
    var hasBreak = chars.some(function (c) { return c.br; });
    el.setAttribute("aria-label", twAriaLabel(el));
    el.innerHTML = "";

    var textSpan = document.createElement("span");
    textSpan.className = "tw-text";

    var caret = document.createElement("span");
    caret.className = "tw-caret";

    if (hasBreak) {
      /* multi-line heading: reserve final layout height with a hidden
         ghost so the page doesn't jump as lines fill in */
      var host = document.createElement("span");
      host.className = "tw-host";

      var ghost = document.createElement("span");
      ghost.className = "tw-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.innerHTML = twRenderChars(chars, chars.length);

      var overlay = document.createElement("span");
      overlay.className = "tw-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.appendChild(textSpan);
      overlay.appendChild(caret);

      host.appendChild(ghost);
      host.appendChild(overlay);
      el.appendChild(host);
    } else {
      /* single-line eyebrow: no height change, type straight into place */
      var wrap = document.createElement("span");
      wrap.className = "tw-inline";
      wrap.setAttribute("aria-hidden", "true");
      wrap.appendChild(textSpan);
      wrap.appendChild(caret);
      el.appendChild(wrap);
    }

    return { chars: chars, textSpan: textSpan, caret: caret };
  }

  function twInstant(setup) {
    setup.textSpan.innerHTML = twRenderChars(setup.chars, setup.chars.length);
    setup.caret.classList.add("done");
  }

  function twPlay(setup, speed, onDone) {
    var i = 0;
    (function step() {
      i++;
      setup.textSpan.innerHTML = twRenderChars(setup.chars, i);
      if (i < setup.chars.length) {
        setTimeout(step, speed);
      } else {
        setTimeout(function () { setup.caret.classList.add("done"); }, 3000);
        if (onDone) onDone();
      }
    })();
  }

  var twGroups = Array.prototype.map.call(
    document.querySelectorAll(".hero-inner, .section-head, .about-body, .contact-card"),
    function (container) {
      var eyebrow = container.querySelector(".eyebrow");
      var heading = container.querySelector("h1, h2");
      if (!eyebrow || !heading) return null;
      return { container: container, eyebrow: twSetup(eyebrow), heading: twSetup(heading) };
    }
  ).filter(Boolean);

  var twReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TW_SPEED = 40;

  if (twReduceMotion) {
    twGroups.forEach(function (g) {
      twInstant(g.eyebrow);
      twInstant(g.heading);
    });
  } else if ("IntersectionObserver" in window) {
    var twIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var g = twGroups.filter(function (x) { return x.container === entry.target; })[0];
        if (!g) return;
        twPlay(g.eyebrow, TW_SPEED, function () { twPlay(g.heading, TW_SPEED); });
        twIO.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    twGroups.forEach(function (g) { twIO.observe(g.container); });
  } else {
    twGroups.forEach(function (g) {
      twInstant(g.eyebrow);
      twInstant(g.heading);
    });
  }

  var reveals = Array.prototype.filter.call(
    document.querySelectorAll(".reveal"),
    function (el) { return !el.closest(".hero"); }
  );
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- property tour video ---------- */
  var videoFrame = document.querySelector(".video-frame");
  if (videoFrame) {
    var tourVideo = videoFrame.querySelector("video");
    var playBtn = videoFrame.querySelector(".play-btn");
    playBtn.addEventListener("click", function () {
      tourVideo.controls = true;
      tourVideo.play();
    });
    tourVideo.addEventListener("play", function () { playBtn.classList.add("hidden"); });
    tourVideo.addEventListener("pause", function () { playBtn.classList.remove("hidden"); });
  }

  /* ---------- testimonials slider ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".tst-slide"));
  if (slides.length) {
    var dotsWrap = document.querySelector(".tst-dots");
    var current = 0, timer = null;

    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.setAttribute("aria-label", "Testimonial " + (i + 1));
      b.addEventListener("click", function () { go(i, true); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function go(i, user) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("active", n === current); });
      dots.forEach(function (d, n) { d.classList.toggle("active", n === current); });
      if (user) restart();
    }
    function next() { go(current + 1); }
    function prev() { go(current - 1); }
    function restart() {
      clearInterval(timer);
      timer = setInterval(next, 6500);
    }

    var nextBtn = document.querySelector(".tst-next");
    var prevBtn = document.querySelector(".tst-prev");
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });

    go(0);
    restart();
  }

  /* ---------- nav active state (scroll-spy) ---------- */
  var navPairs = Array.prototype.map.call(
    document.querySelectorAll(".nav-links a"),
    function (a) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      return target ? { link: a, target: target } : null;
    }
  ).filter(Boolean);

  if (navPairs.length && "IntersectionObserver" in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navPairs.forEach(function (p) {
          p.link.classList.toggle("active", p.target === entry.target);
        });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });

    navPairs.forEach(function (p) { navIO.observe(p.target); });
  }

  /* ---------- footer year ---------- */
  var y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
