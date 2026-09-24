(function(){
  var started=Date.now();
  var minVisible=1200;
  var statuses=[
    "Crafting your experience...",
    "Loading portfolio...",
    "Almost ready..."
  ];
  var statusIndex=0;
  var statusTimer;

  function cycleStatus(){
    var status=document.querySelector(".bam-loader-status");
    if(!status)return;
    statusTimer=setInterval(function(){
      statusIndex=Math.min(statusIndex+1,statuses.length-1);
      status.textContent=statuses[statusIndex];
      if(statusIndex===statuses.length-1){
        clearInterval(statusTimer);
      }
    },450);
  }

  function hideLoader(){
    var loader=document.getElementById("bam-loader");
    if(!loader)return;

    var wait=Math.max(0,minVisible-(Date.now()-started));
    setTimeout(function(){
      if(!loader)return;
      if(statusTimer) clearInterval(statusTimer);
      loader.classList.add("is-hidden");
      setTimeout(function(){
        if(loader&&loader.parentNode)loader.parentNode.removeChild(loader);
      },600);
    },wait);
  }

  cycleStatus();

  if(document.readyState==="complete") hideLoader();
  else window.addEventListener("load",hideLoader,{once:true});

  setTimeout(hideLoader,3200);
})();