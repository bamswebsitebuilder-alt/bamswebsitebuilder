const toggle=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('details[open]').forEach(d=>d.open=false);if(toggle.getAttribute('aria-expanded')==='true'){toggle.setAttribute('aria-expanded','false');navigation.classList.remove('open');toggle.focus();}}});
document.addEventListener('click',event=>{const more=document.querySelector('.more-menu');if(!more.contains(event.target))more.open=false;});
