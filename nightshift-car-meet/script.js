const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');
function closeMenu() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});
const form = document.querySelector('#rsvp-form');
const meet = document.querySelector('#meet');
const status = document.querySelector('#rsvp-status');
document.querySelectorAll('[data-event]').forEach(link => {
  link.addEventListener('click', () => {
    meet.value = link.dataset.event;
    status.textContent = '';
  });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  status.textContent = `RSVP preview ready for ${meet.value}. This is a demo: no details were sent or stored, and no space was reserved.`;
});
form.addEventListener('input', () => { status.textContent = ''; });
