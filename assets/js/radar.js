/* =========================================================
   Скрипт страницы radar/index.html
   Демо Clan Radar в окне Discord: четыре сцены.
   Тексты ответов повторяют Report.cs и Extras.cs бота.
   Названия кланов и все числа выдуманные.
   ========================================================= */
(function () {
  "use strict";

  const root = document.getElementById("radar-demo");
  if (!root || !window.DcDemo) return;

  const demo = new DcDemo(root);
  const BOT = "../assets/img/avatars/radar.webp";
  const USER = "../assets/img/avatars/user-1.svg";
  const COLOR = "#2EE6C5";   // цвет имени бота и полосы embed (Report.Accent)
  const GOLD = "#F5C542";    // полоса рейтинга (Report.Gold)
  const RED = "#FF6B6B";     // полоса тревоги
  const FOOT = "Clan Radar · замер каждый час";

  /* ---------- Выдуманные данные: за неделю ---------- */
  const CLANS = [
    { id: "volt", name: "VOLT", mine: true, members: 3230, was: 3082, online: 520, onlineWas: 500, joins: [182, 34],
      pts: [0, 6, 14, 22, 35, 48, 60, 70, 85, 98, 110, 122, 132, 141, 148], color: "#55ACEE" },
    { id: "north", name: "NORTH", members: 4460, was: 4364, online: 380, onlineWas: 410,
      pts: [0, 4, 10, 16, 24, 30, 38, 46, 55, 62, 71, 80, 87, 92, 96], color: "#DD2E44" },
    { id: "kraken", name: "KRAKEN", members: 3690, was: 3478, online: 410, onlineWas: 390,
      pts: [0, 10, 22, 40, 52, 66, 80, 96, 120, 142, 160, 178, 192, 203, 212], color: "#F4900C" },
    { id: "orbit", name: "ORBIT", members: 2410, was: 2379, online: 150, onlineWas: 140,
      pts: [0, 2, 3, 6, 9, 10, 14, 16, 19, 21, 24, 26, 28, 30, 31], color: "#FDCB58" },
    { id: "ember", name: "EMBER", members: 1980, was: 1998, online: 90, onlineWas: 100,
      pts: [0, -1, -2, -4, -5, -4, -7, -9, -10, -12, -13, -15, -16, -17, -18], color: "#78B159" },
  ];
  CLANS.forEach((c) => (c.growth = c.members - c.was));

  /* ---------- Форматирование (как в Report.cs) ---------- */
  const NB = " ";
  const n = (v) => String(Math.abs(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + n(v);
  const pct = (p) => {
    const a = Math.abs(p);
    const s = a < 10 ? a.toFixed(1).replace(".", ",") : String(Math.round(a));
    return (p > 0 ? "+" : p < 0 ? "−" : "±") + s + "%";
  };
  const b = (t) => `<b>${t}</b>`;
  const title = (c) => (c.mine ? "⭐ " : "") + b(c.name);
  const medal = (i) => (i === 1 ? "🥇" : i === 2 ? "🥈" : i === 3 ? "🥉" : b(i + "."));
  const sq = (c) => `<span class="rd-sq" style="background:${c.color}" aria-hidden="true"></span>`;

  function embed({ color, title: t, desc, extra = "", time = "Сегодня в 12:00" }) {
    return (
      `<div class="dc-embed" style="--embed:${color}">` +
      `<div class="dc-embed__title">${t}</div>` +
      `<div class="dc-embed__desc">${desc}</div>${extra}` +
      `<div class="dc-embed__footer">${FOOT} • ${time}</div></div>`
    );
  }

  function botMsg(body, o = {}) {
    return DcDemo.msg({ avatar: BOT, name: "Clan Radar", color: COLOR, app: true, body, ...o });
  }
  const replyRow = (command) => DcDemo.reply({ avatar: USER, name: "Лидер", command });

  /* ---------- /рост ---------- */
  function growthDesc() {
    const rows = CLANS.slice().sort((a, c) => c.growth - a.growth);
    const mine = rows.findIndex((c) => c.mine) + 1;
    let head = `Сколько участников прибавилось у вас и у конкурентов за ${b("неделю")}.<br>`;
    head += `Вы на ${b(mine)} месте по росту из ${b(rows.length)}. Быстрее всех растёт ${title(rows[0])}.`;
    let html = `<div class="rd-head">${head}</div>`;
    rows.forEach((c, i) => {
      const p = (c.growth * 100) / c.was;
      const perDay = Math.round(c.growth / 7);
      let sub = `📈 ${b(sg(c.growth))} (${pct(p)}) · ≈ ${sg(perDay)} в день · 👥 ${n(c.members)} · 🟢 ${n(c.online)}`;
      if (c.joins) sub += `<br>🚪 пришло ${b(n(c.joins[0]))} · ушло ${b(n(c.joins[1]))}`;
      html += `<div class="rd-item"><div>${medal(i + 1)} ${title(c)}</div><div class="rd-sub">${sub}</div></div>`;
    });
    const legend = CLANS.map((c) => `${sq(c)}${c.mine ? "⭐ " : ""}${c.name}`).join(" · ");
    html += `<div class="rd-legend">📊 ${b("График прироста:")} ${legend}</div>`;
    return html;
  }

  /* Сглаженная линия через точки (Catmull-Rom → Безье) */
  function smooth(p) {
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  /** Тёмный график прироста в духе Chart.cs. Линии «рисуются» классом is-go. */
  function chartSvg() {
    const W = 520, H = 290, L = 58, R = 14, T = 12, B = 30;
    const yMin = -40, yMax = 240;
    const x = (i) => L + (i / 14) * (W - L - R);
    const y = (v) => T + ((yMax - v) / (yMax - yMin)) * (H - T - B);
    let g = `<rect width="${W}" height="${H}" fill="#2B2D31"/><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="#232428"/>`;
    [50, 100, 150, 200].forEach((v) => {
      g += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#3A3C43" stroke-width="1"/>`;
    });
    [[2, "12.11"], [6, "14.11"], [10, "16.11"], [14, "18.11"]].forEach(([i, t]) => {
      g += `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="#2E3035" stroke-width="1"/>`;
      g += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 14 ? "end" : "middle"}">${t}</text>`;
    });
    [0, 50, 100, 150, 200].forEach((v) => {
      g += `<text x="${L - 8}" y="${(y(v) + 5).toFixed(1)}" text-anchor="end">${v > 0 ? "+" : ""}${v}</text>`;
    });
    g += `<line x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="#6A6D77" stroke-width="1.5"/>`;
    // сначала соперники, свой клан сверху и толще
    const order = CLANS.filter((c) => !c.mine).concat(CLANS.filter((c) => c.mine));
    order.forEach((c, k) => {
      const pts = c.pts.map((v, i) => [x(i), y(v)]);
      const last = pts[pts.length - 1];
      g += `<path class="rd-line" pathLength="1" style="--i:${k}" d="${smooth(pts)}" stroke="${c.color}" stroke-width="${c.mine ? 4.5 : 2.8}"/>`;
      g += `<circle class="rd-dot" style="--i:${k}" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="${c.mine ? 5.5 : 4}" fill="${c.color}"/>`;
    });
    const label =
      "График прироста участников за неделю: " +
      CLANS.slice().sort((a, c) => c.growth - a.growth).map((c) => `${c.name} ${sg(c.growth)}`).join(", ") + ".";
    const pre = demo.reduced ? "" : " is-pre";
    return `<figure class="rd-chart${pre}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" focusable="false">${g}</svg></figure>`;
  }

  const growthEmbed = (time) => embed({ color: COLOR, title: "📈 Рост за неделю", desc: growthDesc(), extra: chartSvg(), time });

  /* ---------- /рейтинг ---------- */
  function ratingEmbed(by) {
    const key = (c, then) =>
      by === "members" ? (then ? c.was : c.members) : by === "online" ? (then ? c.onlineWas : c.online) : c.growth;
    const rank = (then) => CLANS.slice().sort((a, c) => key(c, then) - key(a, then) || c.members - a.members);
    const ranked = rank(false);
    const before = {};
    if (by !== "growth") rank(true).forEach((c, i) => (before[c.id] = i + 1));

    const what = by === "online" ? "людям в сети" : by === "growth" ? "росту за неделю" : "числу участников";
    let head = `Места пабликов по ${b(what)}`;
    if (by !== "growth") head += ", 📈 и стрелки — изменения за неделю";
    head += ".<br>";
    const place = ranked.findIndex((c) => c.mine) + 1;
    head += `Ваше место: ${b(place)} из ${b(ranked.length)}`;
    if (place > 1) {
      const ahead = ranked[place - 2];
      head += ` · до ${medal(place - 1)} ${title(ahead)} не хватает ${b(n(key(ahead, false) - key(ranked[place - 1], false)))}`;
    }

    let html = `<div class="rd-head">${head}</div>`;
    ranked.forEach((c, i) => {
      let arrow = "";
      if (by !== "growth") {
        const was = before[c.id];
        if (was > i + 1) arrow = ` 🔼${was - i - 1}`;
        else if (was < i + 1) arrow = ` 🔽${i + 1 - was}`;
      }
      const m = by === "members" ? b(n(c.members)) : n(c.members);
      const o = by === "online" ? b(n(c.online)) : n(c.online);
      const g = by === "growth" ? b(sg(c.growth)) : sg(c.growth);
      const sub = `👥 ${m} · 🟢 ${o} (${Math.round((c.online * 100) / c.members)}%) · 📈 ${g}`;
      html += `<div class="rd-item"><div>${medal(i + 1)} ${title(c)}${arrow}</div><div class="rd-sub">${sub}</div></div>`;
    });
    return embed({ color: GOLD, title: "🏆 Рейтинг пабликов", desc: html });
  }

  /* ---------- Тревога ---------- */
  function alertEmbed() {
    const lines = [
      `🚀 У ${b("KRAKEN")} ${b("+140")} за сутки (обычно ≈ +12 в день). Похоже на рекламу или розыгрыш — стоит заглянуть.`,
      `🕵️ ${b("ORBIT")} обогнал вас: у них ${b("2" + NB + "954")}, у вас ${b("2" + NB + "951")}.`,
      `⚠️ Ссылка на ${b("EMBER")} перестала работать — дайте новую: <code>/конкуренты добавить</code>.`,
    ];
    return embed({
      color: RED,
      title: "🚨 Радар заметил",
      desc: lines.map((l) => `<div class="rd-para">${l}</div>`).join(""),
      time: "Сегодня в 15:01",
    });
  }

  /* ---------- Помощники сцен ---------- */
  const setChannel = (name) => {
    root.querySelector(".dc__channel").textContent = name;
    root.querySelector(".dc__input").textContent = "Написать в #" + name;
  };

  /** Если сообщение выше окна — показать его начало. Возвращает true, если оно длинное. */
  function showTop(el) {
    const lr = demo.log.getBoundingClientRect(), er = el.getBoundingClientRect();
    const tall = er.height > lr.height - 16;
    if (tall) demo.log.scrollTop += er.top - lr.top - 8;
    return tall;
  }

  /** Показать сообщение с графиком: начало, пауза, прокрутка вниз, линии рисуются. */
  async function showWithChart(el, t) {
    const tall = showTop(el);
    const fig = el.querySelector(".rd-chart");
    if (tall) {
      await demo.sleep(1600, t);
      demo.scroll();
      await demo.sleep(700, t);
    }
    if (fig && fig.classList.contains("is-pre")) {
      fig.classList.remove("is-pre");
      fig.classList.add("is-go");
    }
  }

  async function userCommand(t, command, ms = 1100) {
    await demo.sleep(500, t);
    await demo.typing("Clan Radar", ms, t);
    return replyRow(command);
  }

  /* ---------- Сцены ---------- */
  const SCENES = [
    {
      channel: "радар",
      async run(t) {
        const reply = await userCommand(t, "/рост");
        const el = demo.push(botMsg(growthEmbed("Сегодня в 12:00") + DcDemo.ephemeral(), { reply }));
        await showWithChart(el, t);
      },
    },
    {
      channel: "радар",
      async run(t) {
        const steps = [["members", "/рейтинг"], ["online", "/рейтинг по:В сети"], ["growth", "/рейтинг по:Рост"]];
        for (let i = 0; i < steps.length; i++) {
          const reply = await userCommand(t, steps[i][1], i ? 800 : 1100);
          const el = demo.push(botMsg(ratingEmbed(steps[i][0]) + DcDemo.ephemeral(), { reply }));
          if (i < steps.length - 1) {
            showTop(el);
            await demo.sleep(2600, t);
          }
        }
      },
    },
    {
      channel: "недельный-отчёт",
      async run(t) {
        await demo.sleep(500, t);
        await demo.typing("Clan Radar", 1100, t);
        const text = `<div class="dc-msg__text">📡 ${b("Еженедельный отчёт Clan Radar")} — как выросли вы и конкуренты за неделю</div>`;
        const el = demo.push(botMsg(text + growthEmbed("Сегодня в 12:00")));
        await showWithChart(el, t);
        await demo.sleep(2400, t);
        await demo.typing("Clan Radar", 800, t);
        const second = demo.push(botMsg(ratingEmbed("members"), { cont: true }));
        showTop(second);
      },
    },
    {
      channel: "тревоги",
      async run(t) {
        await demo.sleep(500, t);
        await demo.typing("Clan Radar", 1100, t);
        demo.push(botMsg(alertEmbed(), { time: "Сегодня в 15:01" }));
      },
    },
  ];

  /* ---------- Переключатели ---------- */
  const tabs = [...document.querySelectorAll(".rd-tab")];
  let current = 0;
  let started = false;

  function run(i) {
    started = true;
    current = i;
    tabs.forEach((tab, k) => tab.setAttribute("aria-pressed", String(k === i)));
    setChannel(SCENES[i].channel);
    demo.play(SCENES[i].run);
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => run(i)));
  demo.on("replay", () => run(current));
  demo.whenVisible(() => {
    if (!started) run(0);
  });
})();
