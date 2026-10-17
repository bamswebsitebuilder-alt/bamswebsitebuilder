import {db} from "../js/firebase-config.js";
import {doc,onSnapshot} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const keys=["announcements","breaking","advancement","scores","champions","format","available","taken","recruiting","rules","tips","playbooks","creators","highlights"];
document.getElementById("year").textContent=new Date().getFullYear();

function render(id,items){
  const el=document.getElementById(id);
  if(!el||!Array.isArray(items))return;
  el.replaceChildren();
  items.slice(0,40).forEach(item=>{
    if(typeof item!=="string"||!item.trim())return;
    const li=document.createElement("li");
    li.textContent=item.trim();
    el.append(li);
  });
  if(!el.children.length){
    const li=document.createElement("li");
    li.textContent="No updates published yet.";
    li.className="empty";
    el.append(li);
  }
}

onSnapshot(doc(db,"coachingLadder","public","site","content"),snapshot=>{
  if(!snapshot.exists())return;
  const data=snapshot.data();
  keys.forEach(k=>render(k,data[k]));
},()=>{ /* Site stays usable without a Firestore connection. */ });
