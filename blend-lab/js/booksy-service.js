/* The Blend Lab: service selection on the site + official Booksy widget.
 * Booksy's supplied widget does not expose a documented service-preselect API.
 * We intentionally avoid trying to manipulate the cross-origin Booksy iframe.
 */
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector("[data-booksy-panel]");
  if (!panel) return;
  const selectedName = panel.querySelector("[data-selected-service]");
  const selectedPrice = panel.querySelector("[data-selected-price]");
  const status = panel.querySelector("[data-booksy-status]");
  const serviceLinks = document.querySelectorAll(".service-card [data-service]");
  const isEs = document.documentElement.lang.toLowerCase().startsWith("es");
  const labels = new Map();
  serviceLinks.forEach(link => {
    const card = link.closest(".service-card");
    const name = card?.querySelector("h3")?.textContent.trim() || "";
    const price = card?.querySelector(".service-price")?.textContent.trim() || "";
    labels.set(link.dataset.service, {name,price});
    link.addEventListener("click", () => select(link.dataset.service));
  });
  function select(key) {
    const entry = labels.get(key);
    if (!entry) return;
    selectedName.textContent = entry.name;
    selectedPrice.textContent = entry.price;
    panel.classList.add("service-selected");
    serviceLinks.forEach(link => {
      const active = link.dataset.service === key;
      link.closest(".service-card")?.classList.toggle("service-is-selected", active);
      link.setAttribute("aria-label", (isEs ? "Reservar " : "Book ") + (labels.get(link.dataset.service)?.name || ""));
    });
    status.textContent = isEs
      ? "Has elegido " + entry.name + ". Usa el botón de Booksy para continuar y confirma el servicio allí."
      : "You selected " + entry.name + ". Continue with Booksy and confirm this service during checkout.";
    try { history.replaceState(null, "", "#booking"); } catch (_) {}
  }
  const initial = new URLSearchParams(location.search).get("service");
  if (initial && labels.has(initial)) select(initial);
});
