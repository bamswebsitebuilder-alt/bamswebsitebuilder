const watchClients = () => {
  const clientsQuery = collection(db, "users");

  return onSnapshot(
    clientsQuery,
    (snapshot) => {

      clientRecords = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((record) =>
          String(record.role || "").trim().toLowerCase() === "client"
        )
        .sort((a, b) => {

          const nameA =
            a.fullName ||
            a.email ||
            a.id;

          const nameB =
            b.fullName ||
            b.email ||
            b.id;

          return nameA.localeCompare(nameB);

        });

      renderClients();
      buildClientOptions();
      watchInvoices();
      watchProjects();
      renderInvoices();
      updateStats();
      rebuildActivity();

      if (firstInvoiceSnapshotLoaded) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();

            if (data.status === "paid") {
              notifyDevice(
                "Invoice paid",
                `${data.invoiceNumber || "Invoice"} was marked paid.`
              );
            }
          }
        });
      }

      firstInvoiceSnapshotLoaded = true;

      if (firstClientSnapshotLoaded) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {

            const data = change.doc.data();

            if (
              String(data.role || "").trim().toLowerCase() === "client"
            ) {
              notifyDevice(
                "New client registered",
                data.fullName || data.email || "A new client joined."
              );
            }
          }
        });
      }

      firstClientSnapshotLoaded = true;

    },
    (error) => {
      console.error("Unable to load clients:", error);

      clientList.innerHTML =
        `<p class="admin-status error">
          Clients could not be loaded.<br><br>
          ${error.message}
        </p>`;

      console.error(error);
    }
  );
};