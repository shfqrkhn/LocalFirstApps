import { INSIGHTS_LIMITS } from "./contract.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function byteLength(text) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).byteLength
    : String(text).length;
}

export function parseCsv(input, limits = INSIGHTS_LIMITS) {
  const text = String(input ?? "");
  if (byteLength(text) > limits.maxCsvBytes) fail("INSIGHTS_CSV_TOO_LARGE", "CSV exceeds the preview size limit.");

  const records = [];
  let record = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    if (cell.length > limits.maxCellCharacters) fail("INSIGHTS_CSV_CELL_TOO_LARGE", "CSV cell exceeds the preview size limit.");
    record.push(cell);
    cell = "";
    if (record.length > limits.maxColumns) fail("INSIGHTS_CSV_TOO_MANY_COLUMNS", "CSV has too many columns.");
  };
  const pushRecord = () => {
    pushCell();
    if (record.some((value) => value !== "")) records.push(record);
    record = [];
    if (records.length > limits.maxRows + 1) fail("INSIGHTS_CSV_TOO_MANY_ROWS", "CSV has too many rows.");
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && cell === "") {
      quoted = true;
    } else if (character === ",") {
      pushCell();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      pushRecord();
    } else {
      cell += character;
    }
  }
  if (quoted) fail("INSIGHTS_CSV_UNCLOSED_QUOTE", "CSV contains an unclosed quoted field.");
  if (cell !== "" || record.length > 0) pushRecord();
  if (records.length === 0) fail("INSIGHTS_CSV_EMPTY", "CSV contains no rows.");

  const headers = records.shift().map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "") : header);
  if (headers.length === 0 || headers.every((header) => header === "")) fail("INSIGHTS_CSV_HEADERS", "CSV requires a header row.");
  const rows = records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  return { headers, rows };
}

export function inferCsvMapping(headers) {
  const find = (predicate) => headers.find((header) => predicate(header.toLowerCase())) || "";
  return {
    timestampCol: find((header) => header.includes("date") || header.includes("time")),
    valueCol: find((header) => header.includes("weight") || header.includes("value")),
    metricCol: find((header) => header.includes("metric")),
    unitCol: find((header) => header.includes("unit")),
    fixedMetric: "weight",
    fixedUnit: "lb"
  };
}
