import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, reload } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { addDoc, collection, onSnapshot, serverTimestamp, updateDoc, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const form = document.getElementById("crm-lead-form");
const list = document.getElementById("crm-lead-list");
const status = document.getElementById("crm-lead-status");
let stop = null;
let authRevision = 0;
const stages = ["new", "contacted", "quoted", "won", "lost"];
const setStatus = message => { if (status) status.textContent = message; };
const el = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };

const input = (name, label, value, type = "text", max = null) => {
  const wrap = document.createElement("label");
  wrap.className = "crm-edit-field";
  wrap.append(el("span", label));
  const field = document.createElement(name === "notes" ? "textarea" : "input");
  field.name = name;
  if (field.tagName === "INPUT") field.type = type;
  if (max !== null) field.maxLength = max;
  field.value = value || "";
  wrap.append(field);
  return wrap;
};
const errorText = error => error.code === "permission-denied"
  ? "Permission denied. Publish the updated CRM Firestore rules before editing leads."
  : "Could not update lead (" + (error.code || "unknown") + ").";

function render(snapshot) {
  if (!list) return;
  list.replaceChildren();
  if (snapshot.empty) {
    list.append(el("p", "No leads yet. Add your first prospect above."));
    setStatus("CRM ready.");
    return;
  }
  setStatus("CRM ready. " + snapshot.size + " lead(s) loaded.");
  document.dispatchEvent(new CustomEvent("bam:crm-overview", { detail: { leads: snapshot.docs.map(item => ({ id: item.id, ...item.data() })) } }));
  snapshot.forEach(item => {
    const lead = item.data();
    const card = document.createElement("article");
    card.className = "admin-card crm-lead-card";
    const heading = el("h3", lead.name || "Unnamed lead");
    const details = el("p", [lead.business, lead.email, lead.phone].filter(Boolean).join(" • "));
    const estimate = Number.isInteger(lead.estimateCents) ? (lead.estimateCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "Not set";
    const info = el("p", "Follow-up: " + (lead.followUpDate || "Not scheduled") + " • Estimate: " + estimate);
    const notes = el("p", lead.notes || "");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Sales stage for " + (lead.name || "lead"));
    stages.forEach(stage => {
      const option = document.createElement("option");
      option.value = stage;
      option.textContent = stage[0].toUpperCase() + stage.slice(1);
      select.append(option);
    });
    select.value = stages.includes(lead.stage) ? lead.stage : "new";
    select.addEventListener("change", async () => {
      const previousStage = lead.stage;
      select.disabled = true;
      try {
        await updateDoc(doc(db, "crmLeads", item.id), { stage: select.value, updatedAt: serverTimestamp() });
        setStatus(select.value === "won" ? "Marked Won. Create a client portal account separately when ready." : "Sales stage updated.");
      } catch (error) {
        console.error(error);
        select.value = previousStage;
        setStatus(errorText(error));
      } finally { select.disabled = false; }
    });

    const edit = document.createElement("details");
    edit.className = "crm-lead-edit";
    edit.append(el("summary", "Edit contact, follow-up & estimate"));
    const editForm = document.createElement("form");
    editForm.className = "crm-edit-form";
    const fields = [
      input("name", "Name", lead.name, "text", 120),
      input("email", "Email", lead.email, "email", 254),
      input("business", "Business", lead.business, "text", 150),
      input("phone", "Phone", lead.phone, "tel", 40),
      input("notes", "Notes", lead.notes, "text", 2000),
      input("followUpDate", "Follow-up date", lead.followUpDate, "date"),
      input("estimate", "Estimate (USD)", Number.isInteger(lead.estimateCents) ? (lead.estimateCents / 100).toFixed(2) : "", "number")
    ];
    fields.forEach(field => editForm.append(field));
    const amountField = editForm.elements.namedItem("estimate");
    amountField.min = "0";
    amountField.max = "1000000";
    amountField.step = "0.01";
    const save = el("button", "Save changes");
    save.type = "submit";
    save.className = "admin-primary-button";
    editForm.append(save);
    editForm.addEventListener("submit", async event => {
      event.preventDefault();
      const val = key => editForm.elements.namedItem(key).value.trim();
      if (!val("name") || !val("email")) { setStatus("Name and email are required."); return; }
      const rawAmount = val("estimate");
      const amount = rawAmount ? Number(rawAmount) : null;
      if (rawAmount && (!Number.isFinite(amount) || amount < 0 || amount > 1000000 || !/^\d+(?:\.\d{1,2})?$/.test(rawAmount))) {
        setStatus("Enter a valid estimate in USD with up to two decimal places."); return;
      }
      const updates = {
        name: val("name"), email: val("email"), business: val("business"),
        phone: val("phone"), notes: val("notes"),
        followUpDate: val("followUpDate"), updatedAt: serverTimestamp()
      };
      if (rawAmount) updates.estimateCents = Math.round(amount * 100);
      else if ("estimateCents" in lead) updates.estimateCents = 0;
      save.disabled = true;
      try {
        await updateDoc(doc(db, "crmLeads", item.id), updates);
        setStatus("Lead changes saved.");
        edit.open = false;
      } catch (error) { console.error(error); setStatus(errorText(error)); }
      finally { save.disabled = false; }
    });
    edit.append(editForm);
    card.append(heading, details, info, notes, select, edit);
    list.append(card);
  });
}

onAuthStateChanged(auth, async user => {
  const revision = ++authRevision;
  if (!form || !list) return;
  if (stop) { stop(); stop = null; }
  if (!user) { form.hidden = true; list.replaceChildren(); document.dispatchEvent(new CustomEvent("bam:crm-overview", { detail: { leads: [] } })); setStatus("Sign in to access CRM leads."); return; }
  try { await reload(user); await user.getIdToken(true); } catch (error) { console.warn("Could not refresh CRM session", error); }
  if (revision !== authRevision) return;
  if (!auth.currentUser?.emailVerified) { form.hidden = true; list.replaceChildren(); setStatus("Verify your email address to access CRM leads."); return; }
  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    if (revision !== authRevision || auth.currentUser?.uid !== user.uid) return;
    if (profile.data()?.role !== "admin") { form.hidden = true; list.replaceChildren(); document.dispatchEvent(new CustomEvent("bam:crm-overview", { detail: { leads: [] } })); setStatus("Your account does not have CRM administrator access."); return; }
    form.hidden = false;
    setStatus("CRM access verified. Loading leads...");
    stop = onSnapshot(query(collection(db, "crmLeads"), orderBy("createdAt", "desc")), render, error => {
      console.error(error); setStatus(error.code === "permission-denied" ? "Firestore permission denied. The live CRM rules may not be deployed; ask an administrator to deploy them." : "Could not load CRM leads (" + (error.code || "unknown") + ").");
    });
  } catch (error) { if (revision !== authRevision) return; console.error(error); form.hidden = true; setStatus("CRM access could not be verified."); }
});
form?.addEventListener("submit", async event => {
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  const name = form.elements.namedItem("name").value.trim();
  const email = form.elements.namedItem("email").value.trim();
  if (!name || !email) { setStatus("Name and email are required."); return; }
  if (!auth.currentUser?.emailVerified || form.hidden) { setStatus("Administrator sign-in required."); return; }
  submit.disabled = true;
  try {
    await addDoc(collection(db, "crmLeads"), {
      name, email, business: form.elements.namedItem("business").value.trim(),
      phone: form.elements.namedItem("phone").value.trim(),
      notes: form.elements.namedItem("notes").value.trim(),
      source: "admin", stage: "new", createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    form.reset(); setStatus("Lead saved successfully.");
  } catch (error) { console.error(error); setStatus(error.code === "permission-denied" ? "Firestore permission denied. CRM rules may not be deployed to the live Firebase project." : "Could not save lead (" + (error.code || "unknown") + ")."); }
  finally { submit.disabled = false; }
});
