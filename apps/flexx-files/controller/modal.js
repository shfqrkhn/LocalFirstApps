export const STRENGTH_MODAL_VERSION = "1.0.0";

export function createStrengthModal({ documentRef = globalThis.document, logger, announce } = {}) {
  return {
    el: documentRef?.getElementById("modal-layer"),
    title: documentRef?.getElementById("modal-title"),
    body: documentRef?.getElementById("modal-body"),
    actions: documentRef?.getElementById("modal-actions"),
    resolve: null,
    previousFocus: null,

    show(options = {}) {
      return new Promise(resolve => {
        this.previousFocus = documentRef?.activeElement || null;
        if (!this.el || !this.title || !this.body || !this.actions) {
          logger?.error?.("Modal elements not found in DOM");
          announce?.(options.text || options.title || "Notice", options.type === "confirm" ? "assertive" : "polite");
          resolve(options.type === "confirm" ? false : true);
          return;
        }

        this.resolve = resolve;
        this.title.innerText = options.title || "Notice";
        this.body.innerText = options.text || "";
        this.actions.innerHTML = "";

        if (options.type === "confirm") {
          const cancel = documentRef.createElement("button");
          cancel.className = "btn-modal btn-ghost";
          cancel.innerText = "Cancel";
          cancel.setAttribute("aria-label", "Cancel and close dialog");
          cancel.onclick = () => this.close(false);
          this.actions.appendChild(cancel);
        }

        const ok = documentRef.createElement("button");
        ok.className = options.danger ? "btn-modal btn-danger" : "btn-modal btn-confirm";
        ok.innerText = options.okText || "OK";
        ok.setAttribute("aria-label", options.okText ? `${options.okText} and close dialog` : "Confirm and close dialog");
        ok.onclick = () => this.close(true);
        this.actions.appendChild(ok);
        this.el.classList.add("active");
        this.el.setAttribute("aria-hidden", "false");
        ok.focus();
      });
    },

    close(result) {
      if (!this.el) {
        logger?.error?.("Modal element not found");
        this.resolve?.(result);
        this.previousFocus?.focus?.();
        return;
      }
      this.el.classList.remove("active");
      this.el.setAttribute("aria-hidden", "true");
      this.resolve?.(result);
      this.resolve = null;
      this.previousFocus?.focus?.();
      this.previousFocus = null;
    }
  };
}
