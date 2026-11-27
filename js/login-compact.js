/* Keep account choices on the landing view and show the sign-in form on demand. */
(() => {
  const entry = document.getElementById('bam-auth-entry');
  const access = document.getElementById('bam-auth-access');
  const back = document.getElementById('bam-auth-back');
  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email');
  const params = new URLSearchParams(location.search);

  function setSignInVisible(visible) {
    form.hidden = !visible;
    entry.hidden = visible;
    access.setAttribute('aria-expanded', String(visible));
  }

  setSignInVisible(params.has('verify') || params.has('email') || location.hash === '#signin');
  back.hidden = false;
  access.addEventListener('click', () => {
    setSignInVisible(true);
    email.focus();
  });
  back.addEventListener('click', () => {
    setSignInVisible(false);
    access.focus();
  });
})();
