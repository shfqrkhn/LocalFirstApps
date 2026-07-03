(() => {
  document.documentElement.classList.add("lfa-suite-page");
  if (window.location.protocol === "file:") {
    document.documentElement.classList.add("lfa-file-mode");
  }
})();
