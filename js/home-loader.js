(function(){
  var started=Date.now();
  var minVisible=900;

  function hideLoader(){
    var loader=document.getElementById('bam-loader');
    if(!loader)return;

    var wait=Math.max(0,minVisible-(Date.now()-started));
    setTimeout(function(){
      if(!loader)return;
      loader.classList.add('is-hidden');
      setTimeout(function(){
        if(loader&&loader.parentNode)loader.parentNode.removeChild(loader);
      },700);
    },wait);
  }

  if(document.readyState==='complete') hideLoader();
  else window.addEventListener('load',hideLoader,{once:true});

  setTimeout(hideLoader,2600);
})();