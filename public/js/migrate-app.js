/**
 * migrate-app.js — wires auth, file parsing, diffing, and committing
 * together for the migration console.
 */
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "./firebase-init.js";
import { getAllStudents } from "./data-service.js";
import { parseStudentsFile, diffStudents, describeChanges } from "./migrate-parse.js";
import { commitChanges } from "./migrate-service.js";

const els = {
  authGate: document.getElementById("authGate"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authError: document.getElementById("authError"),
  toolPanel: document.getElementById("toolPanel"),
  userBadge: document.getElementById("userBadge"),
  signOutBtn: document.getElementById("signOutBtn"),

  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  fileSummary: document.getElementById("fileSummary"),
  compareBtn: document.getElementById("compareBtn"),

  diffSummary: document.getElementById("diffSummary"),
  diffLog: document.getElementById("diffLog"),

  dryRun: document.getElementById("dryRun"),
  runBtn: document.getElementById("runBtn"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  runStatus: document.getElementById("runStatus"),
};

let incomingRecords = null; // parsed file contents
let currentDiff = null; // last computed diff

/* ---------------- Auth ---------------- */

els.authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.authError.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, els.authEmail.value, els.authPassword.value);
  } catch (err) {
    els.authError.textContent = "Sign-in failed: " + err.message;
  }
});

els.signOutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  const signedIn = Boolean(user);
  els.authGate.classList.toggle("is-hidden", signedIn);
  els.toolPanel.classList.toggle("is-hidden", !signedIn);
  if (signedIn) els.userBadge.textContent = user.email;
});

/* ---------------- File intake ---------------- */

function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      incomingRecords = parseStudentsFile(reader.result);
      const count = Object.keys(incomingRecords).length;
      els.fileSummary.innerHTML = `
        <p class="ok-text">Loaded <strong>${file.name}</strong> — ${count} student records.</p>`;
      els.compareBtn.disabled = false;
      resetDiffUI();
    } catch (err) {
      incomingRecords = null;
      els.fileSummary.innerHTML = `<p class="error-text">${err.message}</p>`;
      els.compareBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

els.fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropZone.classList.add("is-dragover");
  }),
);
["dragleave", "drop"].forEach((evt) =>
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropZone.classList.remove("is-dragover");
  }),
);
els.dropZone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
els.dropZone.addEventListener("click", () => els.fileInput.click());

/* ---------------- Compare ---------------- */

function resetDiffUI() {
  currentDiff = null;
  els.diffSummary.innerHTML = "";
  els.diffLog.innerHTML = "";
  els.runBtn.disabled = true;
  els.progressWrap.classList.add("is-hidden");
  els.runStatus.textContent = "";
}

function summaryCard(label, count, tone) {
  return `<div class="diff-card diff-card-${tone}">
    <span class="diff-count">${count}</span>
    <span class="diff-label">${label}</span>
  </div>`;
}

function logSection(title, items, render) {
  if (!items.length) return "";
  return `
    <details class="log-section" ${items.length <= 15 ? "open" : ""}>
      <summary>${title} (${items.length})</summary>
      <div class="log-body">${items.map(render).join("")}</div>
    </details>`;
}

els.compareBtn.addEventListener("click", async () => {
  els.compareBtn.disabled = true;
  els.diffSummary.innerHTML = `<p class="empty-hint">Fetching current Firestore roster…</p>`;
  try {
    const existing = await getAllStudents({ forceRefresh: true });
    currentDiff = diffStudents(incomingRecords, existing);
    renderDiff(currentDiff);
  } catch (err) {
    els.diffSummary.innerHTML = `<p class="error-text">Comparison failed: ${err.message}</p>`;
  } finally {
    els.compareBtn.disabled = false;
  }
});

function renderDiff(diff) {
  els.diffSummary.innerHTML = [
    summaryCard("New", diff.toCreate.length, "new"),
    summaryCard("Changed", diff.toUpdate.length, "changed"),
    summaryCard("Unchanged", diff.unchanged.length, "unchanged"),
    summaryCard("Invalid — skipped", diff.invalid.length, "invalid"),
  ].join("");

  els.diffLog.innerHTML =
    logSection(
      "New students",
      diff.toCreate,
      (r) => `<div class="log-row"><span class="mono">${r.adminNo}</span> ${r.record.firstName} ${r.record.lastName}</div>`,
    ) +
    logSection("Changed students", diff.toUpdate, (r) => {
      const changes = describeChanges(r.previous, r.record);
      return `<div class="log-row">
        <div><span class="mono">${r.adminNo}</span> ${r.record.firstName} ${r.record.lastName}</div>
        <ul class="log-changes">
          ${changes.map((c) => `<li><strong>${c.field}</strong>: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}</li>`).join("")}
        </ul>
      </div>`;
    }) +
    logSection(
      "Invalid — will be skipped",
      diff.invalid,
      (r) => `<div class="log-row error-text"><span class="mono">${r.adminNo}</span> ${r.problems.join(", ")}</div>`,
    );

  const writable = diff.toCreate.length + diff.toUpdate.length;
  els.runBtn.disabled = writable === 0;
  els.runBtn.textContent = els.dryRun.checked
    ? `Preview only (${writable} would be written)`
    : `Write ${writable} record${writable === 1 ? "" : "s"} to Firestore`;
}

els.dryRun.addEventListener("change", () => {
  if (currentDiff) renderDiff(currentDiff);
});

/* ---------------- Commit ---------------- */

els.runBtn.addEventListener("click", async () => {
  if (!currentDiff) return;
  const changes = [...currentDiff.toCreate, ...currentDiff.toUpdate];

  if (els.dryRun.checked) {
    els.runStatus.textContent =
      `Dry run only — nothing was written. Untick "Dry run" to commit for real.`;
    return;
  }

  const confirmed = confirm(
    `This will write ${changes.length} record(s) to Firestore. Continue?`,
  );
  if (!confirmed) return;

  els.runBtn.disabled = true;
  els.progressWrap.classList.remove("is-hidden");
  els.progressBar.style.width = "0%";
  els.runStatus.textContent = "";

  try {
    await commitChanges(changes, (done, total) => {
      const pct = Math.round((done / total) * 100);
      els.progressBar.style.width = pct + "%";
      els.progressLabel.textContent = `${done} / ${total}`;
    });
    els.runStatus.innerHTML = `<p class="ok-text">Done — ${changes.length} records written at ${new Date().toLocaleString()}.</p>`;
  } catch (err) {
    els.runStatus.innerHTML = `<p class="error-text">Migration failed partway: ${err.message}</p>`;
  } finally {
    els.runBtn.disabled = false;
  }
});
