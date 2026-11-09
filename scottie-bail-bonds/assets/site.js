const toggle=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('details[open]').forEach(d=>d.open=false);if(toggle.getAttribute('aria-expanded')==='true'){toggle.setAttribute('aria-expanded','false');navigation.classList.remove('open');toggle.focus();}}});
document.addEventListener('click',event=>{const more=document.querySelector('.more-menu');if(!more.contains(event.target))more.open=false;});

// Show the agency introduction once per tab session, including direct page visits.
(() => {
  const key = 'scottie-call-popup-v1';
  const logoUrl = new URL('scottie-bonding-agency.webp', document.currentScript.src).href;
  try { if (sessionStorage.getItem(key)) return; } catch (_) {}
  const popup = document.createElement('dialog');
  popup.className = 'scottie-popup';
  popup.setAttribute('aria-labelledby', 'scottie-popup-title');
  popup.setAttribute('aria-describedby', 'scottie-popup-description');
  popup.innerHTML = `
    <button class="popup-close" type="button" aria-label="Close popup" autofocus>×</button>
    <div class="popup-grid">
      <div class="popup-poster">
        <p class="popup-kicker">SCOTTIE BONDING AGENCY</p>
        <p class="popup-headline">Stuck<br>in jail?</p>
        <p class="popup-script">We’re here to help.</p>
        <img src="${logoUrl}" width="1280" height="1280" alt="Scottie Bonding Agency logo">
        <p class="popup-poster-footer">PINELLAS COUNTY · 35+ YEARS</p>
      </div>
      <div class="popup-copy">
        <p class="eyebrow">AVAILABLE 24 HOURS · 7 DAYS A WEEK</p>
        <h2 id="scottie-popup-title">A difficult moment.<br>A personal conversation.</h2>
        <p id="scottie-popup-description">Call Scottie Bonding Agency for bail bond assistance in Pinellas County. We’re here to help you understand the next step.</p>
        <a class="button popup-call" href="tel:+17273231110">Call now <span aria-hidden="true">↗</span></a>
        <a class="popup-number" href="tel:+17273231110">(727) 323-1110</a>
      </div>
    </div>`;
  document.body.append(popup);
  let previousFocus;
  let previousOverflow;
  const close = () => popup.close();
  popup.querySelector('.popup-close').addEventListener('click', close);
  popup.addEventListener('click', event => {
    const bounds = popup.getBoundingClientRect();
    if (event.target === popup && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
  });
  popup.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  });
  const show = () => {
    if (document.visibilityState !== 'visible') return;
    if (typeof popup.showModal !== 'function') return;
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    popup.showModal();
    document.body.style.overflow = 'hidden';
    try { sessionStorage.setItem(key, 'shown'); } catch (_) {}
    document.removeEventListener('visibilitychange', show);
  };
  window.setTimeout(() => {
    if (document.visibilityState === 'visible') show();
    else document.addEventListener('visibilitychange', show);
  }, 900);
})();
