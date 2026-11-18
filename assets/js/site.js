/* =========================================================
   Wipe Studio — общий скрипт всех страниц
   - шапка: тень при прокрутке, меню на телефоне
   - плавное появление блоков [data-reveal]
   - кнопки контактов [data-contact]
   ========================================================= */
(function () {
  "use strict";

  /* ---- Контакты: меняются только здесь ---- */
  const CONTACTS = {
    discordNick: "godz_1la",
    // Цифровой ID профиля Discord. Если заполнить — кнопка будет открывать профиль.
    // Пока пусто: кнопка копирует ник и подсказывает, как добавить в друзья.
    discordUserId: "",
    telegram: "PursuitOfGoals",
  };
  window.WIPE_CONTACTS = CONTACTS;

  document.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Шапка ---- */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = header.querySelector(".menu-toggle");
    const nav = header.querySelector(".nav");
    const setMenu = (open) => {
      document.body.classList.toggle("menu-open", open);
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      }
    };
    if (toggle && nav) {
      toggle.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
      nav.addEventListener("click", (e) => {
        if (e.target.closest("a")) setMenu(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
          setMenu(false);
          toggle.focus();
        }
      });
      window.matchMedia("(min-width: 901px)").addEventListener("change", (m) => m.matches && setMenu(false));
    }
  }

  /* ---- Появление при прокрутке ----
     data-reveal              — блок плавно появляется
     data-reveal="fade|scale" — другой вид
     data-stagger             — на родителе: дети с data-reveal появляются по очереди */
  document.querySelectorAll("[data-stagger]").forEach((parent) => {
    const step = parseFloat(parent.dataset.stagger) || 0.08;
    parent.querySelectorAll(":scope > [data-reveal]").forEach((el, i) => el.style.setProperty("--reveal-delay", `${(i * step).toFixed(2)}s`));
  });
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---- Подсказка внизу экрана ---- */
  let toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    requestAnimationFrame(() => toastEl.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4200);
  }
  window.wipeToast = toast;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {}
      ta.remove();
      return ok;
    }
  }

  /* ---- Контакты ----
     <a data-contact="discord">  — профиль Discord (или копирует ник)
     <a data-contact="telegram"> — Telegram */
  document.querySelectorAll('[data-contact="telegram"]').forEach((a) => {
    a.href = `https://t.me/${CONTACTS.telegram}`;
    a.target = "_blank";
    a.rel = "noopener";
  });
  document.querySelectorAll('[data-contact="discord"]').forEach((a) => {
    if (CONTACTS.discordUserId) {
      a.href = `https://discord.com/users/${CONTACTS.discordUserId}`;
      a.target = "_blank";
      a.rel = "noopener";
      return;
    }
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const ok = await copyText(CONTACTS.discordNick);
      toast(
        ok
          ? `Ник ${CONTACTS.discordNick} скопирован. В Discord: Друзья → Добавить в друзья → вставьте ник.`
          : `Мой ник в Discord: ${CONTACTS.discordNick}. Добавьте в друзья и напишите.`
      );
    });
  });

  /* ---- Год в подвале ---- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
})();
