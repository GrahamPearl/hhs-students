/**
 * app.js — wires data-service, search, and render together.
 */
import { getAllStudents, collectSubjects, collectClasses } from "./data-service.js";
import { filterStudents, sortStudents } from "./search.js";
import { renderRows, renderResultCount, renderEmptyState, renderDrawer } from "./render.js";

const els = {
  form: document.getElementById("searchForm"),
  query: document.getElementById("query"),
  field: document.getElementById("field"),
  grade: document.getElementById("filterGrade"),
  class: document.getElementById("filterClass"),
  gender: document.getElementById("filterGender"),
  subject: document.getElementById("filterSubject"),
  resetBtn: document.getElementById("resetBtn"),
  tbody: document.getElementById("resultsBody"),
  resultCount: document.getElementById("resultCount"),
  loadingState: document.getElementById("loadingState"),
  tableWrap: document.getElementById("tableWrap"),
  drawer: document.getElementById("drawer"),
  drawerBody: document.getElementById("drawerBody"),
  drawerClose: document.getElementById("drawerClose"),
  scrim: document.getElementById("scrim"),
};

const COL_COUNT = 6;
let roster = [];

const state = () => ({
  term: els.query.value,
  field: els.field.value,
  grade: els.grade.value,
  class: els.class.value,
  gender: els.gender.value,
  subject: els.subject.value,
});

function runSearch() {
  const results = sortStudents(filterStudents(roster, state()));
  renderResultCount(els.resultCount, results.length, roster.length);
  if (results.length) {
    renderRows(els.tbody, results);
  } else {
    renderEmptyState(els.tbody, COL_COUNT);
  }
}

function populateSelect(select, values, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map((v) => `<option value="${v}">${v}</option>`).join("");
  if (values.includes(current)) select.value = current;
}

function refreshClassOptions() {
  populateSelect(els.class, collectClasses(roster, els.grade.value), "All classes");
}

function openDrawer(adminNo) {
  const student = roster.find((s) => String(s.adminNo) === String(adminNo));
  if (!student) return;
  els.drawerBody.innerHTML = renderDrawer(student);
  els.drawer.classList.add("is-open");
  els.scrim.classList.add("is-visible");
  document.body.classList.add("no-scroll");
}

function closeDrawer() {
  els.drawer.classList.remove("is-open");
  els.scrim.classList.remove("is-visible");
  document.body.classList.remove("no-scroll");
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function wireEvents() {
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch();
  });
  els.query.addEventListener("input", debounce(runSearch, 150));
  els.field.addEventListener("change", runSearch);
  els.gender.addEventListener("change", runSearch);
  els.subject.addEventListener("change", runSearch);
  els.grade.addEventListener("change", () => {
    refreshClassOptions();
    runSearch();
  });
  els.class.addEventListener("change", runSearch);

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    refreshClassOptions();
    runSearch();
  });

  els.tbody.addEventListener("click", (e) => {
    const row = e.target.closest(".roster-row");
    if (row) openDrawer(row.dataset.adminNo);
  });
  els.drawerClose.addEventListener("click", closeDrawer);
  els.scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

async function init() {
  wireEvents();
  try {
    roster = await getAllStudents();
  } catch (err) {
    els.loadingState.innerHTML = `
      <p class="error-text">Couldn't load the student roster.</p>
      <p class="empty-hint">${err.message}</p>`;
    return;
  }

  populateSelect(els.subject, collectSubjects(roster), "All subjects");
  refreshClassOptions();

  els.loadingState.remove();
  els.tableWrap.classList.remove("is-hidden");
  runSearch();
}

init();
