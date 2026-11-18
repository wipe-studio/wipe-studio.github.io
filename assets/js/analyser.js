/* Скрипт страницы analyser/index.html — демо команды /анализ в окне Discord.
   Все данные в демо выдуманные. */
(function () {
  "use strict";

  const root = document.getElementById("an-demo");
  if (!root || !window.DcDemo) return;

  const demo = new DcDemo(root);
  const IMG = "../assets/img/avatars/";
  const SCORE = 47;

  const stats = [
    ["Участников", "842"],
    ["В сети сейчас", "118 (14%)"],
    ["Возраст сервера", "1 год 3 мес"],
    ["Новые за 30 дней", "+64"],
    ["Пишут за неделю", "97 чел."],
    ["Живые каналы", "6 из 14"],
  ];
  const pluses = [
    "Есть каналы с правилами и приветствием.",
    "Ссылка-приглашение бессрочная.",
    "На иконке виден тег клана.",
  ];
  const minuses = [
    "Живы только 6 каналов из 14.",
    "Не включён режим «Сообщество»: нет экрана правил.",
    "Нет описания сервера.",
  ];
  const tips = [
    "Включите режим «Сообщество» и настройте вопросы для новичков.",
    "Добавьте описание сервера в 1–2 строки: кто вы и чем сильны.",
    "Оживите сервер: розыгрыш раз в 2–4 недели, итоги вайпа, мемы и клипы.",
  ];

  const li = (arr) => arr.map((t) => `<li>${DcDemo.esc(t)}</li>`).join("");
  const hid = "an-hide";

  function message() {
    const lines = stats
      .map(([k, v]) => `<div class="${hid}" data-an="stat"><b>${k}:</b> ${v}</div>`)
      .join("");
    const body = `
      <div class="dc-embed" style="--embed:#e05a4f">
        <div class="dc-embed__title">Анализ сервера: NORTH | Community</div>
        <div class="dc-embed__desc">
          <div class="an-score">Оценка: <b class="an-n">0</b> <b>из 100</b><span class="${hid}" data-an="grade"> — Слабо</span></div>
          <div class="an-bar" role="presentation"><i></i></div>
          <div class="an-stats">${lines}</div>
          <div class="an-rank ${hid}" data-an="rank"><b>Место в рейтинге кланов:</b> 31-е по числу участников</div>
        </div>
        <div class="dc-embed__fields dc-embed__fields--1">
          <div class="dc-field ${hid}" data-an="block"><div class="dc-field__name">✅ Плюсы (${pluses.length})</div><div class="dc-field__value"><ul class="dc-list">${li(pluses)}</ul></div></div>
          <div class="dc-field ${hid}" data-an="block"><div class="dc-field__name">⚠️ Минусы (${minuses.length})</div><div class="dc-field__value"><ul class="dc-list">${li(minuses)}</ul></div></div>
          <div class="dc-field ${hid}" data-an="block"><div class="dc-field__name">🛠 Что сделать в первую очередь</div><div class="dc-field__value"><ul class="dc-list">${li(tips)}</ul></div></div>
        </div>
        <div class="dc-embed__footer ${hid}" data-an="footer">Полный отчёт с таблицами — в файле ниже, откройте его в браузере.</div>
      </div>
      <div class="an-file ${hid}" data-an="file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>
        <span>analysis-report.html<small>Полный отчёт</small></span>
      </div>
      <div class="${hid}" data-an="eph">${DcDemo.ephemeral()}</div>`;
    return DcDemo.msg({
      avatar: IMG + "analyser.webp",
      name: "Rust server analyser",
      color: "#E0583F",
      app: true,
      time: "Сегодня в 18:42",
      reply: DcDemo.reply({ avatar: IMG + "user-1.svg", name: "Игрок", command: "/анализ" }),
      body,
    });
  }

  function show(el, t) {
    el.classList.remove(hid);
    if (!demo.reduced) el.classList.add("dc-in");
    demo.scroll();
  }

  async function run() {
    await demo.play(async (t) => {
      await demo.sleep(500, t);
      await demo.typing("Rust server analyser", 1500, t);
      const msg = demo.push(message());
      const num = msg.querySelector(".an-n");
      const bar = msg.querySelector(".an-bar i");
      await demo.sleep(500, t);

      // Оценка «набегает» от 0 до числа
      if (demo.reduced) {
        num.textContent = SCORE;
        bar.style.width = SCORE + "%";
      } else {
        for (let n = 0; n < SCORE; n += 3) {
          num.textContent = n;
          bar.style.width = n + "%";
          await demo.sleep(38, t);
        }
        num.textContent = SCORE;
        bar.style.width = SCORE + "%";
      }
      show(msg.querySelector('[data-an="grade"]'), t);
      await demo.sleep(350, t);

      // Статистика по строчкам
      for (const el of msg.querySelectorAll('[data-an="stat"]')) {
        show(el, t);
        await demo.sleep(170, t);
      }
      show(msg.querySelector('[data-an="rank"]'), t);
      await demo.sleep(450, t);

      // Плюсы, минусы, советы
      for (const el of msg.querySelectorAll('[data-an="block"]')) {
        show(el, t);
        await demo.sleep(650, t);
      }
      show(msg.querySelector('[data-an="footer"]'), t);
      await demo.sleep(200, t);
      show(msg.querySelector('[data-an="file"]'), t);
      await demo.sleep(200, t);
      show(msg.querySelector('[data-an="eph"]'), t);
    });
  }

  demo.on("replay", run);
  demo.whenVisible(run);
})();
