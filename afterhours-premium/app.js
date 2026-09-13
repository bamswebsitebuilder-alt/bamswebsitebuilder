'use strict';

const cart=[];
const count=document.querySelector('#cart-count');
const items=document.querySelector('#cart-items');
const total=document.querySelector('#cart-total');
const toast=document.querySelector('#toast');

function showToast(message){
  toast.textContent=message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer=window.setTimeout(()=>toast.classList.remove('show'),2200);
}

function renderCart(){
  count.textContent=String(cart.length);
  if(!cart.length){
    items.innerHTML='<p>Your cart is empty.</p>';
    total.textContent='$0.00';
    return;
  }
  items.innerHTML=cart.map((item,index)=>`<div class="cart-item"><span>${item.name}</span><span>$${item.price.toFixed(2)} <button type="button" data-remove="${index}" aria-label="Remove ${item.name}">Remove</button></span></div>`).join('');
  total.textContent=`$${cart.reduce((sum,item)=>sum+item.price,0).toFixed(2)}`;
  document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>{
    cart.splice(Number(button.dataset.remove),1);
    renderCart();
  }));
}

document.querySelectorAll('.add-cart').forEach(button=>button.addEventListener('click',()=>{
  cart.push({name:button.dataset.name,price:Number(button.dataset.price)});
  renderCart();
  showToast(`${button.dataset.name} added to cart`);
}));

document.querySelector('#checkout-button').addEventListener('click',()=>{
  if(!cart.length){showToast('Add an item before checkout.');return;}
  showToast('Demo checkout ready — connect a live payment provider for production.');
});

document.querySelector('#booking-form').addEventListener('submit',event=>{
  event.preventDefault();
  document.querySelector('#booking-status').textContent='Appointment request received for this demo.';
  event.currentTarget.reset();
});

document.querySelector('#contact-form').addEventListener('submit',event=>{
  event.preventDefault();
  document.querySelector('#contact-status').textContent='Message captured in the demo support form.';
  event.currentTarget.reset();
});

renderCart();
