/**
 * migrate-parse.js
 * Pure functions: parsing the uploaded file, validating each record,
 * and diffing against the current Firestore snapshot. No DOM, no
 * network — keeps this testable and reusable.
 */

const REQUIRED_FIELDS = ["adminNo", "firstName", "lastName", "grade", "class"];

/** Deterministic stringify (sorted keys) so field-order differences don't count as changes. */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Parses the raw file text into { adminNo: record } shape.
 * Throws with a human-readable message on malformed JSON or wrong shape.
 */
export function parseStudentsFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("File is not valid JSON.");
  }
  if (Array.isArray(data) || typeof data !== "object" || data === null) {
    throw new Error(
      "Expected an object keyed by admin number (e.g. { \"15623\": { ... } }), not an array.",
    );
  }
  return data;
}

/** Validates one record; returns a list of problems (empty = valid). */
export function validateRecord(adminNo, record) {
  const problems = [];
  if (!record || typeof record !== "object") {
    return ["record is not an object"];
  }
  REQUIRED_FIELDS.forEach((field) => {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      problems.push(`missing "${field}"`);
    }
  });
  if (String(record.adminNo) !== String(adminNo)) {
    problems.push(`adminNo field ("${record.adminNo}") does not match its key ("${adminNo}")`);
  }
  return problems;
}

/**
 * Compares incoming records against the current Firestore roster.
 * @param {Object} incoming  { adminNo: record }
 * @param {Array}  existing  array of current student docs (from Firestore)
 * @returns {{ toCreate, toUpdate, unchanged, invalid }}
 */
export function diffStudents(incoming, existing) {
  const existingByAdmin = new Map(existing.map((s) => [String(s.adminNo), s]));
  const toCreate = [];
  const toUpdate = [];
  const unchanged = [];
  const invalid = [];

  Object.entries(incoming).forEach(([adminNo, record]) => {
    const problems = validateRecord(adminNo, record);
    if (problems.length) {
      invalid.push({ adminNo, problems });
      return;
    }

    const current = existingByAdmin.get(String(adminNo));
    if (!current) {
      toCreate.push({ adminNo, record });
    } else if (stableStringify(current) !== stableStringify(record)) {
      toUpdate.push({ adminNo, record, previous: current });
    } else {
      unchanged.push({ adminNo, record });
    }
  });

  return { toCreate, toUpdate, unchanged, invalid };
}

/** Field-level differences between two versions of the same student, for the log view. */
export function describeChanges(previous, record) {
  const keys = new Set([...Object.keys(previous), ...Object.keys(record)]);
  const changes = [];
  keys.forEach((key) => {
    if (stableStringify(previous[key]) !== stableStringify(record[key])) {
      changes.push({ field: key, from: previous[key], to: record[key] });
    }
  });
  return changes;
}
