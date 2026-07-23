function append(parent, ...children) {
  parent.append(...children.filter(Boolean));
  return parent;
}

function element(document, tag, { className = "", text = "", attrs = {}, children = [] } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (value === true) node.setAttribute(name, "");
    else node.setAttribute(name, String(value));
  }
  append(node, ...children);
  return node;
}

function icon(document, glyph) {
  return element(document, "span", { className: "emoji-icon", text: glyph, attrs: { "aria-hidden": "true" } });
}

function button(document, { className, text, glyph, attrs = {} }) {
  const node = element(document, "button", { className, attrs: { type: "button", ...attrs } });
  if (glyph) node.append(icon(document, glyph));
  node.append(document.createTextNode(text));
  return node;
}

function dailyCard(document, title, glyph, lines) {
  const body = element(document, "div", { className: "card-body" });
  for (const line of lines) body.append(line);
  return element(document, "div", {
    className: "col-12 col-lg-6 mb-0",
    children: [element(document, "section", {
      className: "card h-100",
      children: [
        append(element(document, "h3", { className: "card-header h5" }), icon(document, glyph), document.createTextNode(title)),
        body
      ]
    })]
  });
}

export function createNoodleViews({ document, state, selectors, config, chartCtor, bootstrap }) {
  const appRoot = document.getElementById("app-root");
  const subscriptions = new Set();

  function clearSubscriptions() {
    for (const unsubscribe of subscriptions) unsubscribe();
    subscriptions.clear();
  }

  function clearRoot() {
    clearSubscriptions();
    appRoot.replaceChildren();
  }

  function updateNav(active) {
    for (const anchor of document.querySelectorAll(".main-nav a[data-nav]")) {
      const selected = anchor.dataset.nav === active;
      anchor.classList.toggle("active", selected);
      if (selected) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
    }
  }

  function renderDashboard() {
    clearRoot();
    updateNav("dashboard");
    const { viewDate } = state.get();
    const { quote, reflection, meditation, bias } = selectors.getDailyContent(viewDate);
    const date = new Date(viewDate);
    const isToday = date.toDateString() === new Date().toDateString();
    const dateHeader = element(document, "div", { className: "d-flex justify-content-between align-items-center mb-4" });
    dateHeader.append(
      button(document, { className: "btn btn-outline-secondary", text: "", glyph: "⬅️", attrs: { "data-action": "prev-day", "aria-label": "Previous Day" } }),
      element(document, "h2", {
        className: "mb-0 text-center",
        text: date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      }),
      button(document, {
        className: "btn btn-outline-secondary",
        text: "",
        glyph: "➡️",
        attrs: { "data-action": "next-day", "aria-label": "Next Day", disabled: isToday }
      })
    );
    const ctaBody = element(document, "div", { className: "card-body" });
    ctaBody.append(
      element(document, "h3", { text: selectors.getString("takeAssessmentsCTA") }),
      element(document, "p", { text: selectors.getString("takeAssessmentsCTADescription") }),
      button(document, {
        className: "btn btn-light",
        text: selectors.getString("startAssessment"),
        glyph: "📋",
        attrs: { "data-nav": "assessments" }
      })
    );
    const grid = element(document, "div", { className: "row" });
    grid.append(
      dailyCard(document, selectors.getString("dailyQuote"), "💬", quote ? [
        element(document, "blockquote", { text: quote.quote }),
        element(document, "footer", { className: "blockquote-footer text-end", text: quote.author })
      ] : [element(document, "p", { className: "text-muted", text: "No quote available for this day." })]),
      dailyCard(document, selectors.getString("dailyReflection"), "💡", reflection ? [
        element(document, "p", { text: reflection.prompt })
      ] : [element(document, "p", { className: "text-muted", text: "No reflection available for this day." })]),
      dailyCard(document, selectors.getString("dailyMeditation"), "🧘", meditation ? [
        element(document, "strong", { text: `${meditation.theme}:` }),
        element(document, "p", { className: "mt-2", text: meditation.instruction })
      ] : [element(document, "p", { className: "text-muted", text: "No meditation available for this day." })]),
      dailyCard(document, selectors.getString("dailyBias"), "🧠", bias ? [
        element(document, "strong", { text: `${bias.bias}:` }),
        element(document, "p", { className: "mt-2", text: bias.summary })
      ] : [element(document, "p", { className: "text-muted", text: "No cognitive bias available for this day." })])
    );
    appRoot.append(dateHeader, element(document, "section", { className: "card text-white bg-primary text-center", children: [ctaBody] }), grid);
  }

  function createAssessmentTier(title, assessments, currentState) {
    if (!assessments.length) return null;
    const row = element(document, "div", { className: "row g-3" });
    for (const assessment of assessments) {
      const completed = Boolean(currentState.userResults?.[assessment.id]);
      const card = element(document, "article", { className: `card h-100${completed ? " border-success" : ""}` });
      const body = element(document, "div", { className: "card-body d-flex flex-column" });
      body.append(
        element(document, "h4", { className: "card-title h5", text: `${assessment.title}${completed ? " ✅" : ""}` }),
        element(document, "p", { className: "card-text text-muted flex-grow-1", text: assessment.description })
      );
      const toolbar = element(document, "div", { className: "btn-toolbar", attrs: { role: "toolbar", "aria-label": `${assessment.title} actions` } });
      const primary = element(document, "div", { className: "btn-group me-2", attrs: { role: "group" } });
      const secondary = element(document, "div", { className: "btn-group", attrs: { role: "group" } });
      if (completed) {
        primary.append(button(document, {
          className: "btn btn-success",
          text: selectors.getString("viewResults"),
          glyph: "📊",
          attrs: { "data-nav": "results", "data-assessment-id": assessment.id }
        }));
        secondary.append(button(document, {
          className: "btn btn-outline-secondary",
          text: selectors.getString("retakeAssessment"),
          glyph: "🔄",
          attrs: { "data-nav": "assessment", "data-assessment-id": assessment.id }
        }));
      } else {
        primary.append(button(document, {
          className: "btn btn-primary",
          text: selectors.getString("startAssessment"),
          glyph: "🚀",
          attrs: { "data-nav": "assessment", "data-assessment-id": assessment.id }
        }));
      }
      toolbar.append(primary, secondary);
      body.append(toolbar);
      card.append(body);
      row.append(element(document, "div", { className: "col-12 col-md-6", children: [card] }));
    }
    return element(document, "section", {
      className: "tier-section mb-5",
      children: [element(document, "h3", { text: title }), row]
    });
  }

  function renderAssessments() {
    clearRoot();
    updateNav("assessments");
    const current = state.get();
    const ordered = selectors.orderedAssessments(config.assessmentOrder);
    const heading = append(
      element(document, "h2"),
      icon(document, "📋"),
      document.createTextNode(selectors.getString("assessmentsTitle"))
    );
    appRoot.append(
      element(document, "header", {
        className: "assessment-list-header",
        children: [
          heading,
          element(document, "p", {
            className: "lead text-muted",
            text: "These assessments are designed for self-discovery. Tier 1 forms your Core Profile, while Tier 2 offers deeper dives into specific areas."
          })
        ]
      }),
      element(document, "div", {
        className: "assessment-list",
        children: [
          createAssessmentTier("Tier 1: Core Profile", ordered.filter((assessment) => assessment.tier === "Tier 1"), current),
          createAssessmentTier("Tier 2: Contextual Deep Dives", ordered.filter((assessment) => assessment.tier === "Tier 2"), current)
        ]
      })
    );
  }

  function renderLikert(form, assessment) {
    assessment.questions.forEach((question, index) => {
      const questionTextId = `q-text-${question.id}`;
      const card = element(document, "fieldset", { className: "card mb-3" });
      const legend = element(document, "legend", { className: "card-header h6", attrs: { id: questionTextId } });
      legend.append(element(document, "strong", { text: `${index + 1}.` }), document.createTextNode(` ${question.text}`));
      const scale = element(document, "div", {
        className: "card-body btn-group w-100 likert-scale",
        attrs: { role: "radiogroup", "aria-labelledby": questionTextId }
      });
      for (const option of assessment.responseScale) {
        const id = `${question.id}-${option.value}`;
        scale.append(
          element(document, "input", {
            className: "btn-check",
            attrs: { type: "radio", name: question.id, id, value: option.value, required: true, autocomplete: "off" }
          }),
          element(document, "label", { className: "btn btn-outline-primary", text: option.text, attrs: { for: id } })
        );
      }
      card.append(legend, scale);
      form.append(card);
    });
  }

  function renderCardSort(form, assessment) {
    for (const section of assessment.sections) {
      const source = element(document, "div", { className: "col-12 col-md-4 card-sort-source border p-3 rounded" });
      source.append(element(document, "h4", { className: "h5", text: "Available Items" }));
      for (const item of section.items) {
        source.append(element(document, "div", {
          className: "sortable-card card p-2 mb-2",
          text: item.text,
          attrs: {
            draggable: "true",
            "data-item-id": item.id,
            "data-section-id": section.id,
            tabindex: "0",
            role: "button",
            "aria-label": `${item.text}. Press Enter to move`
          }
        }));
      }
      const targetColumns = element(document, "div", { className: "row g-3" });
      for (const category of section.categories) {
        const target = element(document, "div", {
          className: "card-sort-target border p-3 rounded min-vh-25",
          attrs: { "data-category-id": category.id, "data-limit": category.limit }
        });
        const heading = element(document, "h4", { className: "h5" });
        heading.append(
          document.createTextNode(`${category.title} `),
          element(document, "span", { className: "badge bg-secondary fw-normal", text: `${category.limit === null ? "∞" : category.limit} items` })
        );
        target.append(heading);
        targetColumns.append(element(document, "div", { className: "col-12", children: [target] }));
      }
      const board = element(document, "div", {
        className: "row g-3",
        children: [source, element(document, "div", { className: "col-12 col-md-8 card-sort-targets", children: [targetColumns] })]
      });
      form.append(element(document, "section", {
        className: "card-sort-section mb-5",
        children: [
          element(document, "h3", { text: section.title }),
          element(document, "p", { className: "text-muted", text: section.instructions || "" }),
          board
        ]
      }));
    }
  }

  function renderAssessment(assessmentId) {
    clearRoot();
    updateNav("assessments");
    const assessment = state.get().assessments[assessmentId];
    if (!assessment) {
      appRoot.append(element(document, "p", { attrs: { role: "alert" }, text: "Assessment not found." }));
      return;
    }
    const form = element(document, "form", { attrs: { "data-assessment-form": assessmentId } });
    if ((assessment.interactionType || "likertScale") === "cardSort") renderCardSort(form, assessment);
    else renderLikert(form, assessment);
    const footer = element(document, "div", { className: "mt-4 d-flex justify-content-between" });
    footer.append(
      button(document, {
        className: "btn btn-secondary",
        text: ` ${selectors.getString("backToList")}`,
        glyph: "⬅️",
        attrs: { "data-nav": "assessments" }
      }),
      button(document, {
        className: "btn btn-primary",
        text: `${selectors.getString("submitAnswers")} `,
        glyph: "✔️",
        attrs: { type: "submit" }
      })
    );
    form.append(footer);
    appRoot.append(element(document, "section", {
      className: "assessment-taker-container",
      children: [
        element(document, "h2", { text: assessment.title }),
        element(document, "p", { className: "lead text-muted", text: assessment.instructions }),
        element(document, "hr", { className: "my-4" }),
        form
      ]
    }));
  }

  function renderResults(assessmentId) {
    clearRoot();
    updateNav("assessments");
    const results = state.get().userResults[assessmentId];
    if (!results) {
      appRoot.append(element(document, "p", { attrs: { role: "alert" }, text: "Results not found." }));
      return;
    }
    const headerText = element(document, "div", {
      children: [
        element(document, "h2", { text: `${selectors.getString("resultsTitle")} ${results.assessmentTitle}` }),
        element(document, "p", { className: "text-muted mb-0", text: `Completed on: ${new Date(results.timestamp).toLocaleDateString()}` })
      ]
    });
    const header = element(document, "header", { className: "results-header d-flex justify-content-between align-items-center" });
    header.append(
      headerText,
      button(document, {
        className: "btn btn-outline-secondary",
        text: selectors.getString("backToList"),
        glyph: "⬅️",
        attrs: { "data-nav": "assessments" }
      })
    );
    appRoot.append(header, element(document, "hr"));
    const primary = results.scores.filter((score) => score.type === "primary" && typeof score.value === "number");
    if (primary.length > 1 && chartCtor) {
      const canvas = element(document, "canvas", {
        attrs: { role: "img", "aria-label": "Radar chart displaying your assessment scores across different dimensions." }
      });
      appRoot.append(element(document, "div", { className: "results-chart-container", children: [canvas] }));
      new chartCtor(canvas, {
        type: "radar",
        data: {
          labels: primary.map((score) => score.title),
          datasets: [{
            label: "Your Scores",
            data: primary.map((score) => score.value),
            backgroundColor: "rgba(74, 144, 226, 0.2)",
            borderColor: "rgba(74, 144, 226, 1)",
            pointBackgroundColor: "rgba(74, 144, 226, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(74, 144, 226, 1)",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { r: { angleLines: { display: false }, suggestedMin: 1, suggestedMax: 5, pointLabels: { font: { size: 14 } } } }
        }
      });
    }
    for (const score of results.scores) {
      if (typeof score.value === "string" && score.value.includes("Error")) continue;
      const value = typeof score.value === "number" ? score.value.toFixed(2) : String(score.value);
      const body = element(document, "div", { className: "card-body" });
      body.append(
        element(document, "h3", { className: "card-title h5", text: score.title }),
        append(
          element(document, "p", { className: "card-subtitle mb-2 text-muted" }),
          element(document, "strong", { text: "Your Result:" }),
          document.createTextNode(` ${value}`)
        ),
        element(document, "p", { className: "card-text", text: String(score.interpretation) })
      );
      appRoot.append(element(document, "article", { className: "card", children: [body] }));
    }
  }

  function dataManagementPanel() {
    const body = element(document, "div", { className: "card-body d-flex gap-2 flex-wrap" });
    body.append(
      button(document, { className: "btn btn-primary", text: selectors.getString("exportData"), glyph: "📥", attrs: { "data-command": "export-data" } }),
      button(document, { className: "btn btn-outline-primary", text: selectors.getString("importData"), glyph: "📤", attrs: { "data-command": "choose-import" } }),
      element(document, "input", {
        className: "visually-hidden",
        attrs: { type: "file", id: "import-file", accept: ".json", "aria-label": "Import Data File", "data-command": "import-file" }
      }),
      button(document, { className: "btn btn-outline-danger ms-auto", text: selectors.getString("resetData"), glyph: "🗑️", attrs: { "data-command": "reset-data" } })
    );
    return element(document, "section", {
      className: "card mb-3",
      children: [
        append(element(document, "h3", { className: "card-header bg-light h6" }), icon(document, "💾"), document.createTextNode("Data Management")),
        body
      ]
    });
  }

  function debugPanel() {
    const stateOutput = element(document, "code", { attrs: { id: "debug-state-display" } });
    const logOutput = element(document, "code", { attrs: { id: "debug-log-display" } });
    const update = (current) => {
      stateOutput.textContent = JSON.stringify(current, null, 2);
      logOutput.textContent = (current.debugLog || []).map((entry) => `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`).join("\n");
    };
    update(state.get());
    subscriptions.add(state.subscribe(update));
    const commands = element(document, "div", { className: "d-flex gap-2 flex-wrap mb-3" });
    for (const [action, label, className] of [
      ["force-reload", "Force Content Reload", "btn-info"],
      ["fill-random", "Fill Assessments (Random)", "btn-warning"],
      ["clear-state", "Clear State (DB)", "btn-danger"],
      ["toast-success", "Test Toast (Success)", "btn-outline-success"],
      ["toast-danger", "Test Toast (Danger)", "btn-outline-danger"]
    ]) commands.append(button(document, { className: `btn btn-sm ${className}`, text: label, attrs: { "data-debug-action": action } }));
    const body = element(document, "div", {
      className: "card-body",
      children: [
        commands,
        element(document, "h4", { className: "h6", text: "Live State:" }),
        element(document, "pre", { className: "debug-state-output", children: [stateOutput] }),
        element(document, "h4", { className: "h6", text: "Log Viewer:" }),
        element(document, "pre", { className: "debug-log-output", children: [logOutput] })
      ]
    });
    return element(document, "section", {
      className: "card border-warning",
      children: [
        element(document, "div", {
          className: "card-header bg-warning-subtle",
          children: [element(document, "a", {
            className: "btn btn-sm btn-outline-dark w-100",
            text: "🐞 Toggle Debug Panel",
            attrs: { "data-bs-toggle": "collapse", href: "#debug-collapse", role: "button", "aria-expanded": "false", "aria-controls": "debug-collapse" }
          })]
        }),
        element(document, "div", { className: "collapse", attrs: { id: "debug-collapse" }, children: [body] })
      ]
    });
  }

  function renderSettings() {
    clearRoot();
    updateNav("settings");
    appRoot.append(
      append(element(document, "h2"), icon(document, "⚙️"), document.createTextNode(selectors.getString("settingsTitle"))),
      dataManagementPanel()
    );
    if (config.featureFlags.enableDebugPanel) appRoot.append(debugPanel());
  }

  function showLoader() {
    document.getElementById("loader-overlay").classList.remove("is-hidden");
  }

  function hideLoader() {
    document.getElementById("loader-overlay").classList.add("is-hidden");
  }

  function showToast(message, type = "info") {
    const toast = element(document, "div", {
      className: `toast align-items-center text-bg-${type} border-0`,
      attrs: { role: "alert", "aria-live": "assertive", "aria-atomic": "true" }
    });
    const row = element(document, "div", { className: "d-flex" });
    row.append(
      element(document, "div", { className: "toast-body", text: message }),
      button(document, { className: "btn-close btn-close-white me-2 m-auto", text: "", attrs: { "data-bs-dismiss": "toast", "aria-label": "Close" } })
    );
    toast.append(row);
    document.getElementById("toast-container").append(toast);
    if (bootstrap?.Toast) {
      const instance = new bootstrap.Toast(toast, { delay: 5000 });
      instance.show();
      toast.addEventListener("hidden.bs.toast", () => toast.remove(), { once: true });
    } else {
      toast.classList.add("show");
    }
    return toast;
  }

  return Object.freeze({
    hideLoader,
    renderAssessment,
    renderAssessments,
    renderDashboard,
    renderResults,
    renderSettings,
    showLoader,
    showToast
  });
}
