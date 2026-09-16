/**
 * render.js
 * All DOM-building lives here, kept separate from data/search logic.
 */
const { IMAGE_BASE_URL, FALLBACK_IMAGE } = window.APP_CONFIG;

export function photoUrl(filename) {
  if (!filename) return FALLBACK_IMAGE;
  return IMAGE_BASE_URL + filename;
}

function initials(s) {
  return `${(s.firstName || "?")[0] || ""}${(s.lastName || "?")[0] || ""}`.toUpperCase();
}

function subjectBadges(subjects, max = 3) {
  if (!subjects || !subjects.length) {
    return `<span class="badge badge-muted">No subjects on file</span>`;
  }
  const shown = subjects.slice(0, max).map((s) => `<span class="badge">${s}</span>`).join("");
  const overflow = subjects.length > max
    ? `<span class="badge badge-muted">+${subjects.length - max} more</span>`
    : "";
  return shown + overflow;
}

export function renderRow(student) {
  const tr = document.createElement("tr");
  tr.className = "roster-row";
  tr.dataset.adminNo = student.adminNo;
  tr.innerHTML = `
    <td class="cell-photo">
      <div class="avatar">
        <img src="${photoUrl(student.photo)}" alt=""
             loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar-fallback',textContent:'${initials(student)}'}))" />
      </div>
    </td>
    <td class="cell-name">
      <span class="student-name">${student.firstName} ${student.lastName}</span>
      <span class="student-sub">${student.registrationClass || ""}</span>
    </td>
    <td class="cell-admin"><span class="mono">${student.adminNo}</span></td>
    <td class="cell-grade">
      <span class="pill pill-grade">Gr ${student.grade}</span>
      <span class="pill pill-class">${student.class}</span>
    </td>
    <td class="cell-gender">${student.gender || ""}</td>
    <td class="cell-subjects">${subjectBadges(student.subjectsSummary)}</td>
  `;
  return tr;
}

export function renderRows(tbody, students) {
  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();
  students.forEach((s) => frag.appendChild(renderRow(s)));
  tbody.appendChild(frag);
}

/** Compact card for grid layouts: photo, admin no, full name only. */
export function renderCard(student) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "student-card";
  card.dataset.adminNo = student.adminNo;
  card.innerHTML = `
    <div class="avatar avatar-card">
      <img src="${photoUrl(student.photo)}" alt=""
           loading="lazy"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar-fallback',textContent:'${initials(student)}'}))" />
    </div>
    <span class="card-name">${student.firstName} ${student.lastName}</span>
    <span class="card-admin mono">${student.adminNo}</span>
  `;
  return card;
}

export function renderCards(container, students) {
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  students.forEach((s) => frag.appendChild(renderCard(s)));
  container.appendChild(frag);
}

export function renderEmptyCards(container) {
  container.innerHTML = `
    <div class="empty-state empty-state-grid">
      <p>No students match those filters.</p>
      <p class="empty-hint">Try a different name, admin number, or clear a filter.</p>
    </div>`;
}

/** Renders removable chips for each active filter; returns nothing, just paints the DOM. */
export function renderActiveFilters(el, filters) {
  const labels = {
    grade: (v) => `Grade ${v}`,
    class: (v) => `Class ${v}`,
    gender: (v) => v,
    subject: (v) => v,
    teacher: (v) => `Taught by ${v}`,
  };
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(
      ([key, value]) => `
      <span class="chip chip-filter">
        ${labels[key] ? labels[key](value) : value}
        <button type="button" class="chip-remove" data-clear-filter="${key}" aria-label="Clear ${key} filter">&times;</button>
      </span>`,
    )
    .join("");
  el.innerHTML = chips;
}

export function renderResultCount(el, count, total) {
  el.textContent = count === total
    ? `${total} student${total === 1 ? "" : "s"}`
    : `${count} of ${total} students`;
}

export function renderEmptyState(tbody, colSpan) {
  tbody.innerHTML = `
    <tr class="empty-row">
      <td colspan="${colSpan}">
        <div class="empty-state">
          <p>No students match those filters.</p>
          <p class="empty-hint">Try a different name, admin number, or clear a filter.</p>
        </div>
      </td>
    </tr>`;
}

export function renderDrawerHeader(student) {
  return `
    <div class="avatar avatar-lg">
      <img src="${photoUrl(student.photo)}" alt=""
           onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar-fallback avatar-fallback-lg',textContent:'${initials(student)}'}))" />
    </div>
    <div>
      <h2 class="drawer-name">${student.firstName} ${student.lastName}</h2>
      <p class="drawer-meta">Admin No <span class="mono">${student.adminNo}</span> · Grade ${student.grade} · ${student.class}</p>
    </div>
  `;
}

/** Read-only view: facts + subjects table, with an Edit button for admins. */
export function renderDrawerView(student, isAdmin) {
  const subjectRows = (student.subjectsSummary || []).length
    ? student.subjectsSummary
        .map((name) => {
          const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
          const enr = (student.enrollments || {})[key];
          return `
            <tr>
              <td>${name}</td>
              <td>${enr?.teacher || "—"}</td>
              <td>${enr?.class || "—"}</td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="3" class="empty-hint">No subjects on file</td></tr>`;

  return `
    ${isAdmin ? `<button id="editStudentBtn" class="btn btn-primary btn-block">Edit student</button>` : ""}

    <dl class="drawer-facts">
      <div><dt>Registration class</dt><dd>${student.registrationClass || "—"}</dd></div>
      <div><dt>Gender</dt><dd>${student.gender || "—"}</dd></div>
      <div><dt>Age group</dt><dd>${student.agegroup || "—"}</dd></div>
      <div><dt>Birthdate</dt><dd>${student.birthdate || "—"}</dd></div>
    </dl>

    <h3 class="drawer-subheading">Subjects</h3>
    <table class="drawer-table">
      <thead><tr><th>Subject</th><th>Teacher</th><th>Class</th></tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>
  `;
}

/** Editable form: field inputs + removable subject chips + add-subject row. */
export function renderDrawerEdit(draft, subjectOptions) {
  const chips = draft.subjectsSummary.length
    ? draft.subjectsSummary
        .map(
          (name) => `
      <span class="chip">
        ${name}
        <button type="button" class="chip-remove" data-subject="${name}" aria-label="Remove ${name}">&times;</button>
      </span>`,
        )
        .join("")
    : `<span class="empty-hint">No subjects yet</span>`;

  const availableToAdd = subjectOptions.filter((s) => !draft.subjectsSummary.includes(s));
  const options = availableToAdd.map((s) => `<option value="${s}">${s}</option>`).join("");

  return `
    <form id="editForm" class="edit-form">
      <div class="edit-grid">
        <div>
          <label for="editFirstName">First name</label>
          <input id="editFirstName" data-field="firstName" type="text" value="${draft.firstName}" required />
        </div>
        <div>
          <label for="editLastName">Last name</label>
          <input id="editLastName" data-field="lastName" type="text" value="${draft.lastName}" required />
        </div>
        <div>
          <label for="editGrade">Grade</label>
          <select id="editGrade" data-field="grade">
            ${[8, 9, 10, 11, 12].map((g) => `<option value="${g}" ${Number(draft.grade) === g ? "selected" : ""}>${g}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="editClass">Class</label>
          <input id="editClass" data-field="class" type="text" value="${draft.class}" required />
        </div>
        <div>
          <label for="editGender">Gender</label>
          <select id="editGender" data-field="gender">
            <option value="Female" ${draft.gender === "Female" ? "selected" : ""}>Female</option>
            <option value="Male" ${draft.gender === "Male" ? "selected" : ""}>Male</option>
          </select>
        </div>
        <div>
          <label for="editAgegroup">Age group</label>
          <input id="editAgegroup" data-field="agegroup" type="text" value="${draft.agegroup}" />
        </div>
        <div>
          <label for="editBirthdate">Birthdate</label>
          <input id="editBirthdate" data-field="birthdate" type="date" value="${draft.birthdate}" />
        </div>
      </div>

      <h3 class="drawer-subheading">Subjects</h3>
      <div class="chip-row">${chips}</div>
      <div class="add-subject-row">
        <select id="addSubjectSelect">
          <option value="">Add a subject…</option>
          ${options}
        </select>
        <button type="button" id="addSubjectBtn" class="btn btn-ghost" ${availableToAdd.length ? "" : "disabled"}>Add</button>
      </div>

      <p id="editError" class="error-text"></p>
      <div class="edit-actions">
        <button type="submit" id="saveEditBtn" class="btn btn-primary">Save changes</button>
        <button type="button" id="cancelEditBtn" class="btn btn-ghost">Cancel</button>
      </div>
    </form>
  `;
}
