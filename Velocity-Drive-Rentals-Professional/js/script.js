
const menuButton=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
if(menuButton&&nav){menuButton.addEventListener('click',()=>{nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',nav.classList.contains('open'))})}
const themeButton=document.querySelector('.theme-toggle');
if(themeButton){themeButton.addEventListener('click',()=>{document.body.classList.toggle('light');themeButton.textContent=document.body.classList.contains('light')?'☀':'☾'})}
document.querySelectorAll('[data-vehicle]').forEach(btn=>btn.addEventListener('click',()=>location.href='booking.html?vehicle='+encodeURIComponent(btn.dataset.vehicle)));
const vehicle=document.querySelector('#vehicle');
const query=new URLSearchParams(location.search);
if(vehicle&&query.get('vehicle')){[...vehicle.options].forEach(o=>o.selected=o.value===query.get('vehicle'))}
const bookingForm=document.querySelector('#booking-form');
if(bookingForm){bookingForm.addEventListener('submit',e=>{e.preventDefault();const selected=vehicle.selectedOptions[0];const rate=Number(selected.dataset.rate);const pickup=new Date(document.querySelector('#pickup').value);const returned=new Date(document.querySelector('#return').value);const days=Math.max(1,Math.ceil((returned-pickup)/86400000));const total=days*rate;const result=document.querySelector('#result');result.innerHTML=`<strong>${selected.value}</strong><br>${days} day(s) × $${rate}/day = <strong>$${total.toFixed(2)}</strong> before taxes, deposits, and optional protection.`;result.classList.remove('hidden')})}
