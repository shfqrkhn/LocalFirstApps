export const STRENGTH_TIMER_VERSION = "1.0.0";

export function createStrengthTimer({
  defaultSeconds,
  now = () => Date.now(),
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  getElementById = id => globalThis.document?.getElementById(id),
  onComplete = () => {},
  onError = () => {}
}) {
  if (!Number.isFinite(defaultSeconds) || defaultSeconds < 0) throw new TypeError("defaultSeconds must be non-negative");

  const timer = {
    interval: null,
    endTime: null,

    start(seconds = defaultSeconds) {
      if (this.interval) clearIntervalFn(this.interval);
      this.endTime = now() + (seconds * 1000);
      const dock = getElementById("timer-dock");
      if (!dock) {
        onError("Timer dock element not found");
        this.endTime = null;
        return false;
      }
      dock.classList.add("active");
      this.tick();
      if (this.endTime !== null) this.interval = setIntervalFn(() => this.tick(), 1000);
      return true;
    },

    tick() {
      if (this.endTime === null) return 0;
      const remaining = Math.ceil((this.endTime - now()) / 1000);
      if (remaining <= 0) {
        this.stop();
        onComplete();
        return 0;
      }
      const value = getElementById("timer-val");
      if (!value) {
        onError("Timer value element not found");
        this.stop();
        return 0;
      }
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      value.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      return remaining;
    },

    stop() {
      if (this.interval) clearIntervalFn(this.interval);
      this.interval = null;
      this.endTime = null;

      const value = getElementById("timer-val");
      if (value) {
        const minutes = Math.floor(defaultSeconds / 60);
        const seconds = defaultSeconds % 60;
        value.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
      getElementById("timer-dock")?.classList.remove("active");
    }
  };

  return timer;
}
