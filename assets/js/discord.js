/* =========================================================
   DcDemo — маленький «движок» для демо в окне Discord.
   Без библиотек. Разметка окна:
     <div class="dc" id="demo">
       <div class="dc__bar">…</div>
       <div class="dc__log" role="log" aria-live="polite"></div>
       <div class="dc__typing" aria-hidden="true"></div>
       <div class="dc__input">Написать в #канал</div>
     </div>
   Пример:
     const demo = new DcDemo(document.getElementById('demo'));
     demo.whenVisible(() => demo.play(async (t) => {
       await demo.typing('Clan Radar', 900, t);
       demo.push(DcDemo.msg({ avatar, name: 'Clan Radar', color: '#2EE6C5', app: true, body: '…' }));
       await demo.sleep(1500, t);
     }));
     demo.on('accept', (btn) => { … });   // <button data-dc-action="accept">
   Прогон отменяется через demo.reset() / новый demo.play().
   ========================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const CANCEL = Symbol("dc-cancel");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  class DcDemo {
    constructor(root, opts = {}) {
      if (!root) throw new Error("DcDemo: нет элемента окна");
      this.root = root;
      this.log = root.querySelector(".dc__log");
      this.typingEl = root.querySelector(".dc__typing");
      this.handlers = {};
      this.token = 0;
      this.speed = opts.speed || 1;
      this.visible = false;
      this._visWaiters = [];

      root.addEventListener("click", (e) => {
        const t = e.target.closest("[data-dc-action]");
        if (!t || !root.contains(t) || t.disabled || t.getAttribute("aria-disabled") === "true") return;
        e.preventDefault();
        this.emit(t.dataset.dcAction, t, e);
      });

      // Закрыть открытые меню при клике мимо
      root.addEventListener("click", (e) => {
        root.querySelectorAll(".dc-select.is-open").forEach((s) => {
          if (!s.contains(e.target)) DcDemo.toggleSelect(s, false);
        });
      });
      root.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          root.querySelectorAll(".dc-select.is-open").forEach((s) => DcDemo.toggleSelect(s, false));
        }
      });

      // Следим, видно ли окно: циклы на паузе, пока окно за экраном или вкладка скрыта
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          (entries) => {
            this.visible = entries[0].isIntersecting && !document.hidden;
            if (this.visible) this._flushVis();
          },
          { threshold: 0.2 }
        ).observe(root);
      } else {
        this.visible = true;
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.visible = false;
        else if (this._inView()) { this.visible = true; this._flushVis(); }
      });
    }

    _inView() {
      const r = this.root.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    }
    _flushVis() {
      const w = this._visWaiters;
      this._visWaiters = [];
      w.forEach((fn) => fn());
    }

    /* ---- события кнопок ---- */
    on(name, fn) {
      (this.handlers[name] ||= []).push(fn);
      return this;
    }
    emit(name, el, ev) {
      (this.handlers[name] || []).forEach((fn) => fn(el, ev));
    }

    /* ---- прогоны ---- */
    get reduced() {
      return reduceMotion.matches;
    }
    reset() {
      this.token++;
      this.log.innerHTML = "";
      this.hideTyping();
      this.root.querySelectorAll(".dc-modal").forEach((m) => (m.hidden = true));
      return this.token;
    }
    alive(t) {
      return t === this.token;
    }
    /** Запустить сценарий. script(t) получает «жетон» прогона — передавайте его в sleep/typing. */
    async play(script) {
      const t = this.reset();
      try {
        await script(t);
      } catch (e) {
        if (e !== CANCEL) console.error(e);
      }
    }
    /** Пауза. При «уменьшить движение» — почти без ожидания. Ждёт, пока окно снова станет видно. */
    sleep(ms, t = this.token) {
      const dur = this.reduced ? Math.min(ms, 60) : ms / this.speed;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!this.alive(t)) return reject(CANCEL);
          if (this.visible) return resolve();
          this._visWaiters.push(() => (this.alive(t) ? resolve() : reject(CANCEL)));
        }, dur);
      });
    }
    /** Показать «Имя печатает…» на ms миллисекунд. */
    async typing(name, ms, t = this.token) {
      this.showTyping(name);
      try {
        await this.sleep(ms, t);
      } finally {
        this.hideTyping();
      }
    }
    showTyping(name) {
      if (!this.typingEl) return;
      this.typingEl.innerHTML = `<i><span></span><span></span><span></span></i><b>${esc(name)}</b>&nbsp;печатает…`;
      this.typingEl.classList.add("is-on");
    }
    hideTyping() {
      if (this.typingEl) this.typingEl.classList.remove("is-on");
    }

    /* ---- сообщения ---- */
    /** Добавить разметку в ленту. Возвращает первый добавленный элемент. */
    push(html) {
      const tpl = document.createElement("template");
      tpl.innerHTML = String(html).trim();
      const nodes = [...tpl.content.children];
      nodes.forEach((n) => {
        if (!this.reduced) n.classList.add("dc-in");
        this.log.appendChild(n);
        n.querySelectorAll("img").forEach((img) => {
          if (!img.complete) img.addEventListener("load", () => this.scroll(), { once: true });
        });
      });
      this.scroll();
      return nodes[0];
    }
    /** Прокрутить только ленту (страница не прыгает). */
    scroll() {
      this.log.scrollTop = this.log.scrollHeight;
    }
    /** Набрать текст в элемент по буквам (для полей формы). */
    async typeInto(el, text, t = this.token, cps = 32) {
      el.textContent = "";
      if (this.reduced) {
        el.textContent = text;
        return;
      }
      el.classList.add("is-typing");
      try {
        for (const ch of text) {
          el.textContent += ch;
          await this.sleep(1000 / cps, t);
        }
      } finally {
        el.classList.remove("is-typing");
      }
    }
    openModal(modal) {
      modal.hidden = false;
      const f = modal.querySelector("button, [tabindex]");
      if (f) f.focus({ preventScroll: true });
    }
    closeModal(modal) {
      modal.hidden = true;
    }
    /** Запустить fn один раз, когда окно впервые появится на экране. */
    whenVisible(fn) {
      if (!("IntersectionObserver" in window)) return fn();
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            io.disconnect();
            fn();
          }
        },
        { threshold: 0.3 }
      );
      io.observe(this.root);
    }

    /* ---- помощники для разметки ---- */
    static msg({ avatar = "", name = "", color = "", app = false, time = "Сегодня в 12:00", reply = "", body = "", cont = false, cls = "" }) {
      const head = cont
        ? ""
        : `<div class="dc-msg__head"><span class="dc-msg__name"${color ? ` style="color:${color}"` : ""}>${esc(name)}</span>${
            app ? '<span class="dc-app">Приложение</span>' : ""
          }<time>${esc(time)}</time></div>`;
      const classes = ["dc-msg", cont ? "dc-msg--cont" : "", reply ? "dc-msg--has-reply" : "", cls].filter(Boolean).join(" ");
      return `<div class="${classes}"><img class="dc-msg__avatar" src="${avatar}" alt="" width="40" height="40" loading="lazy" decoding="async"><div class="dc-msg__body">${reply}${head}${body}</div></div>`;
    }
    /** Строка «Игрок использует /команда». */
    static reply({ avatar = "", name = "Игрок", command = "" }) {
      return `<div class="dc-reply"><img src="${avatar}" alt="" width="16" height="16"><b>${esc(name)}</b> использует <span class="dc-cmd">${esc(command)}</span></div>`;
    }
    static ephemeral() {
      return '<div class="dc-ephemeral">Только вы видите это сообщение · <a href="#" tabindex="-1" aria-hidden="true">Скрыть</a></div>';
    }
    static toggleSelect(sel, open) {
      const isOpen = open ?? !sel.classList.contains("is-open");
      sel.classList.toggle("is-open", isOpen);
      const btn = sel.querySelector(".dc-select__btn");
      if (btn) btn.setAttribute("aria-expanded", String(isOpen));
    }
  }

  DcDemo.CANCEL = CANCEL;
  DcDemo.esc = esc;
  window.DcDemo = DcDemo;
})();
