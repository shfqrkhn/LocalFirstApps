export const OMNICORE_ERRORS_VERSION = "1.0.0";

export class OmniCoreError extends Error {
  constructor(code, message, { cause, details } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "OmniCoreError";
    this.code = String(code || "OMNICORE_ERROR");
    this.details = details === undefined ? null : structuredClone(details);
  }
}

export function errorMessage(error, fallback = "Operation failed.") {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function validationReport(issues) {
  const errors = [...new Set((issues || []).map((issue) => String(issue)).filter(Boolean))];
  return { ok: errors.length === 0, valid: errors.length === 0, issues: errors, errors };
}

export function assertNoIssues(issues, { code = "VALIDATION_FAILED", separator = " " } = {}) {
  const report = validationReport(issues);
  if (!report.ok) throw new OmniCoreError(code, report.issues.join(separator), { details: { issues: report.issues } });
  return report;
}

export function assertExpectedRevision(current, expectedRevision, {
  missingMessage,
  conflictMessage = "This record changed in another tab. Reload before saving."
} = {}) {
  if (expectedRevision === undefined) return current;
  if (!current && missingMessage) throw new OmniCoreError("STALE_RECORD_MISSING", missingMessage);
  if (Number(current?.revision) !== Number(expectedRevision)) {
    throw new OmniCoreError("STALE_REVISION", conflictMessage, {
      details: { expectedRevision: Number(expectedRevision), actualRevision: current?.revision ?? null }
    });
  }
  return current;
}
