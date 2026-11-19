import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, reload, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { addDoc, collection, onSnapshot, serverTimestamp, updateDoc, doc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const form = document.getElementById("crm-lead-form");
const list = document.getElementById("crm-lead-list");
const status = document.getElementById("crm-lead-status");
let stop = null;
let authRevision = 0;
const stages = ["new", "contacted", "quoted", "won", "lost"];
const setStatus = message => { if (status) status.textContent = message; };
const el = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
function render(snapshot) {
  if (!list) return;
  list.replaceChildren();
  if (snapshot.empty) { list.append(el("p", "No leads yet. Add your first prospect above.")); setStatus("CRM ready."); return; }
  setStatus("CRM ready. " + snapshot.size + " lead(s) loaded.");
  snapshot.forEach(item => {
    const lead = item.data();
    const card = document.createElement("article");
    card.className = "admin-card";
    card.style.marginBottom = "12px";
    const heading = el("h3", lead.name || "Unnamed lead");
    const details = el("p", [lead.business, lead.email, lead.phone].filter(Boolean).join(" • "));
    const notes = el("p", lead.notes || "");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Sales stage for " + (lead.name || "lead"));
    stages.forEach(stage => { const option = document.createElement("option"); option.value = stage; option.textContent = stage[0].toUpperCase() + stage.slice(1); select.append(option); });
    select.value = stages.includes(lead.stage) ? lead.stage : "new";
    select.addEventListener("change", async () => {
      const previousStage = lead.stage;
      select.disabled = true;
      try { await updateDoc(doc(db, "crmLeads", item.id), { stage: select.value, updatedAt: serverTimestamp() }); setStatus("Lead updated."); }
      catch (error) { console.error(error); select.value = previousStage; setStatus("Could not update lead. Check permissions."); }
      finally { select.disabled = false; }
    });
    card.append(heading, details, notes, select);
    list.append(card);
  });
}
onAuthStateChanged(auth, async user => {
  const revision = ++authRevision;
  if (!form || !list) return;
  if (stop) { stop(); stop = null; }
  if (!user) { form.hidden = true; list.replaceChildren(); setStatus("Sign in to access CRM leads."); return; }
  try { await reload(user); await user.getIdToken(true); } catch (error) { console.warn("Could not refresh CRM session", error); }
  if (revision !== authRevision) return;
  if (!auth.currentUser?.emailVerified) { form.hidden = true; list.replaceChildren(); setStatus("Verify your email address to access CRM leads."); return; }
  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    if (revision !== authRevision || auth.currentUser?.uid !== user.uid) return;
    if (profile.data()?.role !== "admin") { form.hidden = true; list.replaceChildren(); setStatus("Your account does not have CRM administrator access."); return; }
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
