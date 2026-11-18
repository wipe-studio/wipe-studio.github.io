/* =========================================================
   Страница Clan Ticket Bot: интерактивное демо и переключатель тем.
   Всё выдумано для показа, настоящего бота нет.
   ========================================================= */
(function () {
  "use strict";

  const IMG = "../assets/img/";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Тексты из config/clan.json ---------- */
  const CLAN = "UERITY TEAM";
  const REQUIREMENTS = [
    "от 16+ лет (без исключений)",
    "от 4000 часов (на одном аккаунте)",
    "обязательная игра на hellis (ffa ак 45+ kills), r2 (fc 50+ kills)",
    "хороший трекинг, аим, спрей трансфер (x3d в приоритете)",
    "от 8 часов online (ночной онлайн в приоритете)",
    "наличие опыта игры в клане",
    "понимание всех аспектов игры",
  ];
  const INFO = [
    "Уведомление о приглашении на обзвон отправляется в личные сообщения. Если ЛС закрыты - придёт в закрытый канал, видимый только Вам и рекрутам.",
    "Заявки рассматриваются только по окончанию вайпа.",
    "В среднем заявки обрабатываются в течение 1–2 дней.",
  ];
  const COOLDOWN_LINE = "В случае отказа можете подать заявку повторно через 7 дней.";
  const SELECT_PLACEHOLDER = "Выберите тип заявки...";
  const OPTIONS = [
    { type: "clan", label: "Подать заявку в клан", note: "" },
    { type: "partner", label: "Предложить сотрудничество", note: "Работает и при закрытом наборе" },
    { type: "question", label: "Вопрос к руководству", note: "Работает и при закрытом наборе" },
  ];
  // Вопросы анкеты и выдуманные ответы
  const QUESTIONS = [
    { label: "Имя, Возраст, Кол-во часов, Онлайн в день", area: false, answer: "Макс, 19, 5200 ч, 8 ч в день" },
    { label: "Конфигурация ПК", area: true, answer: "Ryzen 7 5800X3D, RTX 3070, 32 ГБ, монитор 240 Гц" },
    { label: "Все Steam профили и BattleMetrics ID", area: true, answer: "steamcommunity.com/profiles/76561198000000001\nBM ID: 1234567" },
    { label: "В каких кланах играл и почему ушёл?", area: false, answer: "Два клана, ушёл после вайпа: не хватало онлайна" },
    { label: "На какую роль претендуешь?", area: false, answer: "Боец, ночной онлайн" },
  ];
  const DENY_REASON = "Не хватает часов на одном аккаунте";

  const CAND = { name: "night_owl", avatar: IMG + "avatars/user-1.svg" };
  const REC = { name: "Лис" };
  const BOT = { name: "Clan Ticket Bot", color: "#FF6B35", avatar: IMG + "avatars/ticket.webp" };

  const emoji = (file, size = 22) => `<img class="dc-emoji" src="${IMG}emoji/${file}.webp" alt="" width="${size}" height="${size}" loading="lazy">`;
  const mention = (t) => `<span class="dc-mention">${esc(t)}</span>`;
  const banner = (key = "sunset") =>
    `<picture><source media="(prefers-reduced-motion: reduce)" srcset="${IMG}banners/${key}-still.webp"><img class="dc-box__media" src="${IMG}banners/${key}.webp" alt="Баннер с названием клана ${CLAN}" width="720" height="240" loading="lazy"></picture>`;
  const botMsg = (body, extra = {}) => DcDemo.msg({ avatar: BOT.avatar, name: BOT.name, color: BOT.color, app: true, time: "Сегодня в 12:00", body, ...extra });

  /* =========================================================
     Демо
     ========================================================= */
  function initDemo() {
    const root = $("#ticket-demo");
    if (!root || !window.DcDemo) return;
    const demo = new DcDemo(root);

    const elCount = $("#demo-count");
    const elHint = $("#demo-hint");
    const dots = [...document.querySelectorAll(".demo-dots li")];
    const elChannel = $("#dm-channel");
    const elTopic = $("#dm-topic");
    const formModal = $("#dm-form");
    const denyModal = $("#dm-deny");
    const submitBtn = $("#dm-submit");
    const denySubmit = $("#dm-deny-submit");
    const reasonEl = $("#dm-reason");

    const HINTS = {
      1: "Вы кандидат. Откройте меню в сообщении бота и выберите «Подать заявку в клан».",
      2: "Бот открыл анкету, ответы вписываются сами. Когда всё готово, нажмите «Отправить».",
      3: "Бот создал отдельный канал для вашей заявки, в нём видны анкета и часы из Steam. Теперь вы рекрутер: нажмите «Принять». Можно и «Отказать».",
      4: "Готово. Нажмите «Сначала» в углу окна и пройдите ещё раз: теперь нажмите «Отказать».",
    };
    let step = 1;
    let baseHint = HINTS[1];

    function setStep(n, hint) {
      step = n;
      baseHint = hint || HINTS[n];
      elCount.textContent = `Шаг ${n} из 4`;
      elHint.textContent = baseHint;
      dots.forEach((d, i) => {
        d.classList.toggle("is-done", i < n - 1);
        d.classList.toggle("is-now", i === n - 1);
      });
    }
    const sideHint = (text) => (elHint.textContent = `${text} ${baseHint}`);
    function setChannel(name, topic) {
      elChannel.textContent = name;
      elTopic.textContent = topic || "";
      elTopic.hidden = !topic;
    }
    // Запуск шага: ошибки отмены (кнопка «Сначала») молча гасим
    async function go(fn) {
      const t = demo.token;
      try {
        await fn(t);
      } catch (e) {
        if (e !== DcDemo.CANCEL) console.error(e);
      }
    }
    const cancelPending = () => demo.token++;

    /* ---- Шаг 1: панель набора ---- */
    function panelHTML() {
      const reqs = REQUIREMENTS.map((r) => `<div>${emoji("ring-sunset")} <b>${esc(r)}</b></div>`).join("");
      const info = INFO.map((p) => `<p>${esc(p)}</p>`).join("");
      const opts = OPTIONS.map(
        (o, i) =>
          `<button type="button" class="dc-option${i === 0 ? " is-pick" : ""}" role="option" data-dc-action="pick" data-type="${o.type}"><span><b>${esc(o.label)}</b>${
            o.note ? `<small>${esc(o.note)}</small>` : ""
          }</span></button>`
      ).join("");
      const box = `<div class="dc-box" style="--embed:#FF6B35">
        ${banner("sunset")}
        <div class="dc-box__text"><div class="dc-h2">${emoji("fire-sunset", 26)} Заявка в ${CLAN}</div></div>
        <div class="dc-box__text dc-reqs">${reqs}</div>
        <hr class="dc-sep">
        <div class="dc-box__text">${info}</div>
        <hr class="dc-sep">
        <div class="dc-box__text"><p>${esc(COOLDOWN_LINE)}</p><p>Текущий статус: ${emoji("status-green")} Набор открыт</p></div>
        <hr class="dc-sep">
        <div class="dc-select is-up is-hint" id="dm-select">
          <button type="button" class="dc-select__btn" id="dm-select-btn" aria-haspopup="listbox" aria-expanded="false" data-dc-action="toggle">${SELECT_PLACEHOLDER}</button>
          <div class="dc-select__menu" role="listbox" aria-label="Тип заявки">${opts}</div>
        </div>
      </div>`;
      return botMsg(box);
    }

    async function start() {
      await demo.play(async () => {
        setChannel("набор", "Заявки в " + CLAN);
        setStep(1);
        submitBtn.disabled = true;
        denySubmit.disabled = true;
        demo.push(panelHTML());
      });
    }

    /* ---- Шаг 2: анкета ---- */
    function buildForm() {
      $("#dm-fields").innerHTML = QUESTIONS.map(
        (q, i) => `<span class="dc-label" id="dm-q${i}">${esc(q.label)}<span>*</span></span><div class="dc-input${q.area ? " dc-input--area" : ""}" id="dm-a${i}" role="textbox" aria-readonly="true" aria-labelledby="dm-q${i}"></div>`
      ).join("");
    }
    function openForm() {
      go(async (t) => {
        setStep(2);
        buildForm();
        submitBtn.disabled = true;
        submitBtn.classList.remove("is-hint");
        await demo.sleep(200, t);
        demo.openModal(formModal);
        const card = formModal.querySelector(".dc-modal__card");
        for (let i = 0; i < QUESTIONS.length; i++) {
          const field = $("#dm-a" + i);
          card.scrollTo({ top: Math.max(0, field.offsetTop - 120), behavior: "auto" });
          await demo.typeInto(field, QUESTIONS[i].answer, t, 70);
          await demo.sleep(120, t);
        }
        card.scrollTo({ top: card.scrollHeight, behavior: "auto" });
        submitBtn.disabled = false;
        submitBtn.classList.add("is-hint");
        submitBtn.focus({ preventScroll: true });
      });
    }
    function cancelForm() {
      cancelPending();
      demo.closeModal(formModal);
      const btn = $("#dm-select-btn");
      const sel = $("#dm-select");
      if (btn) {
        btn.textContent = SELECT_PLACEHOLDER;
        btn.classList.remove("is-chosen");
        btn.focus({ preventScroll: true });
      }
      if (sel) sel.classList.add("is-hint");
      setStep(1);
    }

    /* ---- Шаг 3: канал тикета ---- */
    function ticketHTML() {
      const answers = QUESTIONS.map((q) => `<div class="dc-box__text"><b class="q">${esc(q.label)}</b><div class="dc-quote">${esc(q.answer)}</div></div>`).join("");
      const box = `<div class="dc-box" id="tk-box" style="--embed:#FF6B35">
        <div class="dc-box__text"><div class="dc-h2">📝 Анкета на вступление</div></div>
        <div class="dc-box__text">Кандидат: ${mention("@" + CAND.name)} (<code>${CAND.name}</code>)<br>Аккаунт Discord создан: 14 марта 2023 г.<br>Заявка подана: сегодня в 12:03</div>
        <hr class="dc-sep">
        ${answers}
        <div class="dc-box__text" id="tk-steam">🎮 Проверяю часы в Steam…</div>
        <hr class="dc-sep">
        <div class="dc-box__text" id="tk-status">Статус: 🟡 На рассмотрении</div>
        <div class="dc-box__text dc-votes" id="tk-votes" hidden></div>
        <div class="dc-row" id="tk-actions">
          <button type="button" class="dc-btn dc-btn--primary" data-dc-action="call">📞 Вызвать на обзвон</button>
          <button type="button" class="dc-btn dc-btn--success is-hint" data-dc-action="accept">✅ Принять</button>
          <button type="button" class="dc-btn dc-btn--danger" data-dc-action="deny">❌ Отказать</button>
          <button type="button" class="dc-btn" data-dc-action="close">🔒 Закрыть</button>
        </div>
        <div class="dc-row" id="tk-vote-row">
          <button type="button" class="dc-btn" data-dc-action="voteup" id="tk-up">👍 За (0)</button>
          <button type="button" class="dc-btn" data-dc-action="votedown" id="tk-down">👎 Против (0)</button>
        </div>
      </div>`;
      return botMsg(`<div class="dc-msg__text">${mention("@" + CAND.name)} ${mention("@Рекруты")}</div>${box}`);
    }

    function submitForm() {
      cancelPending();
      const t0 = demo.token;
      demo.closeModal(formModal);
      go(async (t) => {
        t = t0;
        setStep(3, "Заявка отправлена. Сейчас бот создаст для неё отдельный канал, его видят вы и рекрутеры.");
        demo.log.innerHTML = "";
        await demo.typing(BOT.name, 700, t);
        demo.push(
          botMsg(
            `<div class="dc-msg__text">✅ Заявка отправлена! Ваш тикет: ${mention("#заявка-" + CAND.name)}<br>Уведомление о приглашении на обзвон придёт в личные сообщения. Если ЛС закрыты — в этот тикет.</div>${DcDemo.ephemeral()}`
          )
        );
        await demo.sleep(2800, t);
        demo.log.innerHTML = "";
        setChannel("заявка-" + CAND.name, "Заявка в " + CLAN + ": " + CAND.name);
        await demo.typing(BOT.name, 900, t);
        demo.push(ticketHTML());
        setStep(3);
        votes.up = votes.down = false;
        await demo.sleep(1700, t);
        const steam = $("#tk-steam");
        if (steam) steam.innerHTML = `<div class="dc-h3">🎮 Steam</div>✅ <b>night_owl_demo</b> — <b>5 214 ч</b> в Rust · за 2 недели: 31,5 ч`;
        demo.scroll();
        sideHint("Бот проверил часы в Steam: 5 214 ч, нужно от 4 000.");
      });
    }

    /* ---- Кнопки рекрутера ---- */
    const votes = { up: false, down: false };
    function renderVotes() {
      const up = $("#tk-up"), down = $("#tk-down"), line = $("#tk-votes");
      if (!up) return;
      up.textContent = `👍 За (${votes.up ? 1 : 0})`;
      down.textContent = `👎 Против (${votes.down ? 1 : 0})`;
      if (votes.up || votes.down) {
        line.hidden = false;
        line.textContent = `🗳 Голоса рекрутеров: 👍 ${votes.up ? "1 — " + REC.name : 0} · 👎 ${votes.down ? "1 — " + REC.name : 0}`;
      } else line.hidden = true;
    }
    function lockTicket(statusText, extra) {
      const box = $("#tk-box");
      if (!box) return;
      box.querySelectorAll(".dc-btn").forEach((b) => {
        b.classList.remove("is-hint");
        if (b.dataset.dcAction !== "close") b.disabled = true;
      });
      $("#tk-status").innerHTML = statusText + (extra || "");
    }
    function vote(kind) {
      if (!$("#tk-box") || $("#tk-up").disabled) return;
      const other = kind === "up" ? "down" : "up";
      votes[kind] = !votes[kind];
      if (votes[kind]) votes[other] = false;
      renderVotes();
    }
    function call(btn) {
      go(async (t) => {
        btn.disabled = true;
        $("#tk-status").textContent = `Статус: 📞 Вызван на обзвон (${REC.name})`;
        await demo.typing(BOT.name, 600, t);
        demo.push(botMsg(`<div class="dc-msg__text">📞 ${mention("@" + REC.name)} пригласил(а) ${mention("@" + CAND.name)} на обзвон. Уведомление отправлено в личные сообщения.</div>`));
        sideHint("Кандидату ушло приглашение на обзвон.");
      });
    }
    function accept() {
      go(async (t) => {
        setStep(4);
        lockTicket(`Статус: ✅ Принят (${esc(REC.name)})`);
        await demo.typing(BOT.name, 800, t);
        demo.push(
          botMsg(
            `<div class="dc-msg__text">${emoji("status-green")} ${mention("@" + REC.name)} принял(а) ${mention("@" + CAND.name)} в клан. Выдана роль ${mention("@Принятые")}. Уведомление: в личные сообщения.</div>`
          )
        );
        await demo.sleep(900, t);
        demo.push(
          botMsg(`<div class="dc-dm-label">Так это увидит кандидат в личных сообщениях</div><div class="dc-msg__text">🎉 Поздравляем! Ваша заявка в клан <b>${CLAN}</b> одобрена.</div>`, { cls: "" })
        );
      });
    }
    function openDeny() {
      go(async (t) => {
        reasonEl.textContent = "";
        denySubmit.disabled = true;
        denySubmit.classList.remove("is-hint");
        $("#tk-box .dc-btn.is-hint")?.classList.remove("is-hint");
        demo.openModal(denyModal);
        await demo.sleep(250, t);
        await demo.typeInto(reasonEl, DENY_REASON, t, 60);
        denySubmit.disabled = false;
        denySubmit.classList.add("is-hint");
        denySubmit.focus({ preventScroll: true });
      });
    }
    function cancelDeny() {
      cancelPending();
      demo.closeModal(denyModal);
      const acc = $('#tk-box [data-dc-action="accept"]');
      if (acc && !acc.disabled) acc.classList.add("is-hint");
    }
    function submitDeny() {
      cancelPending();
      demo.closeModal(denyModal);
      go(async (t) => {
        setStep(4, "Готово: бот отказал вежливо и показал причину. Нажмите «Сначала», чтобы вернуться к началу.");
        lockTicket(`Статус: ❌ Отказано (${esc(REC.name)})`, `<br>Причина отказа:<div class="dc-quote">${esc(DENY_REASON)}</div>`);
        await demo.typing(BOT.name, 800, t);
        demo.push(
          botMsg(
            `<div class="dc-msg__text">${emoji("status-red")} ${mention("@" + REC.name)} отклонил(а) заявку ${mention("@" + CAND.name)}. Повторно подать можно через 7 дней. Уведомление: в личные сообщения.<br>Причина: ${esc(DENY_REASON)}</div>`
          )
        );
        await demo.sleep(900, t);
        demo.push(
          botMsg(
            `<div class="dc-dm-label">Так это увидит кандидат в личных сообщениях</div><div class="dc-msg__text">К сожалению, ваша заявка в клан <b>${CLAN}</b> отклонена. Подать заявку повторно можно через 7 дней.<br>Причина: ${esc(DENY_REASON)}</div>`
          )
        );
      });
    }

    /* ---- Подключаем кнопки ---- */
    demo
      .on("toggle", (btn) => {
        const sel = btn.closest(".dc-select");
        DcDemo.toggleSelect(sel);
      })
      .on("pick", (el) => {
        const sel = el.closest(".dc-select");
        DcDemo.toggleSelect(sel, false);
        if (el.dataset.type !== "clan") {
          const o = OPTIONS.find((x) => x.type === el.dataset.type);
          elHint.textContent = `«${o.label}»: в настоящем боте откроется своя анкета. В демо выберите «Подать заявку в клан».`;
          return;
        }
        const btn = $("#dm-select-btn");
        btn.textContent = OPTIONS[0].label;
        btn.classList.add("is-chosen");
        sel.classList.remove("is-hint");
        openForm();
      })
      .on("form-cancel", cancelForm)
      .on("form-submit", submitForm)
      .on("call", call)
      .on("accept", accept)
      .on("deny", openDeny)
      .on("deny-cancel", cancelDeny)
      .on("deny-submit", submitDeny)
      .on("voteup", () => vote("up"))
      .on("votedown", () => vote("down"))
      .on("close", () => sideHint("В настоящем боте «Закрыть» прячет канал от кандидата. Для демо это не нужно."))
      .on("replay", () => {
        cancelPending();
        start();
      });

    root.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!formModal.hidden) cancelForm();
      else if (!denyModal.hidden) cancelDeny();
    });

    start();
  }

  /* =========================================================
     Темы оформления
     ========================================================= */
  function initThemes() {
    const buttons = [...document.querySelectorAll(".theme-btn")];
    const box = $("#th-box");
    if (!buttons.length || !box) return;
    const banner = $("#th-banner");
    const source = $("#th-source");
    const fire = $("#th-fire");
    const rings = [...document.querySelectorAll(".th-ring")];
    const nameEl = $("#th-name");
    const THEMES = {
      sunset: { label: "Закат", color: "#FF6B35" },
      blood: { label: "Кровь", color: "#E3242B" },
      ice: { label: "Лёд", color: "#4AB3FF" },
      toxic: { label: "Токсик", color: "#7DF029" },
      neon: { label: "Неон", color: "#C640FF" },
    };
    let current = "sunset";
    const bannerFiles = (key) => ({ anim: `${IMG}banners/${key}.webp`, still: `${IMG}banners/${key}-still.webp` });

    // Заранее подгружаем остальные темы, чтобы переключение не мигало
    let preloaded = false;
    function preload() {
      if (preloaded) return;
      preloaded = true;
      Object.keys(THEMES).forEach((k) => {
        [bannerFiles(k).anim, bannerFiles(k).still, `${IMG}emoji/fire-${k}.webp`, `${IMG}emoji/ring-${k}.webp`].forEach((src) => (new Image().src = src));
      });
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) {
          io.disconnect();
          preload();
        }
      });
      io.observe(box);
    }
    buttons.forEach((b) => b.addEventListener("pointerenter", preload, { once: true }));

    function apply(key) {
      const th = THEMES[key];
      current = key;
      const files = bannerFiles(key);
      const parts = [banner, fire, ...rings];
      parts.forEach((el) => el.classList.add("is-swapping"));
      setTimeout(() => {
        source.srcset = files.still;
        banner.src = files.anim;
        banner.alt = `Баннер темы «${th.label}»`;
        fire.src = `${IMG}emoji/fire-${key}.webp`;
        rings.forEach((r) => (r.src = `${IMG}emoji/ring-${key}.webp`));
        box.style.setProperty("--embed", th.color);
        parts.forEach((el) => el.classList.remove("is-swapping"));
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
      nameEl.textContent = th.label;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === key)));
    }
    buttons.forEach((b) => b.addEventListener("click", () => b.dataset.theme !== current && apply(b.dataset.theme)));
  }

  initDemo();
  initThemes();
})();
