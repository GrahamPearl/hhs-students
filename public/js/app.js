/**
 * app.js — wires data-service, search, and render together.
 */
import {
  getAllStudents,
  collectSubjects,
  collectClasses,
} from "./data-service.js";
import { filterStudents, sortStudents } from "./search.js";
import {
  renderRows,
  renderCards,
  renderEmptyCards,
  renderResultCount,
  renderEmptyState,
  renderDrawerHeader,
  renderDrawerView,
  renderDrawerEdit,
  renderAddStudentForm,
  renderBulkUpdateModal,
} from "./render.js";

const els = {
  form: document.getElementById("searchForm"),
  query: document.getElementById("query"),
  field: document.getElementById("field"),
  grade: document.getElementById("filterGrade"),
  class: document.getElementById("filterClass"),
  gender: document.getElementById("filterGender"),
  subject: document.getElementById("filterSubject"),
  line: document.getElementById("filterLine"),
  teacher: document.getElementById("filterTeacher"), // Added teacher element
  resetBtn: document.getElementById("resetBtn"),
  tbody: document.getElementById("resultsBody"),
  resultCount: document.getElementById("resultCount"),
  loadingState: document.getElementById("loadingState"),
  tableWrap: document.getElementById("tableWrap"),
  drawer: document.getElementById("drawer"),
  drawerHeader: document.getElementById("drawerHeader"), // Make sure this matches index.html
  drawerContent: document.getElementById("drawerContent"), // Make sure this matches index.html
  drawerClose: document.getElementById("drawerClose"),
  scrim: document.getElementById("scrim"),
  authWidget: document.getElementById("authWidget"),
  authToggleBtn: document.getElementById("authToggleBtn"),
  authPopover: document.getElementById("authPopover"),

  openFiltersBtn: document.getElementById("openFiltersBtn"),
  filterModal: document.getElementById("filterModal"),
  filterModalClose: document.getElementById("filterModalClose"),
  filterApplyBtn: document.getElementById("filterApplyBtn"),
  filterClearBtn: document.getElementById("filterClearBtn"),
  filterCountBadge: document.getElementById("filterCountBadge"),

  tableWrap: document.getElementById("tableWrap"),
  cardsWrap: document.getElementById("cardsWrap"),
  resultsGrid: document.getElementById("resultsGrid"),
  layoutBtns: document.querySelectorAll(".layout-btn"),
  printCardsBtn: document.getElementById("printCardsBtn"),
  addStudentModalBtn: document.getElementById("addStudentModalBtn"),
  openBulkUpdateBtn: document.getElementById("openBulkUpdateBtn"),

  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  adminBadge: document.getElementById("adminBadge"),
  signOutBtn: document.getElementById("signOutBtn"),
  authPopover: document.getElementById("authPopover"),
};

const state = () => ({
  term: els.query.value,
  field: els.field.value,
  grade: els.grade.value,
  class: els.class.value,
  gender: els.gender.value,
  subject: els.subject.value,
  line: els.line.value,
  teacher: els.teacher.value, // Added teacher state
});

const COL_COUNT = 6;
let currentLayout = "list";
let roster = [];
let isAdmin = false;
let currentEditingStudent = null;
let newStudentDraft = {}; // <-- Declare it here

function runSearch() {
  let results = sortStudents(filterStudents(roster, state()));

  // Apply Line filtering on top of standard search results
  const selectedLine = els.line ? els.line.value : "";
  if (selectedLine) {
    results = results.filter((student) => {
      if (!student.enrollments) return false;
      return Object.values(student.enrollments).some(
        (enr) => String(enr.line) === String(selectedLine),
      );
    });
  }

  renderResultCount(els.resultCount, results.length, roster.length);

  if (results.length === 0) {
    if (currentLayout === "list") {
      renderEmptyState(els.tbody, COL_COUNT);
    } else {
      renderEmptyCards(els.resultsGrid);
    }
    return;
  }

  // Render based on active layout
  if (currentLayout === "list") {
    renderRows(els.tbody, results);
  } else {
    renderCards(els.resultsGrid, results);
  }
}

function collectLines(roster) {
  const lines = new Set();
  roster.forEach((student) => {
    if (student.enrollments) {
      Object.values(student.enrollments).forEach((enr) => {
        if (enr && enr.line !== undefined && enr.line !== "") {
          lines.add(Number(enr.line));
        }
      });
    }
  });
  return Array.from(lines).sort((a, b) => a - b);
}

function populateSelect(select, values, placeholder) {
  const current = select.value;
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    values.map((v) => `<option value="${v}">${v}</option>`).join("");
  if (values.includes(current)) select.value = current;
}

function getTeachersPerSubjectMap() {
  const map = {};
  roster.forEach((student) => {
    if (student.enrollments) {
      Object.entries(student.enrollments).forEach(([subKey, enr]) => {
        if (enr && enr.teacher) {
          // Normalize or store by subject name if available
          const subName = enr.subject || subKey;
          if (!map[subName]) map[subName] = new Set();
          map[subName].add(enr.teacher);
        }
      });
    }
  });
  // Convert sets to sorted arrays
  Object.keys(map).forEach((sub) => {
    map[sub] = Array.from(map[sub]).sort();
  });
  return map;
}

function refreshClassOptions() {
  populateSelect(
    els.class,
    collectClasses(roster, els.grade.value),
    "All classes",
  );
}

function refreshTeacherOptions() {
  const selectedSubject = els.subject.value;

  if (!selectedSubject) {
    els.teacher.innerHTML = '<option value="">Select a subject first</option>';
    els.teacher.value = "";
    els.teacher.disabled = true;
    return;
  }

  // Generate the slugified key matching render.js logic (e.g., "mathematics" -> "mathematics")
  const subjectKey = selectedSubject.toLowerCase().replace(/[^a-z0-9]/g, "");
  const teachers = new Set();

  roster.forEach((student) => {
    if (student.enrollments) {
      // Look up enrollment using either the slugified key or the exact subject name
      const enr =
        student.enrollments[subjectKey] || student.enrollments[selectedSubject];
      if (enr && enr.teacher) {
        teachers.add(enr.teacher);
      }
    }
  });

  const teacherArray = Array.from(teachers).filter(Boolean).sort();
  populateSelect(els.teacher, teacherArray, "All teachers");
  els.teacher.disabled = teacherArray.length === 0;
}

function openDrawer(adminNo) {
  const student = roster.find((s) => String(s.adminNo) === String(adminNo));
  if (!student) return;

  els.drawer.dataset.activeAdminNo = adminNo;

  // Render the header and pass the isAdmin flag to the view
  els.drawerHeader.innerHTML = renderDrawerHeader(student);
  els.drawerContent.innerHTML = renderDrawerView(student, isAdmin);

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

  // Update subject change to refresh teachers and run search
  els.subject.addEventListener("change", () => {
    refreshTeacherOptions();
    runSearch();
  });

  els.line.addEventListener("change", runSearch);
  els.teacher.addEventListener("change", runSearch);

  els.grade.addEventListener("change", () => {
    refreshClassOptions();
    runSearch();
  });
  els.class.addEventListener("change", runSearch);

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    refreshClassOptions();
    refreshTeacherOptions(); // Reset teacher dropdown state
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

  // Toggle staff auth popover visibility
  if (els.authToggleBtn && els.authPopover) {
    els.authToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.authPopover.classList.toggle("is-hidden");
    });

    // Close the popover when clicking outside of the auth widget
    document.addEventListener("click", (e) => {
      if (els.authWidget && !els.authWidget.contains(e.target)) {
        els.authPopover.classList.add("is-hidden");
      }
    });
  }

  // Toggle filter panel visibility
  els.openFiltersBtn.addEventListener("click", () => {
    els.filterModal.classList.toggle("is-hidden");
  });

  // Close filter panel via close button
  els.filterModalClose.addEventListener("click", () => {
    els.filterModal.classList.add("is-hidden");
  });

  // Apply filters: run search and hide panel
  els.filterApplyBtn.addEventListener("click", () => {
    els.filterModal.classList.add("is-hidden");
    runSearch();
  });

  // Clear filters inside the modal
  els.filterClearBtn.addEventListener("click", () => {
    els.grade.value = "";
    els.class.value = "";
    els.gender.value = "";
    els.subject.value = "";
    if (els.teacher) {
      els.teacher.value = "";
      els.teacher.disabled = true;
      els.teacher.innerHTML =
        '<option value="">Select a subject first</option>';
    }
    if (els.line) {
      els.line.value = ""; // <--- Reset line filter
    }
    refreshClassOptions();
    runSearch();
  });

  // Layout toggle buttons handler
  // Inside wireEvents() or layout toggle logic:
  els.layoutBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.layoutBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      currentLayout = btn.dataset.layout; // "list", "grid2", or "grid4"

      if (currentLayout === "list") {
        els.tableWrap.classList.remove("is-hidden");
        els.cardsWrap.classList.add("is-hidden");
        els.printCardsBtn.classList.add("is-hidden"); // Hide print button in list view
      } else {
        els.tableWrap.classList.add("is-hidden");
        els.cardsWrap.classList.remove("is-hidden");
        els.printCardsBtn.classList.remove("is-hidden"); // Show print button in grid views

        // Adjust grid columns class for Grid-4
        els.resultsGrid.className = `results-grid ${currentLayout === "grid4" ? "grid-cols-4" : "grid-cols-2"}`;
      }

      runSearch();
    });
  });

  // Wire the print button action
  els.printCardsBtn.addEventListener("click", async () => {
    // 1. Find all student card images currently rendered
    const images = els.resultsGrid.querySelectorAll("img");

    if (images.length === 0) {
      window.print();
      return;
    }

    // 2. Show a brief loading indicator or change button text if desired
    els.printCardsBtn.textContent = "Preparing PDF...";
    els.printCardsBtn.disabled = true;

    // 3. Force lazy images to load eagerly and wait for them to load
    const imageLoadPromises = Array.from(images).map((img) => {
      img.loading = "eager"; // Force immediate loading

      // If the image is already fully loaded, resolve immediately
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }

      // Otherwise, wait for the load or error event
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Resolve on error too so it doesn't hang forever
      });
    });

    // Wait until every single photo has finished downloading
    await Promise.all(imageLoadPromises);

    // 4. Reset button state and open the print dialog
    els.printCardsBtn.textContent = "Print / Export PDF";
    els.printCardsBtn.disabled = false;

    window.print();
  });

  let currentEditingAdminNo = null;

  // Inside wireEvents():
  // Inside wireEvents() in app.js:
  els.drawerContent.addEventListener("change", (e) => {
    // (a) Handling Subject Swap
    if (e.target.classList.contains("edit-subject-select")) {
      const oldSub = e.target.getAttribute("data-old-subject");
      const newSub = e.target.value;
      const index = parseInt(
        e.target.closest(".edit-subject-row").dataset.index,
        10,
      );

      if (!isNaN(index)) {
        // Update subjects summary array
        currentEditingStudent.subjectsSummary[index] = newSub;

        // Update enrollments mapping
        const oldKey = oldSub.toLowerCase().replace(/[^a-z0-9]/g, "");
        const newKey = newSub.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (currentEditingStudent.enrollments[oldKey]) {
          currentEditingStudent.enrollments[newKey] =
            currentEditingStudent.enrollments[oldKey];
          delete currentEditingStudent.enrollments[oldKey];
        } else {
          currentEditingStudent.enrollments[newKey] = { teacher: "", line: 1 };
        }

        // Re-render the edit form to refresh teacher dropdown options for the new subject
        const allSubjects = collectSubjects(roster);
        const teacherMap = getTeachersPerSubjectMap();
        els.drawerContent.innerHTML = renderDrawerEdit(
          currentEditingStudent,
          allSubjects,
          teacherMap,
        );
      }
    }

    // (b) Handling Teacher Swap
    if (e.target.classList.contains("edit-teacher-select")) {
      const subKey = e.target.getAttribute("data-subject-key");
      const newTeacher = e.target.value;

      if (!currentEditingStudent.enrollments[subKey]) {
        currentEditingStudent.enrollments[subKey] = {};
      }
      currentEditingStudent.enrollments[subKey].teacher = newTeacher;
    }

    // (c) Handling Line Number Change
    if (e.target.classList.contains("edit-line-input")) {
      const subKey = e.target.getAttribute("data-subject-key");
      const newLine = parseInt(e.target.value, 10);

      if (!currentEditingStudent.enrollments[subKey]) {
        currentEditingStudent.enrollments[subKey] = {};
      }
      currentEditingStudent.enrollments[subKey].line = isNaN(newLine)
        ? ""
        : newLine;
    }
  });

  // Update click handler inside drawerContent for removing/adding subjects:
  els.drawerContent.addEventListener("click", (e) => {
    if (e.target.id === "editStudentBtn") {
      const adminNo = els.drawer.dataset.activeAdminNo;
      const student = roster.find((s) => String(s.adminNo) === String(adminNo));
      if (!student) return;

      currentEditingStudent = JSON.parse(JSON.stringify(student));
      const allSubjects = collectSubjects(roster);
      const teacherMap = getTeachersPerSubjectMap();
      els.drawerContent.innerHTML = renderDrawerEdit(
        currentEditingStudent,
        allSubjects,
        teacherMap,
      );
    }

    if (e.target.id === "cancelEditBtn") {
      const student = roster.find(
        (s) => String(s.adminNo) === String(currentEditingStudent.adminNo),
      );
      els.drawerContent.innerHTML = renderDrawerView(student, isAdmin);
    }

    // Remove a subject row
    if (e.target.matches("[data-remove-subject]")) {
      const subToRemove = e.target.getAttribute("data-remove-subject");
      currentEditingStudent.subjectsSummary =
        currentEditingStudent.subjectsSummary.filter((s) => s !== subToRemove);

      const subKey = subToRemove.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (currentEditingStudent.enrollments) {
        delete currentEditingStudent.enrollments[subKey];
      }

      const allSubjects = collectSubjects(roster);
      const teacherMap = getTeachersPerSubjectMap();
      els.drawerContent.innerHTML = renderDrawerEdit(
        currentEditingStudent,
        allSubjects,
        teacherMap,
      );
    }

    // Add a brand new subject
    if (e.target.id === "addSubjectBtn") {
      const select = document.getElementById("addSubjectSelect");
      const chosenSub = select.value;
      if (
        chosenSub &&
        !currentEditingStudent.subjectsSummary.includes(chosenSub)
      ) {
        currentEditingStudent.subjectsSummary.push(chosenSub);

        const subKey = chosenSub.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!currentEditingStudent.enrollments)
          currentEditingStudent.enrollments = {};
        currentEditingStudent.enrollments[subKey] = {
          teacher: "",
          line: currentEditingStudent.subjectsSummary.length,
        };

        const allSubjects = collectSubjects(roster);
        const teacherMap = getTeachersPerSubjectMap();
        els.drawerContent.innerHTML = renderDrawerEdit(
          currentEditingStudent,
          allSubjects,
          teacherMap,
        );
      }
    }
  });

  // 5. Handle Form Save (Submit)
  els.drawerContent.addEventListener("submit", (e) => {
    if (e.target.id === "editForm") {
      e.preventDefault();

      // Capture input values and update currentEditingStudent draft
      const inputs = els.drawerContent.querySelectorAll("[data-field]");
      inputs.forEach((input) => {
        const field = input.getAttribute("data-field");
        currentEditingStudent[field] = input.value;
      });

      // Save back to main roster array (or send to Firebase data service)
      const index = roster.findIndex(
        (s) => String(s.adminNo) === String(currentEditingStudent.adminNo),
      );
      if (index !== -1) {
        roster[index] = currentEditingStudent;
      }

      // Return to read-only drawer view & refresh table/cards
      els.drawerContent.innerHTML = renderDrawerView(
        currentEditingStudent,
        isAdmin,
      );
      runSearch();
    }
  });
}

// Execute Bulk Update Submission
document.addEventListener("submit", async (e) => {
  if (e.target.id === "bulkUpdateForm") {
    e.preventDefault();
    const targetField = document.getElementById("bulkTargetField").value;
    const matchVal = document
      .getElementById("bulkMatchValue")
      .value.trim()
      .toLowerCase();
    const newVal = document.getElementById("bulkNewValue").value.trim();
    const subjectScope = document.getElementById("bulkSubjectScope")?.value;
    const errorEl = document.getElementById("bulkUpdateError");

    let updateCount = 0;
    const batch = writeBatch(db);

    roster.forEach((student) => {
      let isUpdated = false;

      if (targetField === "registrationClass") {
        if (
          String(student.registrationClass || "")
            .trim()
            .toLowerCase() === matchVal
        ) {
          student.registrationClass = newVal;
          isUpdated = true;
        }
      } else if (targetField === "grade") {
        if (
          String(student.grade || "")
            .trim()
            .toLowerCase() === matchVal
        ) {
          student.grade = newVal;
          isUpdated = true;
        }
      } else if (targetField === "subjectTeacher" && subjectScope) {
        const subKey = subjectScope.toLowerCase().replace(/[^a-z0-9]/g, "");
        const enr = student.enrollments?.[subKey];

        if (enr) {
          if (
            String(enr.teacher || "")
              .trim()
              .toLowerCase() === matchVal
          ) {
            enr.teacher = newVal;
            isUpdated = true;
          }
        }
      } else if (targetField === "subjectLine" && subjectScope) {
        const subKey = subjectScope.toLowerCase().replace(/[^a-z0-9]/g, "");
        const enr = student.enrollments?.[subKey];

        if (enr) {
          enr.line = isNaN(newVal) ? newVal : Number(newVal);
          isUpdated = true;
        }
      }

      if (isUpdated) {
        const docId = student.id || student.docId;
        if (!docId) {
          console.error("Student record is missing a Firestore document ID:", student);
          return;
        }

        updateCount++;
        const studentRef = doc(db, "students", docId);
        
        const payload = {};
        if (targetField === "registrationClass") payload.registrationClass = student.registrationClass;
        if (targetField === "grade") payload.grade = student.grade;
        if (targetField === "subjectTeacher" || targetField === "subjectLine") {
          payload.enrollments = student.enrollments;
        }
        
        batch.update(studentRef, payload);
      }
    });

    if (updateCount === 0) {
      errorEl.textContent =
        "No student records matched your filter criteria. Verify current value.";
      return;
    }

    try {
      await batch.commit();
      alert(`Bulk update successful! Updated ${updateCount} student record(s) in Firestore.`);
      document.getElementById("bulkModalWrapper")?.remove();
      runSearch();
    } catch (err) {
      console.error("Error committing bulk update to Firestore:", err);
      errorEl.textContent = "Failed to save updates to database. Check console for details.";
    }
  }
});

// Handle Staff Sign In
if (els.authForm) {
  els.authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // In a real Firebase setup, authenticate here. For mockup/session:
    isAdmin = true;

    // Update UI indicators
    els.adminBadge.textContent = `Staff: ${els.authEmail.value}`;
    els.adminBadge.classList.remove("is-hidden");
    els.signOutBtn.classList.remove("is-hidden");
    els.addStudentModalBtn.classList.remove("is-hidden");
    els.openBulkUpdateBtn.classList.remove("is-hidden");
    els.authToggleBtn.classList.add("is-hidden");
    els.authPopover.classList.add("is-hidden");
  });

  els.signOutBtn.addEventListener("click", () => {
    isAdmin = false;
    els.adminBadge.classList.add("is-hidden");
    els.signOutBtn.classList.add("is-hidden");
    els.addStudentModalBtn.classList.add("is-hidden");
    els.openBulkUpdateBtn.classList.add("is-hidden");
    els.authToggleBtn.classList.remove("is-hidden");
    els.authForm.reset();
  });

  let newStudentDraft = {};

  // Open Add Student Modal/Drawer on Step 1
  els.addStudentModalBtn.addEventListener("click", () => {
    newStudentDraft = { subjectsSummary: [], enrollments: {} };
    els.drawerHeader.innerHTML = `<div><h2 class="drawer-name">Register New Student</h2></div>`;
    els.drawerContent.innerHTML = renderAddStudentForm(
      1,
      "",
      newStudentDraft,
      collectSubjects(roster),
    );

    els.drawer.classList.add("is-open");
    els.scrim.classList.add("is-visible");
    document.body.classList.add("no-scroll");
  });

  // Handle drawer content actions for adding a student
  els.drawerContent.addEventListener("submit", (e) => {
    e.preventDefault();

    // Step 1 Submission: Check Admin Number Uniqueness
    if (e.target.id === "addStudentStep1Form") {
      const adminNoInput = document.getElementById("newAdminNo").value.trim();
      const errorEl = document.getElementById("step1Error");

      if (!adminNoInput) {
        errorEl.textContent = "Admin Number cannot be empty.";
        return;
      }

      // Check against existing roster data
      const exists = roster.some(
        (s) => String(s.adminNo) === String(adminNoInput),
      );
      if (exists) {
        errorEl.textContent = `A student with Admin Number "${adminNoInput}" already exists in storage.`;
        return;
      }

      // Unique! Save adminNo and proceed to Step 2
      newStudentDraft.adminNo = adminNoInput;
      const allSubjects = collectSubjects(roster);
      els.drawerContent.innerHTML = renderAddStudentForm(
        2,
        adminNoInput,
        newStudentDraft,
        allSubjects,
      );
    }

    // Step 2 Submission: Save Complete Student Record
    if (e.target.id === "addStudentStep2Form") {
      const inputs = els.drawerContent.querySelectorAll("[data-field]");
      inputs.forEach((input) => {
        const field = input.getAttribute("data-field");
        newStudentDraft[field] = input.value;
      });

      // Default fields if needed
      newStudentDraft.photo = newStudentDraft.photo || "";

      // Add to global roster array
      roster.unshift(newStudentDraft);

      // Close drawer and refresh UI
      closeDrawer();
      runSearch();
    }
  });

  // Handle dynamic interactions inside Step 2 (adding subjects/chips)
  els.drawerContent.addEventListener("click", (e) => {
    if (e.target.id === "cancelAddBtn") {
      closeDrawer();
    }

    if (e.target.id === "addNewSubjectBtn") {
      const select = document.getElementById("newSubjectSelect");
      const sub = select.value;
      if (sub && !newStudentDraft.subjectsSummary.includes(sub)) {
        newStudentDraft.subjectsSummary.push(sub);
        const subKey = sub.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!newStudentDraft.enrollments) newStudentDraft.enrollments = {};
        newStudentDraft.enrollments[subKey] = {
          teacher: "Unassigned",
          line: newStudentDraft.subjectsSummary.length,
        };

        // Render updated chips
        const chipsHtml = newStudentDraft.subjectsSummary
          .map((s) => `<span class="chip">${s}</span>`)
          .join("");
        document.getElementById("newSubjectsList").innerHTML =
          chipsHtml || `<span class="empty-hint">No subjects added yet</span>`;
        select.value = "";
      }
    }
  });

  // Open Bulk Update Modal
  els.openBulkUpdateBtn.addEventListener("click", () => {
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "bulkModalWrapper";
    modalWrapper.innerHTML = renderBulkUpdateModal(
      collectSubjects(roster),
      collectClasses(roster),
    );
    document.body.appendChild(modalWrapper);
  });

  // Handle Dynamic Fields and Submission inside the Modal
  document.addEventListener("change", (e) => {
    if (e.target.id === "bulkTargetField") {
      const val = e.target.value;
      const contextContainer = document.getElementById("bulkContextContainer");

      if (val === "subjectTeacher" || val === "subjectLine") {
        const subjects = collectSubjects(roster);
        contextContainer.innerHTML = `
        <label for="bulkSubjectScope"><strong>Target Subject Scope</strong></label>
        <select id="bulkSubjectScope" class="form-control" style="width: 100%; margin-top: 4px;" required>
          <option value="">Select subject...</option>
          ${subjects.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
      `;
      } else {
        contextContainer.innerHTML = "";
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.id === "closeBulkModalBtn") {
      document.getElementById("bulkModalWrapper")?.remove();
    }
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
  populateSelect(els.line, collectLines(roster), "All lines"); // <--- Populate line options
  refreshClassOptions();
  refreshTeacherOptions();

  els.loadingState.remove();
  els.tableWrap.classList.remove("is-hidden");
  runSearch();
}

init();
