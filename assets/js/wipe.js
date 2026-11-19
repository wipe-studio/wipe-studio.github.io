/* =========================================================
   Скрипт страницы wipe/index.html
   1) Часы в шапке: сколько осталось до принудительного вайпа.
   2) Демо Wipe Announcer в окне Discord: четыре сцены.
   Тексты повторяют Board.cs и Commands.cs бота.
   Время вайпа считается по-настоящему (как в Schedule.cs),
   онлайн — для примера, сервер Orbit выдуманный.
   ========================================================= */
(function () {
  "use strict";

  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR, WEEK = 7 * DAY;

  /* ---------- Принудительный вайп: 1-й четверг месяца, 14:00 по Нью-Йорку ---------- */
  function nthSunday(y, m, n) {
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + 7 * (n - 1);
  }
  /** Летнее время в США: со 2-го воскресенья марта до 1-го воскресенья ноября. */
  function usDst(y, m, d) {
    const t = Date.UTC(y, m, d);
    return t >= Date.UTC(y, 2, nthSunday(y, 2, 2)) && t < Date.UTC(y, 10, nthSunday(y, 10, 1));
  }
  function forcedIn(y, m) {
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
    const d = 1 + ((4 - first + 7) % 7);
    return Date.UTC(y, m, d, usDst(y, m, d) ? 18 : 19);   // 14:00 EDT = 18:00 UTC, 14:00 EST = 19:00 UTC
  }
  function nextForced(now) {
    const n = new Date(now);
    let y = n.getUTCFullYear(), m = n.getUTCMonth();
    for (;;) {
      const f = forcedIn(y, m);
      if (f > now) return f;
      if (++m > 11) { m = 0; y++; }
    }
  }
  function prevForced(now) {
    const n = new Date(now);
    let y = n.getUTCFullYear(), m = n.getUTCMonth();
    for (;;) {
      const f = forcedIn(y, m);
      if (f <= now) return f;
      if (--m < 0) { m = 11; y--; }
    }
  }
  /** Выдуманный сервер Orbit: вайп каждую пятницу в 18:00 по Москве (15:00 UTC). */
  function nextFriday(now) {
    const n = new Date(now);
    let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 15);
    while (new Date(t).getUTCDay() !== 5 || t <= now) t += DAY;
    return t;
  }

  /* ---------- Форматирование (как в Board.cs и как Discord показывает <t:…>) ---------- */
  const fmtF = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtT = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const fmtD = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtWhen = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "always" });

  function countdown(ms) {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return "меньше минуты";
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + " д " + h + " ч";
    if (h > 0) return h + " ч " + m + " мин";
    return m + " мин";
  }
  function rel(at, now) {
    const s = Math.round((at - now) / 1000), a = Math.abs(s);
    if (a < 60) return rtf.format(s, "second");
    if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (a < 30 * 86400) return rtf.format(Math.round(s / 86400), "day");
    if (a < 365 * 86400) return rtf.format(Math.round(s / (30 * 86400)), "month");
    return rtf.format(Math.round(s / (365 * 86400)), "year");
  }
  const ts = (txt) => `<span class="wp-t">${txt}</span>`;
  const tF = (ms) => ts(fmtF.format(ms));
  const tT = (ms) => ts(fmtT.format(ms));
  const tR = (ms, now) => ts(rel(ms, now));
  /** Подпись «Сегодня в 17:56», как Discord пишет время сообщения. today — какой день считать сегодняшним. */
  function stamp(ms, today) {
    const a = new Date(ms), b = new Date(today);
    const same = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    return same ? "Сегодня в " + fmtT.format(ms) : fmtD.format(ms) + " " + fmtT.format(ms);
  }

  /* ---------- Часы в шапке ---------- */
  const clock = document.getElementById("wp-clock");
  if (clock) {
    const units = {};
    clock.querySelectorAll("[data-u]").forEach((el) => (units[el.dataset.u] = el));
    const when = document.getElementById("wp-clock-when");
    const pad = (v) => String(v).padStart(2, "0");
    let lastTarget = 0;
    const draw = () => {
      const now = Date.now();
      const target = nextForced(now);
      const sec = Math.max(0, Math.floor((target - now) / 1000));
      units.d.textContent = Math.floor(sec / 86400);
      units.h.textContent = pad(Math.floor((sec % 86400) / 3600));
      units.m.textContent = pad(Math.floor((sec % 3600) / 60));
      units.s.textContent = pad(sec % 60);
      if (target !== lastTarget && when) {
        lastTarget = target;
        const s = fmtWhen.format(target);
        when.textContent = s.charAt(0).toUpperCase() + s.slice(1) + " — по вашему времени";
        clock.setAttribute("aria-label", "До принудительного вайпа " + countdown(target - now) + ", " + s);
      }
    };
    draw();
    setInterval(draw, 1000);
  }

  /* ---------- Демо ---------- */
  const root = document.getElementById("wipe-demo");
  if (!root || !window.DcDemo) return;

  const demo = new DcDemo(root);
  const BOT = "../assets/img/avatars/wipe.webp";
  const USER = "../assets/img/avatars/user-2.svg";
  const NAME = "Wipe Announcer";
  const COLOR = "#A78BFA";    // цвет имени бота в окне (светлее, чтобы читалось на тёмном)
  const ACCENT = "#8B5CF6";   // полоса карточки (Board.Accent = 0x8B5CF6)
  const BOARD_CH = "⏳・ᴡɪᴘᴇs";
  const MENTION = `<span class="dc-mention">#${BOARD_CH}</span>`;
  const b = (t) => `<b>${t}</b>`;
  const code = (t) => `<code>${t}</code>`;
  const MONTHLY = "раз в месяц — принудительный вайп (1-й четверг) · бот понял сам";
  const WEEKLY = "каждую неделю, примерно пт в 18:00 (МСК) · бот понял сам";

  /** Серверы на табло в момент now. over — что поменять для сцены «Вайп идёт». */
  function servers(now, over = {}) {
    const fNext = nextForced(now), fPrev = prevForced(now);
    const oNext = nextFriday(now);
    const list = [
      { id: "atlas", name: "Atlas EU 2X Monthly", key: "2xmonthly.atlasrust.uk:28010", plan: MONTHLY,
        players: 644, max: 700, queue: 0, next: fNext, nextForced: true, born: fPrev + 2 * MIN },
      { id: "vital", name: "Vital Rust EU 2X Monthly", key: "eu-monthly.vitalrust.com:28014", plan: MONTHLY,
        players: 247, max: 275, queue: 0, next: fNext, nextForced: true, born: fPrev + 3 * MIN },
      { id: "orbit", name: "Orbit EU Weekly", key: "orbit.example:28015", plan: WEEKLY,
        players: 183, max: 200, queue: 12, next: oNext, nextForced: false, born: oNext - WEEK + 2 * MIN },
    ];
    list.forEach((s) => Object.assign(s, over[s.id] || {}));
    return list;
  }

  function serverText(s, now) {
    const lines = [];
    if (s.due) lines.push(`🔄 ${b("Вайп идёт")} — по плану был ${tT(s.due)}${s.nextForced ? " (принудительный)" : ""}, ждём, когда сервер поднимется`);
    else if (s.just) lines.push(`🟢 ${b("Вайп был " + tR(s.born, now))} — сервер свежий, заходите!`);
    if (s.next && !s.due)
      lines.push(`⏳ ${s.just ? "Следующий через " : "Вайп через "}${b(countdown(s.next - now))} · ≈ ${tF(s.next)}${s.nextForced ? " · принудительный" : ""}`);
    lines.push("🗓 " + s.plan);
    lines.push(`👥 ${s.players}/${s.max}${s.queue > 0 ? ` (+${s.queue} в очереди)` : ""}${s.born && !s.just ? " · прошлый вайп " + tR(s.born, now) : ""}`);
    lines.push(code("client.connect " + s.key));
    return lines.map((l) => `<span class="wp-line">${l}</span>`).join("");
  }

  /** Табло (Board.Render). today — для подписи «Сегодня в …». */
  function board(list, now, today = now, flash = "") {
    const rows = list.slice().sort((x, y) => (x.due ? x.due - 100 * WEEK : x.next) - (y.due ? y.due - 100 * WEEK : y.next));
    const head = [];
    const due = rows.find((r) => r.due);
    const next = rows.filter((r) => !r.due && r.next).sort((x, y) => x.next - y.next)[0];
    if (due) head.push(`🔄 Сейчас вайпается: ${b(due.name)}`);
    if (next) head.push(`Ближайший вайп — ${b(next.name)} через ${b(countdown(next.next - now))}`);
    const fields = rows
      .map((r, i) => `<div class="dc-field${r.id === flash ? " wp-flash" : ""}"><div class="dc-field__name">${i + 1}. ${r.name}</div><div class="dc-field__value">${serverText(r, now)}</div></div>`)
      .join("");
    return (
      `<div class="dc-embed" style="--embed:${ACCENT}">` +
      `<div class="dc-embed__title">⏳ Вайпы серверов Rust</div>` +
      `<div class="dc-embed__desc">${head.join("<br>")}</div>` +
      `<div class="dc-embed__fields dc-embed__fields--1">${fields}</div>` +
      `<div class="dc-embed__footer">Wipe Announcer · время показано в вашем часовом поясе · табло обновляется само • ${stamp(now, today)}</div></div>`
    );
  }

  /** Ответ на команду (Commands.Text): карточка только с текстом. */
  const answer = (html) => `<div class="dc-embed" style="--embed:${ACCENT}"><div class="dc-embed__desc">${html}</div></div>`;

  function botMsg(body, o = {}) {
    let html = DcDemo.msg({ avatar: BOT, name: NAME, color: COLOR, app: true, body, ...o });
    if (o.edited) html = html.replace("</time>", '</time><span class="wp-edited">(изменено)</span>');
    return html;
  }

  function setChannel(name, topic, input) {
    root.querySelector(".dc__channel").textContent = name;
    root.querySelector(".dc__topic").textContent = topic;
    root.querySelector(".dc__input").textContent = input;
  }
  const boardChannel = () => setChannel(BOARD_CH, "Табло вайпов Rust — обновляется само", "У вас нет прав писать в этом канале");
  const adminChannel = () => setChannel("админка", "Только для администрации", "Написать в #админка");

  /** Команда от админа: строка «Админ использует /…», затем бот «думает». */
  async function command(t, cmd) {
    await demo.sleep(500, t);
    await demo.typing(NAME, 1100, t);
    return DcDemo.reply({ avatar: USER, name: "Админ", command: cmd });
  }

  /** Живое обновление табло раз в 15 секунд, пока открыта сцена. */
  let liveTimer = 0;
  function stopLive() {
    clearInterval(liveTimer);
    liveTimer = 0;
  }

  const SCENES = [
    {
      // Табло: числа и отсчёт — по настоящему времени
      enter: boardChannel,
      async run(t) {
        const now = Date.now();
        const el = demo.push(botMsg(board(servers(now), now), { time: stamp(now - 3 * HOUR, now), edited: true }));
        liveTimer = setInterval(() => {
          if (!demo.alive(t)) return stopLive();
          const n = Date.now();
          const card = el.querySelector(".dc-embed");
          if (card) card.outerHTML = board(servers(n), n);
        }, 15000);
      },
    },
    {
      // /вайп создать
      enter: adminChannel,
      async run(t) {
        const reply = await command(t, "/вайп создать");
        const text =
          `✅ Создал категорию ${b("⏳ ᴡɪᴘᴇ")} и канал ${MENTION}: читать могут все, писать — только бот. Категория внизу списка — перетащите её выше, если нужно.<br><br>` +
          `✅ Табло стоит в ${MENTION} и будет обновляться само.<br><br>` +
          `На табло сразу поставил: ${b("Atlas EU 2X Monthly")}, ${b("Vital Rust EU 2X Monthly")}. Лишние уберите ${code("/вайп убрать")}.<br><br>` +
          `Свои серверы: ${code("/вайп добавить адрес:1.2.3.4:28015")}.`;
        demo.push(botMsg(answer(text) + DcDemo.ephemeral(), { reply, time: stamp(Date.now(), Date.now()) }));
      },
    },
    {
      // /вайп добавить
      enter: adminChannel,
      async run(t) {
        const reply = await command(t, "/вайп добавить адрес:orbit.example:28015");
        const now = Date.now();
        const s = servers(now).find((x) => x.id === "orbit");
        const text =
          `✅ Добавлен ${b(s.name)}<br>${code("client.connect " + s.key)}<br><br>` +
          `⏳ Следующий вайп: через ${b(countdown(s.next - now))} · ≈ ${tF(s.next)}<br>` +
          `🗓 ${s.plan}<br>` +
          `🧹 Прошлый вайп: ${tR(s.born, now)}<br><br>` +
          `Бот понял расписание сам по данным сервера. Если оно другое — ${code("/вайп расписание")}.<br><br>` +
          `Табло: ${MENTION}`;
        demo.push(botMsg(answer(text) + DcDemo.ephemeral(), { reply, time: stamp(now, now) }));
      },
    },
    {
      // Вайп идёт: представим, что сейчас ближайший принудительный вайп
      enter: boardChannel,
      async run(t) {
        const F = nextForced(Date.now());
        const after = nextForced(F + MIN);
        const old = { due: F, players: 41, born: prevForced(F - MIN) + 2 * MIN };
        let now = F + 3 * MIN;
        const el = demo.push(botMsg(board(servers(now, { atlas: old, vital: { ...old, players: 18 } }), now, now), { time: stamp(F - 6 * HOUR, now), edited: true }));
        const card = () => el.querySelector(".dc-embed");

        await demo.sleep(3200, t);
        now = F + 6 * MIN;
        const atlas = { just: true, born: F + 5 * MIN, next: after, players: 412, queue: 86 };
        card().outerHTML = board(servers(now, { atlas, vital: { ...old, players: 0 } }), now, now, "atlas");

        await demo.sleep(3200, t);
        now = F + 8 * MIN;
        const vital = { just: true, born: F + 7 * MIN, next: after, players: 201, queue: 19 };
        card().outerHTML = board(servers(now, { atlas, vital }), now, now, "vital");
      },
    },
  ];

  /* ---------- Переключатели сцен ---------- */
  const tabs = [...document.querySelectorAll(".wp-tab")];
  let current = 0;
  let started = false;

  function run(i) {
    started = true;
    current = i;
    stopLive();
    tabs.forEach((tab, k) => tab.setAttribute("aria-pressed", String(k === i)));
    SCENES[i].enter();
    demo.play(SCENES[i].run);
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => run(i)));
  demo.on("replay", () => run(current));
  demo.whenVisible(() => {
    if (!started) run(0);
  });
})();
