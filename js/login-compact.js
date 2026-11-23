/* Progressive enhancement: choice-first card with functional Firebase email login. */
(() => {
 const page=document.querySelector('.bam-login-refresh');
 const access=document.getElementById('bam-auth-access');
 const back=document.getElementById('bam-auth-back');
 const email=document.getElementById('login-email');
 const alert=document.getElementById('login-alert');
 if(!page||!access||!back||!email) return;
 const requested=new URLSearchParams(location.search);
 // Preserve verification/error information that auth.js puts inside the login alert.
 const showLogin=()=>{page.classList.remove('bam-choice-mode');access.setAttribute('aria-expanded','true');email.focus();};
 const showChoice=()=>{page.classList.add('bam-choice-mode');access.setAttribute('aria-expanded','false');access.focus();};
 access.addEventListener('click',showLogin);
 back.addEventListener('click',showChoice);
 if(requested.has('verify')||requested.has('email')||location.hash==='#signin') showLogin();
 else {page.classList.add('bam-choice-mode');access.setAttribute('aria-expanded','false');}
 if(alert) new MutationObserver(()=>{if(!alert.hidden&&alert.textContent.trim())page.classList.remove('bam-choice-mode');}).observe(alert,{attributes:true,childList:true,subtree:true});
})();
