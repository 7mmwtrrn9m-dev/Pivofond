
(() => {
  "use strict";

  const STORAGE_KEY = "pivofond_projects_v1";
  const money = value =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const $ = selector => document.querySelector(selector);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  const demoProjects = [
    {
      id: "demo-1",
      title: "На заслуженный вечер пятницы",
      description: "Неделя была непростой. Хочется немного выдохнуть, встретиться с друзьями и провести хороший вечер.",
      author: "Алексей",
      category: "Отдых",
      goal: 5000,
      raised: 2850,
      emoji: "🍻",
      createdAt: "2026-11-01"
    },
    {
      id: "demo-2",
      title: "Собираемся всей компанией",
      description: "Скидываемся на большой дружеский вечер. Чем больше нас, тем веселее!",
      author: "Дмитрий",
      category: "Компания",
      goal: 8000,
      raised: 4100,
      emoji: "🎉",
      createdAt: "2026-11-02"
    },
    {
      id: "demo-3",
      title: "Маленькая мечта",
      description: "Хочу устроить уютный вечер с хорошей музыкой и приятной компанией.",
      author: "Максим",
      category: "Мечта",
      goal: 3000,
      raised: 1200,
      emoji: "✨",
      createdAt: "2026-11-03"
    }
  ];

  function readProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw === null) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoProjects));
        return demoProjects.map(project => ({ ...project }));
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Ошибка чтения хранилища:", error);
      return demoProjects.map(project => ({ ...project }));
    }
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      showToast("Не удалось сохранить данные. Возможно, закончилось место.");
      return false;
    }
  }

  function getProgress(project) {
    const goal = Number(project.goal) || 1;
    return Math.min(100, Math.round((Number(project.raised || 0) / goal) * 100));
  }

  function projectCard(project) {
    const progress = getProgress(project);
    const image = project.image
      ? `<img src="${escapeHTML(project.image)}" alt="" loading="lazy">`
      : `<span>${escapeHTML(project.emoji || "🍺")}</span>`;

    return `
      <article class="project-card">
        <a class="project-card-link" href="project.html?id=${encodeURIComponent(project.id)}">
          <div class="project-cover">
            ${image}
            <span class="category-tag">${escapeHTML(project.category || "Другое")}</span>
          </div>
          <div class="project-info">
            <h3>${escapeHTML(project.title)}</h3>
            <p>${escapeHTML(project.description)}</p>
            <div class="project-progress">
              <span style="width:${progress}%"></span>
            </div>
            <div class="project-stats">
              <strong>${money(project.raised || 0)}</strong>
              <span>${progress}% из ${money(project.goal)}</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function renderProjects(target, projects) {
    if (!target) return;

    if (!projects.length) {
      target.innerHTML = `
        <div class="empty-state">
          <div style="font-size:36px;margin-bottom:12px">🍺</div>
          <strong>Пока здесь пусто</strong>
          <p>Попробуй создать первый сбор или изменить поиск.</p>
        </div>
      `;
      return;
    }

    target.innerHTML = projects.map(projectCard).join("");
  }

  function initHome() {
    const target = $("#featuredProjects");
    if (!target) return;

    const projects = readProjects()
      .sort((a, b) => Number(b.raised || 0) - Number(a.raised || 0))
      .slice(0, 3);

    renderProjects(target, projects);
  }

  function initCatalog() {
    const target = $("#projectsList");
    if (!target) return;

    const search = $("#projectSearch");
    const sort = $("#projectSort");

    function update() {
      const query = (search?.value || "").trim().toLowerCase();
      const mode = sort?.value || "new";

      let projects = readProjects().filter(project => {
        const text = [
          project.title,
          project.description,
          project.author,
          project.category
        ].join(" ").toLowerCase();

        return text.includes(query);
      });

      if (mode === "popular") {
        projects.sort((a, b) => Number(b.raised || 0) - Number(a.raised || 0));
      } else if (mode === "progress") {
        projects.sort((a, b) => getProgress(b) - getProgress(a));
      } else {
        projects.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      }

      renderProjects(target, projects);
    }

    search?.addEventListener("input", update);
    sort?.addEventListener("change", update);
    update();
  }

  function initCreate() {
    const form = $("#createForm");
    if (!form) return;

    const fileInput = $("#projectImage");
    const preview = $("#imagePreview");
    const errorBox = $("#formError");

    let imageData = "";

    function showError(message) {
      if (!errorBox) {
        showToast(message);
        return;
      }

      errorBox.textContent = message;
      errorBox.classList.add("visible");
    }

    function clearError() {
      errorBox?.classList.remove("visible");
    }

    fileInput?.addEventListener("change", async () => {
      clearError();
      imageData = "";

      const file = fileInput.files?.[0];
      if (!file) {
        if (preview) preview.style.display = "none";
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showError("Выбери изображение JPG, PNG или WEBP.");
        fileInput.value = "";
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showError("Изображение должно быть меньше 8 МБ.");
        fileInput.value = "";
        return;
      }

      try {
        imageData = await compressImage(file);

        if (preview) {
          preview.src = imageData;
          preview.style.display = "block";
        }
      } catch (error) {
        console.error(error);
        imageData = "";
        fileInput.value = "";
        showError("Не получилось обработать изображение. Попробуй другое.");
      }
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      clearError();

      const data = new FormData(form);
      const title = String(data.get("title") || "").trim();
      const description = String(data.get("description") || "").trim();
      const author = String(data.get("author") || "").trim();
      const category = String(data.get("category") || "Другое");
      const goal = Number(data.get("goal"));

      if (title.length < 3 || title.length > 70) {
        showError("Название должно содержать от 3 до 70 символов.");
        return;
      }

      if (description.length < 10 || description.length > 1200) {
        showError("Описание должно содержать от 10 до 1200 символов.");
        return;
      }

      if (!author || author.length > 40) {
        showError("Укажи имя автора (до 40 символов).");
        return;
      }

      if (!Number.isInteger(goal) || goal < 100 || goal > 1000000) {
        showError("Цель должна быть от 100 до 1 000 000 рублей.");
        return;
      }

      const projects = readProjects();

      const project = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        description,
        author,
        category,
        goal,
        raised: 0,
        emoji: category === "Отдых" ? "🍻" : category === "Компания" ? "🎉" : "✨",
        image: imageData,
        createdAt: new Date().toISOString()
      };

      projects.unshift(project);

      if (!saveProjects(projects)) return;

      showToast("Сбор создан!");

      window.location.href = `project.html?id=${encodeURIComponent(project.id)}`;
    });
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));

      reader.onload = () => {
        const img = new Image();

        img.onerror = () => reject(new Error("Не удалось открыть изображение"));

        img.onload = () => {
          const maxSide = 900;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas недоступен"));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.68));
        };

        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  function initProject() {
    const target = $("#project-detail");
    if (!target) return;

    const id = new URLSearchParams(window.location.search).get("id");
    const project = readProjects().find(item => item.id === id);

    if (!project) {
      target.innerHTML = `
        <div class="container empty-state">
          <h2>Сбор не найден</h2>
          <p>Возможно, ссылка неправильная или данные удалены из браузера.</p>
          <a class="btn btn-primary" href="projects.html">Ко всем сборам</a>
        </div>
      `;
      return;
    }

    const progress = getProgress(project);
    const cover = project.image
      ? `<img src="${escapeHTML(project.image)}" alt="">`
      : escapeHTML(project.emoji || "🍺");

    target.innerHTML = `
      <div class="container detail-layout">
        <div class="detail-main">
          <div class="detail-cover">${cover}</div>
          <div class="eyebrow" style="margin-top:24px">${escapeHTML(project.category || "Другое")}</div>
          <h1>${escapeHTML(project.title)}</h1>
          <p class="detail-description">${escapeHTML(project.description).replace(/\n/g, "<br>")}</p>
          <p class="detail-description">Автор сбора: <strong>${escapeHTML(project.author)}</strong></p>
          <button class="btn btn-outline" id="shareProject" type="button">Поделиться ссылкой ↗</button>
        </div>

        <aside class="detail-side">
          <div class="detail-box">
            <div class="eyebrow">УЖЕ СОБРАНО</div>
            <div class="detail-raised">${money(project.raised)}</div>
            <div class="detail-goal">из ${money(project.goal)}</div>
            <div class="project-progress"><span style="width:${progress}%"></span></div>
            <div class="detail-meta">
              <span>${progress}% собрано</span>
              <span>Цель: ${money(project.goal)}</span>
            </div>

            <form class="contribute-form" id="contributeForm">
              <label for="contribution">Сумма поддержки (₽)</label>
              <input class="field" id="contribution" name="amount" type="number" min="10" max="100000" step="1" placeholder="Например, 100" required>
              <button class="btn btn-primary" type="submit">Поддержать сбор</button>
            </form>

            <p class="disclaimer">Демонстрационный режим: кнопка меняет цифры только в этом браузере. Реального перевода денег не происходит.</p>
          </div>
        </aside>
      </div>
    `;

    $("#shareProject")?.addEventListener("click", async () => {
      const url = window.location.href;

      try {
        if (navigator.share) {
          await navigator.share({
            title: project.title,
            text: "Посмотри этот сбор на ПИВОФОНДе",
            url
          });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          showToast("Ссылка скопирована!");
        } else {
          showToast("Скопируй ссылку из адресной строки браузера.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          showToast("Не удалось поделиться ссылкой.");
        }
      }
    });

    $("#contributeForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const amount = Number($("#contribution")?.value);

      if (!Number.isInteger(amount) || amount < 10 || amount > 100000) {
        showToast("Введи сумму от 10 до 100 000 ₽.");
        return;
      }

      const projects = readProjects();
      const index = projects.findIndex(item => item.id === id);

      if (index === -1) {
        showToast("Сбор не найден.");
        return;
      }

      projects[index].raised = Number(projects[index].raised || 0) + amount;

      if (saveProjects(projects)) {
        showToast("Демонстрационная поддержка добавлена!");
        initProject();
      }
    });
  }

  function initMenu() {
    const button = $("#menuToggle");
    const nav = $("#navLinks");

    if (!button || !nav) return;

    button.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", String(isOpen));
      button.textContent = isOpen ? "×" : "☰";
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "☰";
      });
    });
  }

  function init() {
    initMenu();
    initHome();
    initCatalog();
    initCreate();
    initProject();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
