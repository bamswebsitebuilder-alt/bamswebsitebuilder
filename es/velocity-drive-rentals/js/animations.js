"use strict";
document.addEventListener("DOMContentLoaded",()=>{
 const candidates=document.querySelectorAll("main section, body > section, .home-card, .service-card, .price-card, .portfolio-card, .review-summary-card, .portal-card, .admin-card, .admin-stat-card");
 candidates.forEach((el,i)=>{if(!el.hasAttribute("data-reveal")){el.setAttribute("data-reveal","");el.setAttribute("data-reveal-delay",String(i%4));}});
 if("IntersectionObserver" in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-visible");io.unobserve(e.target);}}),{threshold:.12,rootMargin:"0px 0px -50px"});candidates.forEach(el=>io.observe(el));}else{candidates.forEach(el=>el.classList.add("is-visible"));}
});
