const destination = new URL("../commonground/?migrate=ledger-suite", location.href).href;

async function retire() {
  const status = document.querySelector("#redirect-status");
  try {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await registration.update();
      await navigator.serviceWorker.ready;
    }
    status.textContent = "Opening CommonGround migration…";
    location.replace(destination);
  } catch {
    status.textContent = "Automatic redirect was unavailable. Use the link below; your data is unchanged.";
  }
}

retire();
