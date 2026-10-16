import {auth,db} from "../js/firebase-config.js";import {onAuthStateChanged,signInWithEmailAndPassword,sendPasswordResetEmail,signOut} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";import {doc,getDoc,setDoc,serverTimestamp,onSnapshot} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";const view=document.body.dataset.adminView;const keys=["announcements","breaking","advancement","scores","champions","format","available","taken","recruiting","rules","tips","playbooks","creators","highlights"];const status=document.getElementById("status");function report(msg,ok=false){if(status){status.textContent=msg;status.classList.toggle("ok",ok)}}async function authorized(user){if(!user)return false;const staff=await getDoc(doc(db,"coachingLadderStaff",user.uid));return staff.exists()&&staff.data().active===true&&["commissioner","staff"].includes(staff.data().role)}if(view==="login"){
const password=document.getElementById("password");
const button=document.getElementById("login-btn");
const reset=document.getElementById("reset-btn");
document.getElementById("login-form").addEventListener("submit",async e=>{
 e.preventDefault();if(button.disabled)return;
 button.disabled=true;reset.disabled=true;report("Checking credentials…");
 try{
  const email=document.getElementById("email").value.trim();
  const result=await signInWithEmailAndPassword(auth,email,password.value);
  if(!await authorized(result.user)){
   await signOut(auth);report("This account is not approved for league administration. Contact your league administrator.");return;
  }
  location.assign("/coaching-ladder/admin-dashboard/");
 }catch(err){
  // Do not leave an unapproved session active when the staff lookup fails.
  try{await signOut(auth)}catch{}
  const errors={
   "auth/invalid-email":"Enter a valid email address.",
   "auth/invalid-credential":"Incorrect email or password.",
   "auth/user-not-found":"Incorrect email or password.",
   "auth/wrong-password":"Incorrect email or password.",
   "auth/too-many-requests":"Too many attempts. Please wait and try again.",
   "auth/network-request-failed":"Check your connection and try again."
  };
  report(errors[err.code]||"Unable to verify staff access. Please try again or contact your league administrator.");
 }finally{password.value="";button.disabled=false;reset.disabled=false}
});
reset.addEventListener("click",async()=>{
 const email=document.getElementById("email").value.trim();
 if(!email)return report("Enter your email address first.");
 if(reset.disabled)return;
 reset.disabled=true;button.disabled=true;
 try{await sendPasswordResetEmail(auth,email);report("If an account exists, password reset instructions have been sent.",true)}
 catch{report("Password reset could not be requested.")}
 finally{reset.disabled=false;button.disabled=false}
});
}if(view==="dashboard"){const gate=document.getElementById("gate");let stopStaffWatch=()=>{};let generation=0;let readyUid=null;function lock(message){readyUid=null;document.body.classList.remove("authorized");gate.hidden=false;gate.textContent=message;document.getElementById("save").disabled=true;document.getElementById("account").textContent="";keys.forEach(k=>{document.getElementById(k).value=""})}onAuthStateChanged(auth,async user=>{const currentGeneration=++generation;stopStaffWatch();stopStaffWatch=()=>{};lock("Verifying staff access…");if(!user){location.replace("/coaching-ladder/admin-login/");return}try{if(!await authorized(user)){if(currentGeneration===generation)lock("Access denied: this account has no league staff role.");return}const content=await getDoc(doc(db,"coachingLadder","public","site","content"));if(currentGeneration!==generation||auth.currentUser?.uid!==user.uid)return;if(content.exists()){const data=content.data();keys.forEach(k=>{document.getElementById(k).value=Array.isArray(data[k])?data[k].join("\n"):""})}else report("No published content yet. Fill in the sections and publish.",true);readyUid=user.uid;document.body.classList.add("authorized");gate.hidden=true;document.getElementById("account").textContent=user.email||"League staff";document.getElementById("save").disabled=false;stopStaffWatch=onSnapshot(doc(db,"coachingLadderStaff",user.uid),staff=>{if(currentGeneration===generation&&(!staff.exists()||staff.data().active!==true||!["commissioner","staff"].includes(staff.data().role)))lock("Access denied: league staff access has been revoked.")},()=>{if(currentGeneration===generation)lock("Could not verify staff access. Please sign in again.")})}catch{if(currentGeneration===generation)lock("Could not load the dashboard. Check Firebase configuration and security rules.")}});document.getElementById("editor").addEventListener("submit",async e=>{e.preventDefault();const user=auth.currentUser;const save=document.getElementById("save");if(save.disabled||!user||readyUid!==user.uid)return report("Access denied.");save.disabled=true;report("Publishing…");try{if(!await authorized(user)){lock("Access denied: this account has no league staff role.");return}if(auth.currentUser?.uid!==user.uid||readyUid!==user.uid)return;const data={};keys.forEach(k=>{data[k]=document.getElementById(k).value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,40)});data.updatedAt=serverTimestamp();data.updatedBy=user.uid;await setDoc(doc(db,"coachingLadder","public","site","content"),data);report("Website updates published successfully.",true)}catch{report("Publishing failed. Check your staff permissions and Firestore rules.")}finally{save.disabled=!readyUid||readyUid!==auth.currentUser?.uid}});document.getElementById("logout").addEventListener("click",async()=>{await signOut(auth);location.assign("/coaching-ladder/admin-login/")})}
