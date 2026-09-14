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

export function renderDrawer(student) {
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
    <div class="drawer-header">
      <div class="avatar avatar-lg">
        <img src="${photoUrl(student.photo)}" alt=""
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar-fallback avatar-fallback-lg',textContent:'${initials(student)}'}))" />
      </div>
      <div>
        <h2 class="drawer-name">${student.firstName} ${student.lastName}</h2>
        <p class="drawer-meta">Admin No <span class="mono">${student.adminNo}</span> · Grade ${student.grade} · ${student.class}</p>
      </div>
    </div>

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
