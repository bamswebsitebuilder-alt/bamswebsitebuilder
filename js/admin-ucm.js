// BAM admin command-center widgets reuse CRM's authenticated snapshot.
// No separate Firestore listener or additional database permissions are needed.
const metrics = document.getElementById("stat-leads");
const recent = document.getElementById("overview-crm-leads");
const alerts = document.getElementById("overview-crm-alerts");
const entry = (tag, value, css) => {
  const node = document.createElement(tag);
  if (css) node.className = css;
  node.textContent = String(value ?? "");
  return node;
};
const dateToday = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const money = cents => Number.isInteger(cents) && cents >= 0
  ? (cents / 100).toLocaleString("en-US", {style:"currency", currency:"USD"})
  : "—";
const displayDate = iso => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
};
document.addEventListener("bam:crm-overview", event => {
  const leads = Array.isArray(event.detail?.leads) ? event.detail.leads : [];
  if (metrics) metrics.textContent = String(leads.filter(l => !["won","lost"].includes(l.stage)).length);
  if (recent) {
    recent.replaceChildren();
    if (!leads.length) {
      const tr = document.createElement("tr");
      const td = entry("td", "No leads yet. Add a prospect from CRM Leads.");
      td.colSpan = 4;
      tr.append(td); recent.append(tr);
    } else {
      leads.slice(0, 7).forEach(lead => {
        const tr = document.createElement("tr");
        const contact = document.createElement("td");
        contact.append(entry("strong", lead.name || "Unnamed lead"));
        if (lead.business) contact.append(entry("small", lead.business));
        const stage = document.createElement("td");
        const stageText = entry("span", (lead.stage || "new").replace(/^./, c => c.toUpperCase()), "bam-ucm-stage");
        stageText.dataset.stage = lead.stage || "new";
        stage.append(stageText);
        tr.append(contact, stage, entry("td", displayDate(lead.followUpDate)), entry("td", money(lead.estimateCents)));
        recent.append(tr);
      });
    }
  }
  if (alerts) {
    alerts.replaceChildren();
    const today = dateToday();
    const due = leads.filter(lead =>
      !["won","lost"].includes(lead.stage) &&
      /^\d{4}-\d{2}-\d{2}$/.test(lead.followUpDate || "") &&
      lead.followUpDate <= today
    ).sort((a,b) => a.followUpDate.localeCompare(b.followUpDate));
    if (!due.length) {
      alerts.append(entry("p","No overdue follow-ups. You're all caught up.", "bam-ucm-alert-empty"));
    } else {
      due.slice(0,5).forEach(lead => {
        const row = document.createElement("div");
        row.className = "bam-ucm-alert";
        row.append(entry("span", "●", "bam-ucm-alert-mark"));
        const copy = document.createElement("div");
        copy.append(entry("strong", lead.name || lead.business || "Lead"));
        copy.append(entry("p", (lead.followUpDate < today ? "Overdue since " : "Due today: ") + displayDate(lead.followUpDate) + (lead.business ? " · " + lead.business : "")));
        row.append(copy); alerts.append(row);
      });
    }
  }
});
