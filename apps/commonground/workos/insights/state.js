function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function failure(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

export function createPreviewState({
  datasets = [],
  points = [],
  revision = 0,
  foreign = {}
} = {}) {
  return {
    datasets: copy(datasets),
    points: copy(points),
    revision,
    foreign: copy(foreign)
  };
}

export function applyPreviewCommand(current, command) {
  if (!current || !Number.isInteger(current.revision)) failure("PREVIEW_STATE_INVALID");
  if (command.expectedRevision !== current.revision) failure("STALE_PREVIEW_WRITE");
  if (command.fault === "quota") failure("PREVIEW_QUOTA");
  if (command.fault === "partial") failure("PREVIEW_PARTIAL");
  const next = createPreviewState(current);

  if (command.type === "import") {
    if (!command.dataset || !Array.isArray(command.points)) failure("PREVIEW_IMPORT_INVALID");
    if (next.datasets.some(({ id }) => id === command.dataset.id)) failure("PREVIEW_DUPLICATE_DATASET");
    next.datasets.push(copy(command.dataset));
    next.points.push(...copy(command.points));
  } else if (command.type === "delete") {
    if (!command.datasetId) failure("PREVIEW_DATASET_ID_REQUIRED");
    next.datasets = next.datasets.filter(({ id }) => id !== command.datasetId);
    next.points = next.points.filter(({ dataset_id }) => dataset_id !== command.datasetId);
  } else if (command.type === "clear") {
    next.datasets = [];
    next.points = [];
  } else {
    failure("PREVIEW_COMMAND_UNKNOWN");
  }
  next.revision += 1;
  return next;
}
