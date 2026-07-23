import {
  describeInsights,
  filterRange,
  metricKpis,
  rangeStatistics
} from "./analytics.js";

function element(tag, attributes = {}, text = "") {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "class") node.className = value;
    else node.setAttribute(name, value);
  }
  if (text !== "") node.textContent = text;
  return node;
}

function labelFor(metricKey) {
  return metricKey.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatted(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function renderChart(points, metricKey) {
  const label = labelFor(metricKey);
  const svg = element("svg", {
    class: "insights-chart",
    viewBox: "0 0 800 280",
    role: "img",
    "aria-label": `${label} trend across ${points.length} visible points`,
    preserveAspectRatio: "none"
  });
  svg.append(element("title", {}, `${label} trend`));
  svg.append(element("desc", {}, `A descriptive line chart of ${points.length} locally supplied observations. An equivalent table follows.`));
  if (points.length === 0) return svg;
  const values = points.map(({ value }) => value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum || 1;
  const coordinates = points.map(({ value }, index) => {
    const x = points.length === 1 ? 400 : 30 + index / (points.length - 1) * 740;
    const y = 250 - (value - minimum) / span * 220;
    return `${x},${y}`;
  }).join(" ");
  svg.append(element("polyline", { points: coordinates, fill: "none", "vector-effect": "non-scaling-stroke" }));
  return svg;
}

function renderTable(points, metricKey) {
  const label = labelFor(metricKey);
  const table = element("table", { "aria-label": `Visible ${metricKey} values` });
  const head = element("thead");
  const headerRow = element("tr");
  for (const heading of ["Timestamp", "Value", "Unit", "Source value"]) headerRow.append(element("th", { scope: "col" }, heading));
  head.append(headerRow);
  table.append(head);
  const body = element("tbody");
  for (const point of points) {
    const row = element("tr");
    row.append(element("td", {}, new Date(point.timestamp_ms).toISOString()));
    row.append(element("td", {}, formatted(point.value)));
    row.append(element("td", {}, point.unit));
    row.append(element("td", {}, String(point.raw_value ?? "")));
    body.append(row);
  }
  table.append(body);
  const region = element("div", { class: "insights-table-scroll", tabindex: "0", "aria-label": `${label} table, horizontally scrollable when needed` });
  region.append(table);
  return region;
}

export function mountInsightsPreview(root, points, {
  datasetName = "Preview dataset",
  initialMetric
} = {}) {
  if (!(root instanceof Element)) throw new Error("INSIGHTS_PREVIEW_ROOT");
  const metrics = [...new Set(points.map(({ metric_key }) => metric_key))].sort();
  if (metrics.length === 0) throw new Error("INSIGHTS_PREVIEW_EMPTY");
  const state = {
    metricKey: metrics.includes(initialMetric) ? initialMetric : metrics[0],
    rangePreset: "30d"
  };

  const render = () => {
    root.replaceChildren();
    const shell = element("section", { class: "insights-preview", "aria-labelledby": "insights-preview-title" });
    const header = element("header", { class: "insights-preview-header" });
    const headingGroup = element("div");
    headingGroup.append(element("p", { class: "insights-eyebrow" }, "Inactive parallel preview"));
    headingGroup.append(element("h1", { id: "insights-preview-title" }, "Insights preview"));
    headingGroup.append(element("p", {}, `${datasetName} stays in this explicit test harness. Nothing is imported into CommonGround.`));
    header.append(headingGroup);
    header.append(element("span", { class: "insights-badge" }, "No runtime authority"));
    shell.append(header);

    const notice = element("p", { class: "insights-notice" }, "These descriptive observations may reveal patterns; correlation does not establish causation or professional advice.");
    shell.append(notice);

    const controls = element("div", { class: "insights-controls", "aria-label": "Insights preview controls" });
    const metricLabel = element("label");
    metricLabel.append(element("span", {}, "Metric"));
    const select = element("select", { "aria-label": "Metric" });
    for (const metric of metrics) {
      const option = element("option", { value: metric }, labelFor(metric));
      if (metric === state.metricKey) option.selected = true;
      select.append(option);
    }
    select.addEventListener("change", () => {
      state.metricKey = select.value;
      render();
    });
    metricLabel.append(select);
    controls.append(metricLabel);
    for (const [preset, name] of [["30d", "30 days"], ["all", "All time"]]) {
      const button = element("button", {
        type: "button",
        "aria-pressed": String(state.rangePreset === preset)
      }, name);
      button.addEventListener("click", () => {
        state.rangePreset = preset;
        render();
      });
      controls.append(button);
    }
    shell.append(controls);

    const visible = filterRange(points, state.metricKey, state.rangePreset);
    const kpis = metricKpis(visible);
    const statistics = rangeStatistics(visible.map(({ value }) => value));
    const status = element("p", { class: "insights-status", role: "status", "aria-live": "polite" }, `${visible.length} visible points for ${labelFor(state.metricKey)}.`);
    shell.append(status);

    const cards = element("div", { class: "insights-cards", "aria-label": "Visible range summary" });
    for (const [label, value] of [
      ["Latest", kpis.latest],
      ["7-day average", kpis.avg7d],
      ["30-day average", kpis.avg30d],
      ["Mean", statistics.mean]
    ]) {
      const card = element("article");
      card.append(element("span", {}, label));
      card.append(element("strong", {}, formatted(value)));
      cards.append(card);
    }
    shell.append(cards);

    const figure = element("figure", { class: "insights-figure" });
    figure.append(renderChart(visible, state.metricKey));
    figure.append(element("figcaption", {}, `${labelFor(state.metricKey)} values in chronological order; consult the table for exact values.`));
    shell.append(figure);
    shell.append(renderTable(visible, state.metricKey));

    const feed = element("section", { class: "insights-feed", "aria-labelledby": "insights-feed-title" });
    feed.append(element("h2", { id: "insights-feed-title" }, "Deterministic observations"));
    const list = element("ul");
    for (const observation of describeInsights(visible)) list.append(element("li", {}, observation));
    feed.append(list);
    shell.append(feed);
    root.append(shell);
  };

  render();
  return {
    destroy() {
      root.replaceChildren();
    }
  };
}
