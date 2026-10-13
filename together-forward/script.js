"use strict";
const copy = JSON.parse(document.getElementById('demo-copy').textContent);
const menu = document.querySelector('.menu-button');
const nav = document.getElementById('nav');
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
let frequency = 'once';
const amount = document.getElementById('gift-amount');
document.querySelectorAll('[data-frequency]').forEach(button => button.addEventListener('click', () => { frequency = button.dataset.frequency; document.querySelectorAll('[data-frequency]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); }));
const updateAmounts = () => document.querySelectorAll('[data-amount]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.amount) === Number(amount.value))));
document.querySelectorAll('[data-amount]').forEach(button => button.addEventListener('click', () => { amount.value = button.dataset.amount; updateAmounts(); }));
amount.addEventListener('input', updateAmounts);
const dialog = document.getElementById('preview-dialog');
function showPreview(message) { document.getElementById('dialog-message').textContent = message; dialog.showModal(); }
document.getElementById('gift-form').addEventListener('submit', e => { e.preventDefault(); showPreview(copy.giftmessage.replace('{amount}', Number(amount.value).toFixed(2)).replace('{frequency}', copy[frequency])); });
document.getElementById('volunteer-form').addEventListener('submit', e => { e.preventDefault(); showPreview(copy.volmessage.replace('{interest}', document.getElementById('interest').value).replace('{availability}', document.getElementById('availability').value)); });

document.querySelectorAll('[data-demo-message]').forEach(button => button.addEventListener('click', () => showPreview(button.dataset.demoMessage)));
document.getElementById('support-form').addEventListener('submit', e => { e.preventDefault(); showPreview(copy.supportmessage.replace('{program}', document.getElementById('support-program').value).replace('{preference}', document.getElementById('support-preference').value)); });
document.getElementById('newsletter-form').addEventListener('submit', e => { e.preventDefault(); showPreview(copy.newslettermessage); e.currentTarget.reset(); });
