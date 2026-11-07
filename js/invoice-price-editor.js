// The caller saves only the amount on the existing, admin-protected invoice.
export function createInvoicePriceEditor(invoice, save, spanish = false) {
  const root = document.createElement("div");
  root.className = "invoice-price-editor";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "admin-small-button";
  edit.textContent = spanish ? "Editar precio" : "Edit price";
  edit.setAttribute("aria-expanded", "false");

  const form = document.createElement("form");
  form.hidden = true;
  form.className = "admin-field";
  const label = document.createElement("label");
  label.textContent = spanish ? "Importe de factura (USD)" : "Invoice amount (USD)";
  const amount = document.createElement("input");
  amount.type = "number";
  amount.min = "0.01";
  amount.step = "0.01";
  amount.required = true;
  amount.inputMode = "decimal";
  label.append(amount);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "admin-small-button";
  submit.textContent = spanish ? "Guardar" : "Save";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "admin-small-button";
  cancel.textContent = spanish ? "Cancelar" : "Cancel";
  const status = document.createElement("p");
  status.className = "admin-status";
  status.setAttribute("role", "status");
  let saving = false;
  let savedAmount = invoice.amount;
  function close() {
    form.hidden = true;
    edit.hidden = false;
    edit.setAttribute("aria-expanded", "false");
    edit.focus();
  }
  edit.addEventListener("click", () => {
    amount.value = String(savedAmount);
    status.textContent = "";
    form.hidden = false;
    edit.hidden = true;
    edit.setAttribute("aria-expanded", "true");
    amount.focus();
    amount.select();
  });
  cancel.addEventListener("click", close);
  form.addEventListener("keydown", event => {
    if (event.key === "Escape" && !saving) {
      event.preventDefault();
      close();
    }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (saving) return;
    const value = Number(amount.value);
    if (!form.reportValidity() || !Number.isFinite(value) || value <= 0) return;
    saving = true;
    amount.disabled = submit.disabled = cancel.disabled = true;
    status.textContent = spanish ? "Guardando…" : "Saving…";
    try {
      const price = Math.round(value * 100) / 100;
      await save(price);
      savedAmount = price;
      close();
      status.textContent = spanish ? "Precio guardado." : "Price saved.";
    } catch (error) {
      status.textContent = error.message || (spanish
        ? "No se pudo guardar. Inténtalo de nuevo."
        : "Could not save the price. Please try again.");
    } finally {
      saving = false;
      amount.disabled = submit.disabled = cancel.disabled = false;
    }
  });
  form.append(label, submit, cancel);
  root.append(edit, form, status);
  return root;
}
