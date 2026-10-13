/* Keep the native FormSubmit delivery flow and recover after a failed navigation. */
(() => {
  const es = document.documentElement.lang.startsWith('es');
  document.querySelectorAll('form[action^="https://formsubmit.co/"]').forEach(form => {
    const button = form.querySelector('[type="submit"]');
    if (!button) return;
    const original = button.textContent;
    const status = document.createElement('p');
    status.className = 'inquiry-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    form.append(status);
    let resetTimer;
    const reset = () => { clearTimeout(resetTimer); button.disabled = false; button.textContent = original; delete form.dataset.sending; status.hidden = true; };
    form.addEventListener('submit', event => {
      if (form.dataset.sending === 'true') { event.preventDefault(); return; }
      if (!form.checkValidity()) return;
      form.dataset.sending = 'true';
      button.disabled = true;
      button.textContent = es ? 'Enviando…' : 'Sending…';
      status.textContent = es ? 'Estamos enviando tu solicitud. Conserva esta página abierta.' : 'Sending your request. Keep this page open.';
      status.hidden = false;
      resetTimer = setTimeout(() => {
        reset();
        status.textContent = es ? 'La entrega no se ha confirmado. Puedes intentarlo de nuevo o escribir a bamswebsitebuilder@gmail.com.' : 'Delivery has not been confirmed. You can try again or email bamswebsitebuilder@gmail.com.';
        status.hidden = false;
      }, 20000);
    });
    window.addEventListener('pageshow', reset);
  });
})();
