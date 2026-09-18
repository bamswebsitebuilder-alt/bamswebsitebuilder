(function(){
  function hideLoader(){
    var loader=document.getElementById('bam-loader');
    if(!loader)return;
    loader.classList.add('is-hidden');
    setTimeout(function(){if(loader&&loader.parentNode)loader.parentNode.removeChild(loader)},650);
  }
  if(document.readyState==='complete'){setTimeout(hideLoader,350)}
  else window.addEventListener('load',function(){setTimeout(hideLoader,350)},{once:true});
  setTimeout(hideLoader,2200);
})();