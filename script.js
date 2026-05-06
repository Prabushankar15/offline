const STORAGE_KEY = "offlineStudySnippets";

const categories = [
  "All",
  "Web Technology",
  "Maths"
];

const state = {
  snippets: [],
  activeId: null,
  category: "All",
  search: ""
};

const el = {
  categoryList: document.getElementById("categoryList"),
  snippetList: document.getElementById("snippetList"),
  snippetCount: document.getElementById("snippetCount"),
  titleInput: document.getElementById("titleInput"),
  categorySelect: document.getElementById("categorySelect"),
  codeInput: document.getElementById("codeInput"),
  notesInput: document.getElementById("notesInput"),
  lastSaved: document.getElementById("lastSaved"),
  searchInput: document.getElementById("searchInput"),
  editorPanel: document.getElementById("editorPanel"),
  emptyState: document.getElementById("emptyState"),
  quickCards: document.getElementById("quickCards"),
  btnAdd: document.getElementById("btnAdd"),
  btnDelete: document.getElementById("btnDelete"),
  btnCopy: document.getElementById("btnCopy"),
  btnToggleFav: document.getElementById("btnToggleFav"),
  btnExport: document.getElementById("btnExport"),
  importInput: document.getElementById("importInput"),
  btnShuffle: document.getElementById("btnShuffle")
};

let autosaveTimer = null;

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.snippets));
  const active = getActive();
  if (active) {
    el.lastSaved.textContent = `Saved ${formatTime(active.updatedAt)}`;
  }
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.snippets = [];
    return;
  }
  try {
    state.snippets = JSON.parse(raw) || [];
  } catch (err) {
    state.snippets = [];
  }
}

function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleString();
}

function getActive() {
  return state.snippets.find((item) => item.id === state.activeId);
}

function createSnippet() {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled Snippet",
    category: "Custom Notes",
    code: "",
    notes: "",
    favorite: false,
    createdAt: now,
    updatedAt: now
  };
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveToStorage();
    renderList();
    renderQuickCards();
  }, 400);
}

function setActive(id) {
  state.activeId = id;
  const snippet = getActive();
  if (!snippet) {
    el.editorPanel.classList.remove("active");
    el.emptyState.classList.add("active");
    return;
  }

  el.editorPanel.classList.add("active");
  el.emptyState.classList.remove("active");
  el.titleInput.value = snippet.title;
  el.categorySelect.value = snippet.category;
  el.codeInput.value = snippet.code;
  el.notesInput.value = snippet.notes;
  el.lastSaved.textContent = `Saved ${formatTime(snippet.updatedAt)}`;
  el.btnToggleFav.textContent = snippet.favorite ? "Unfavorite" : "Favorite";
  renderList();
}

function updateActive(fields) {
  const snippet = getActive();
  if (!snippet) return;
  Object.assign(snippet, fields, { updatedAt: Date.now() });
  scheduleAutosave();
}

function deleteActive() {
  if (!state.activeId) return;
  const idx = state.snippets.findIndex((s) => s.id === state.activeId);
  if (idx >= 0) {
    state.snippets.splice(idx, 1);
  }
  state.activeId = null;
  saveToStorage();
  renderAll();
}

function renderCategories() {
  el.categoryList.innerHTML = "";
  categories.forEach((cat) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.className = cat === state.category ? "active" : "";
    btn.addEventListener("click", () => {
      state.category = cat;
      renderAll();
    });
    li.appendChild(btn);
    el.categoryList.appendChild(li);
  });

  el.categorySelect.innerHTML = "";
  categories.filter((c) => c !== "All").forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    el.categorySelect.appendChild(option);
  });
}

function filterSnippets() {
  return state.snippets.filter((snippet) => {
    const matchesCategory = state.category === "All" || snippet.category === state.category;
    const query = state.search.toLowerCase();
    const haystack = `${snippet.title} ${snippet.code} ${snippet.notes}`.toLowerCase();
    return matchesCategory && haystack.includes(query);
  });
}

function renderList() {
  const items = filterSnippets().sort((a, b) => b.updatedAt - a.updatedAt);
  el.snippetList.innerHTML = "";
  el.snippetCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  items.forEach((snippet) => {
    const card = document.createElement("div");
    card.className = `snippet-card ${snippet.id === state.activeId ? "active" : ""}`;

    const title = document.createElement("h3");
    title.textContent = snippet.title;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${snippet.category} • ${formatTime(snippet.updatedAt)}${snippet.favorite ? " • Favorite" : ""}`;

    const actions = document.createElement("div");
    actions.className = "snippet-actions";

    const editBtn = createMiniButton("Edit", () => setActive(snippet.id));
    const copyBtn = createMiniButton("Copy", () => copyCode(snippet.code));
    const favBtn = createMiniButton(snippet.favorite ? "Unfav" : "Fav", () => {
      snippet.favorite = !snippet.favorite;
      updateActive({ favorite: snippet.favorite });
      renderAll();
    });
    const delBtn = createMiniButton("Del", () => {
      if (confirm("Delete this snippet?")) {
        state.activeId = snippet.id;
        deleteActive();
      }
    });

    actions.append(editBtn, copyBtn, favBtn, delBtn);

    card.append(title, meta, actions);
    card.addEventListener("click", () => setActive(snippet.id));
    el.snippetList.appendChild(card);
  });
}

function createMiniButton(label, handler) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return btn;
}

function renderQuickCards() {
  const cards = [...state.snippets]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
  el.quickCards.innerHTML = "";
  cards.forEach((snippet) => {
    const card = document.createElement("div");
    card.className = "quick-card";
    card.innerHTML = `<strong>${snippet.title}</strong><span>${snippet.category}</span>`;
    card.addEventListener("click", () => setActive(snippet.id));
    el.quickCards.appendChild(card);
  });
}

function shuffleQuickCards() {
  const shuffled = [...state.snippets].sort(() => Math.random() - 0.5).slice(0, 4);
  el.quickCards.innerHTML = "";
  shuffled.forEach((snippet) => {
    const card = document.createElement("div");
    card.className = "quick-card";
    card.innerHTML = `<strong>${snippet.title}</strong><span>${snippet.category}</span>`;
    card.addEventListener("click", () => setActive(snippet.id));
    el.quickCards.appendChild(card);
  });
}

function renderAll() {
  renderCategories();
  renderList();
  renderQuickCards();
  const active = getActive();
  if (!active) {
    el.editorPanel.classList.remove("active");
    el.emptyState.classList.add("active");
  }
}

function handleAdd() {
  const snippet = createSnippet();
  state.snippets.unshift(snippet);
  state.activeId = snippet.id;
  saveToStorage();
  renderAll();
  setActive(snippet.id);
}

function copyCode(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  });
}

function handleExport() {
  const data = JSON.stringify(state.snippets, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "study-vault-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("Invalid format");
      state.snippets = parsed;
      state.activeId = state.snippets[0]?.id || null;
      saveToStorage();
      renderAll();
      if (state.activeId) setActive(state.activeId);
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function initEvents() {
  el.btnAdd.addEventListener("click", handleAdd);
  el.btnDelete.addEventListener("click", () => {
    if (state.activeId && confirm("Delete this snippet?")) {
      deleteActive();
    }
  });
  el.btnCopy.addEventListener("click", () => {
    const snippet = getActive();
    if (snippet) copyCode(snippet.code);
  });
  el.btnToggleFav.addEventListener("click", () => {
    const snippet = getActive();
    if (!snippet) return;
    snippet.favorite = !snippet.favorite;
    updateActive({ favorite: snippet.favorite });
    el.btnToggleFav.textContent = snippet.favorite ? "Unfavorite" : "Favorite";
    renderAll();
  });

  el.titleInput.addEventListener("input", (e) => updateActive({ title: e.target.value }));
  el.categorySelect.addEventListener("change", (e) => updateActive({ category: e.target.value }));
  el.codeInput.addEventListener("input", (e) => updateActive({ code: e.target.value }));
  el.notesInput.addEventListener("input", (e) => updateActive({ notes: e.target.value }));

  el.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    renderList();
  });

  el.btnExport.addEventListener("click", handleExport);
  el.importInput.addEventListener("change", handleImport);
  el.btnShuffle.addEventListener("click", shuffleQuickCards);

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveToStorage();
      renderList();
      renderQuickCards();
    }
    if (event.ctrlKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.searchInput.focus();
    }
  });
}

function bootstrap() {
  loadFromStorage();
  renderAll();
  if (state.snippets.length > 0) {
    state.activeId = state.snippets[0].id;
    setActive(state.activeId);
  }
  initEvents();
}

bootstrap();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}
