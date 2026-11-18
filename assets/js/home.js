/* =========================================================
   Wipe Studio — главная страница
   1) Живое окно Discord на первом экране: три сцены по кругу
      (Rust server analyser → Clan Ticket Bot → Clan Radar).
   2) Галерея оформления: переключатель тем баннера и эмодзи.
   Все ники, кланы и числа в демо выдуманы (кроме UERITY TEAM).
   ========================================================= */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IMG = "assets/img/";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* При «уменьшить движение» анимированные эмодзи показываем первым кадром.
     Стоп-кадров для эмодзи нет, поэтому рисуем кадр через canvas. */
  function freeze(img) {
    if (!reduce || !img || img.dataset.frozen) return;
    const draw = () => {
      if (img.dataset.frozen) return;
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        img.dataset.frozen = "1";
        img.src = c.toDataURL("image/png");
      } catch (e) {
        /* оставляем как есть */
      }
    };
    if (img.complete && img.naturalWidth) draw();
    else img.addEventListener("load", draw, { once: true });
  }
  document.querySelectorAll(".js-freeze").forEach(freeze);

  /* ================= 1. Демо на первом экране ================= */
  const root = document.getElementById("hero-dc");
  if (root && window.DcDemo) heroDemo(root);

  function heroDemo(root) {
    const DcDemo = window.DcDemo;
    const demo = new DcDemo(root);
    const log = root.querySelector(".dc__log");
    const input = root.querySelector(".dc__input");
    const channelEl = root.querySelector(".dc__channel");
    const topicEl = root.querySelector(".dc__topic");
    const pauseBtn = root.querySelector(".hero-pause");
    const switches = [...document.querySelectorAll(".hero-switch__btn")];

    const BOT = {
      analyser: { name: "Rust server analyser", color: "#E0583F", avatar: IMG + "avatars/analyser.webp" },
      ticket: { name: "Clan Ticket Bot", color: "#FF6B35", avatar: IMG + "avatars/ticket.webp" },
      radar: { name: "Clan Radar", color: "#2EE6C5", avatar: IMG + "avatars/radar.webp" },
    };
    const USER = [
      { name: "Ветер", avatar: IMG + "avatars/user-1.svg" },
      { name: "kasper", avatar: IMG + "avatars/user-2.svg" },
      { name: "Lynx", avatar: IMG + "avatars/user-3.svg" },
    ];
    const BANNER = IMG + (reduce ? "banners/sunset-still.webp" : "banners/sunset.webp");
    const EMOJI = {
      fire: IMG + "emoji/fire-sunset.webp",
      ring: IMG + "emoji/ring-sunset.webp",
      green: IMG + "emoji/status-green.webp",
    };
    const HOLD = 4600; // сколько держим готовую сцену перед следующей

    /* ---- пауза (кнопка в шапке окна) ---- */
    let paused = false;
    let resumers = [];
    function setPaused(p) {
      paused = p;
      pauseBtn.setAttribute("aria-pressed", String(p));
      pauseBtn.querySelector(".hero-pause__text").textContent = p ? "Дальше" : "Пауза";
      if (!p) {
        const r = resumers;
        resumers = [];
        r.forEach((fn) => fn());
      }
    }
    pauseBtn.addEventListener("click", () => setPaused(!paused));

    /* Пауза с учётом кнопки «Пауза»: после неё прогон мог смениться — тогда выходим */
    async function gate(t) {
      while (paused) await new Promise((r) => resumers.push(r));
      if (!demo.alive(t)) throw DcDemo.CANCEL;
    }
    async function wait(ms, t) {
      await demo.sleep(ms, t);
      await gate(t);
    }
    async function typing(name, ms, t) {
      await demo.typing(name, ms, t);
      await gate(t);
    }
    function push(html) {
      const node = demo.push(html);
      node.querySelectorAll("img[data-anim]").forEach(freeze);
      return node;
    }

    /* ---- шапка канала и поле ввода ---- */
    let placeholder = input.textContent;
    function setChannel(name, topic) {
      channelEl.textContent = name;
      topicEl.textContent = topic;
      placeholder = "Написать в #" + name;
      input.classList.remove("is-cmd", "is-typing");
      input.textContent = placeholder;
    }
    /* Игрок набирает команду в поле ввода */
    async function typeCommand(cmd, t) {
      input.classList.add("is-cmd");
      await demo.typeInto(input, cmd, t, 12);
      await wait(450, t);
      input.classList.remove("is-cmd");
      input.textContent = placeholder;
    }
    /* Плавно заполнить полоски (оценка, рост) после появления сообщения */
    function fillBars(node) {
      const bars = node.querySelectorAll("[data-v]");
      requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => b.style.setProperty("--v", b.dataset.v))));
    }
    function countUp(el, to) {
      if (reduce) return void (el.textContent = to);
      const start = performance.now();
      const dur = 900;
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const emoji = (src) => `<img class="dc-emoji" src="${src}" alt="" width="22" height="22" data-anim>`;

    /* ---------- Сцена 1: Rust server analyser ---------- */
    async function sceneAnalyser(t) {
      setChannel("админка", "Только для администрации");
      await wait(500, t);
      await typeCommand("/анализ", t);
      await typing(BOT.analyser.name, 1300, t);
      const node = push(
        DcDemo.msg({
          avatar: BOT.analyser.avatar,
          name: BOT.analyser.name,
          color: BOT.analyser.color,
          app: true,
          time: "Сегодня в 21:14",
          reply: DcDemo.reply({ avatar: USER[0].avatar, name: USER[0].name, command: "/анализ" }),
          body: `<div class="dc-embed" style="--embed:#E0583F">
              <div class="dc-embed__title">Анализ сервера «Северный форт»</div>
              <div class="hm-score"><span class="hm-score__num">0</span><span class="hm-score__of">/ 100</span><span class="hm-score__bar"><i data-v="74%"></i></span></div>
              <div class="hm-lines">
                <div>✅ Понятные правила и роли</div>
                <div>⚠️ Мало новых людей за неделю</div>
                <div>🛠 Совет: сделайте канал для заявок</div>
              </div>
            </div>${DcDemo.ephemeral()}`,
        })
      );
      countUp(node.querySelector(".hm-score__num"), 74);
      fillBars(node);
      await wait(HOLD, t);
    }

    /* ---------- Сцена 2: Clan Ticket Bot ---------- */
    async function sceneTicket(t) {
      setChannel("набор-в-клан", "UERITY TEAM");
      await wait(400, t);
      await typing(BOT.ticket.name, 900, t);
      const panel = push(
        DcDemo.msg({
          avatar: BOT.ticket.avatar,
          name: BOT.ticket.name,
          color: BOT.ticket.color,
          app: true,
          time: "Сегодня в 18:02",
          body: `<div class="dc-box" style="--embed:#FF6B35">
              <img class="dc-box__media" src="${BANNER}" width="720" height="240" alt="Анимированный баннер клана UERITY TEAM">
              <div class="dc-box__text">
                <div class="dc-h3 hm-title">${emoji(EMOJI.fire)}Заявка в UERITY TEAM</div>
                <div class="hm-req">${emoji(EMOJI.ring)}<b><i>от 16+ лет (без исключений)</i></b></div>
                <div class="hm-req">${emoji(EMOJI.ring)}<b><i>от 4000 часов (на одном аккаунте)</i></b></div>
              </div>
              <hr class="dc-sep">
              <div class="dc-box__text">Текущий статус: ${emoji(EMOJI.green)}Набор открыт</div>
              <div class="dc-select is-up">
                <div class="dc-select__btn">Выберите тип заявки...</div>
                <div class="dc-select__menu">
                  <div class="dc-option">Подать заявку в клан</div>
                  <div class="dc-option">Предложить сотрудничество</div>
                  <div class="dc-option">Вопрос к руководству</div>
                </div>
              </div>
            </div>`,
        })
      );
      await wait(1700, t);
      const sel = panel.querySelector(".dc-select");
      sel.classList.add("is-hint");
      await wait(1300, t);
      sel.classList.remove("is-hint");
      sel.classList.add("is-open");
      await wait(800, t);
      sel.querySelector(".dc-option").classList.add("is-active");
      await wait(800, t);
      sel.classList.remove("is-open");
      await typing(BOT.ticket.name, 700, t);
      push(
        DcDemo.msg({
          avatar: BOT.ticket.avatar,
          name: BOT.ticket.name,
          color: BOT.ticket.color,
          app: true,
          time: "Сегодня в 18:05",
          body: `<div class="dc-msg__text">✅ Заявка отправлена! Ваш тикет: <span class="dc-mention">#заявка-lynx</span></div>${DcDemo.ephemeral()}`,
        })
      );
      await wait(2200, t);

      // Переходим в канал-тикет: там рекруты видят новую заявку
      log.classList.add("is-out");
      await wait(260, t);
      log.innerHTML = "";
      log.classList.remove("is-out");
      setChannel("заявка-lynx", "Заявка от Lynx");
      await typing(BOT.ticket.name, 800, t);
      push(
        DcDemo.msg({
          avatar: BOT.ticket.avatar,
          name: BOT.ticket.name,
          color: BOT.ticket.color,
          app: true,
          time: "Сегодня в 18:05",
          body: `<div class="dc-msg__text"><span class="dc-mention">@Lynx</span> <span class="dc-mention">@Рекруты</span></div>
            <div class="dc-box" style="--embed:#FF6B35">
              <div class="dc-h2">📝 Анкета на вступление</div>
              <div class="dc-box__text">Кандидат: <span class="dc-mention">@Lynx</span></div>
              <hr class="dc-sep">
              <div class="dc-box__text"><b>Имя, Возраст, Кол-во часов, Онлайн в день</b><div class="dc-quote">Лёша, 18, 4300, 8 часов</div></div>
              <div class="dc-box__text"><div class="dc-h3">🎮 Часы Steam</div>✅ lynx — 4 312 ч в Rust</div>
              <hr class="dc-sep">
              <div class="dc-box__text">Статус: 🟡 На рассмотрении</div>
              <div class="dc-row">
                <span class="dc-btn dc-btn--primary">📞 Вызвать на обзвон</span>
                <span class="dc-btn dc-btn--success">✅ Принять</span>
                <span class="dc-btn dc-btn--danger">❌ Отказать</span>
              </div>
            </div>`,
        })
      );
      await wait(HOLD, t);
    }

    /* ---------- Сцена 3: Clan Radar ---------- */
    async function sceneRadar(t) {
      setChannel("радар", "Кланы-соперники");
      await wait(500, t);
      await typing(BOT.radar.name, 1000, t);
      push(
        DcDemo.msg({
          avatar: BOT.radar.avatar,
          name: BOT.radar.name,
          color: BOT.radar.color,
          app: true,
          time: "Сегодня в 12:01",
          body: `<div class="dc-embed" style="--embed:#2EE6C5">
              <div class="dc-embed__title">⚠️ Вас обогнал клан «Тихий берег»</div>
              <div class="dc-embed__desc"><b>Тихий берег</b> — 1 318 участников<br><b>Северный форт</b> (вы) — 1 302 участника</div>
              <div class="dc-embed__footer">Тревоги Clan Radar</div>
            </div>`,
        })
      );
      await wait(2300, t);
      await typeCommand("/рост", t);
      await typing(BOT.radar.name, 1000, t);
      const rows = [
        ["Тихий берег", 61, false],
        ["Северный форт", 38, true],
        ["Старый маяк", 12, false],
      ];
      const node = push(
        DcDemo.msg({
          avatar: BOT.radar.avatar,
          name: BOT.radar.name,
          color: BOT.radar.color,
          app: true,
          time: "Сегодня в 12:04",
          reply: DcDemo.reply({ avatar: USER[2].avatar, name: USER[2].name, command: "/рост" }),
          body: `<div class="dc-embed" style="--embed:#2EE6C5">
              <div class="dc-embed__title">Рост за 7 дней</div>
              <div class="hm-growth">${rows
                .map(
                  ([n, v, own]) =>
                    `<div class="hm-growth__row${own ? " is-own" : ""}"><span class="hm-growth__name">${esc(n)}</span><span class="hm-growth__bar"><i data-v="${Math.round((v / 61) * 100)}%"></i></span><span class="hm-growth__val">+${v}</span></div>`
                )
                .join("")}</div>
            </div>${DcDemo.ephemeral()}`,
        })
      );
      fillBars(node);
      await wait(HOLD, t);
    }

    const SCENES = [sceneAnalyser, sceneTicket, sceneRadar];

    /* ---- переключатели и круг сцен ---- */
    let switchTimer = 0;
    const mark = (i) => switches.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    function run(i) {
      mark(i);
      demo.play(async (t) => {
        await SCENES[i](t);
        if (reduce) return; // без движения: сцена стоит, переключаем кнопками
        // мягко гасим ленту и переходим к следующему боту
        log.classList.add("is-out");
        await wait(260, t);
        run((i + 1) % SCENES.length); // play() сразу очищает ленту
        log.classList.remove("is-out");
      });
    }
    switches.forEach((b, i) =>
      b.addEventListener("click", () => {
        if (paused) setPaused(false);
        clearTimeout(switchTimer);
        mark(i);
        if (log.children.length && !reduce) {
          log.classList.add("is-out");
          switchTimer = setTimeout(() => {
            run(i);
            log.classList.remove("is-out");
          }, 220);
        } else run(i);
      })
    );

    demo.whenVisible(() => {
      run(0);
      // Баннер для второй сцены подгружаем заранее — пока идёт первая сцена
      setTimeout(() => (new Image().src = BANNER), 1500);
    });
  }

  /* ================= 2. Галерея: темы оформления ================= */
  const themeBtns = [...document.querySelectorAll(".theme-chip")];
  if (themeBtns.length) {
    const THEMES = {
      sunset: { label: "Закат", color: "#FF6B35" },
      blood: { label: "Кровь", color: "#E3242B" },
      ice: { label: "Лёд", color: "#4AB3FF" },
      toxic: { label: "Токсик", color: "#7DF029" },
      neon: { label: "Неон", color: "#C640FF" },
    };
    const panel = document.getElementById("g-panel");
    const banner = document.getElementById("g-banner");
    const still = document.getElementById("g-banner-still");
    const fires = document.querySelectorAll('img[data-emoji="fire"]');
    const rings = document.querySelectorAll('img[data-emoji="ring"]');
    let current = "sunset";

    const swapImg = (img, src, alt, done) => {
      const pre = new Image();
      pre.onload = pre.onerror = () => {
        if (img.dataset.want !== src) return; // уже выбрали другую тему
        delete img.dataset.frozen;
        img.src = src;
        if (img.alt) img.alt = alt; // у декоративных копий alt пустой — так и оставляем
        if (done) done();
        if (img.classList.contains("js-freeze")) freeze(img);
      };
      img.dataset.want = src;
      pre.src = src;
    };

    function setTheme(key) {
      if (key === current || !THEMES[key]) return;
      current = key;
      const th = THEMES[key];
      themeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === key)));
      panel.style.setProperty("--stripe", th.color);

      const stillSrc = `${IMG}banners/${key}-still.webp`;
      const animSrc = `${IMG}banners/${key}.webp`;
      still.srcset = stillSrc;
      panel.classList.add("is-loading");
      swapImg(banner, reduce ? stillSrc : animSrc, `Анимированный баннер клана UERITY TEAM, тема «${th.label}»`, () => panel.classList.remove("is-loading"));
      fires.forEach((img) => swapImg(img, `${IMG}emoji/fire-${key}.webp`, `Иероглиф 火 «огонь», тема «${th.label}»`));
      rings.forEach((img) => swapImg(img, `${IMG}emoji/ring-${key}.webp`, `Кольцо-маркер, тема «${th.label}»`));
    }
    themeBtns.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  }
})();
