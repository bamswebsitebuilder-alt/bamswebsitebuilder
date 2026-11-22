/* Blend Lab Booksy launcher.
 * A published Booksy widget implementation creates:
 * .booksy-widget-container > .booksy-widget-button
 * and registers a click handler on that element.
 * Keep the native Booksy control visible as a fallback if Booksy changes.
 * There is no supported service-preselection API for its cross-origin booking flow.
 */
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector("[data-booksy-panel]");
  if (!panel) return;
  const status = panel.querySelector("[data-booksy-status]");
  const selectedName = panel.querySelector("[data-selected-service]");
  const selectedPrice = panel.querySelector("[data-selected-price]");
  const booksySlot = panel.querySelector("#booksy-booking-widget");
  const serviceButtons = [...document.querySelectorAll(".service-card [data-service]")];
  const launchButtons = [...document.querySelectorAll("[data-open-booksy]")];
  const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");
  const services = new Map();

  const setStatus = message => { if (status) status.textContent = message; };
  const widgetButton = () => booksySlot?.querySelector(".booksy-widget-container .booksy-widget-button");
  const openBooksy = () => {
    const realButton = widgetButton();
    if (realButton) {
      realButton.click();
      return true;
    }
    // Booksy script may be blocked or still loading. Never present success falsely.
    panel.scrollIntoView({behavior:"smooth",block:"center"});
    setStatus(isSpanish
      ? "Booksy todavía no está disponible. Usa el botón de Booksy debajo o vuelve a intentarlo."
      : "Booksy is not ready. Use the Booksy button below or try again.");
    return false;
  };

  function selectService(key) {
    const service = services.get(key);
    if (!service) return;
    if (selectedName) selectedName.textContent = service.name;
    if (selectedPrice) selectedPrice.textContent = service.price;
    panel.classList.add("service-selected");
    serviceButtons.forEach(button => {
      button.closest(".service-card")?.classList.toggle("service-is-selected", button.dataset.service===key);
    });
    setStatus(isSpanish
      ? "Elegiste "+service.name+". Confirma este servicio en Booksy."
      : "You chose "+service.name+". Confirm this service inside Booksy.");
  }

  serviceButtons.forEach(button => {
    const card = button.closest(".service-card");
    services.set(button.dataset.service,{
      name:card?.querySelector("h3")?.textContent.trim()||"",
      price:card?.querySelector(".service-price")?.textContent.trim()||""
    });
    button.addEventListener("click", event => {
      event.preventDefault();
      selectService(button.dataset.service);
      openBooksy();
    });
  });
  launchButtons.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      openBooksy();
    });
  });
  const initial = new URLSearchParams(location.search).get("service");
  if (initial && services.has(initial)) selectService(initial);
});
