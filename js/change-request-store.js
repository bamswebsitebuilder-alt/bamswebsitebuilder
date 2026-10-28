import {db,storage} from './firebase-config.js';
import {collection,doc,query,orderBy,limit,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import {ref,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js';
import {requestInput,validateScreenshot,adminRequestPatch,CANCELLABLE_STATES,timeOf} from './change-request-model.js?v=1';

export const requestStore = {
  id:()=>doc(collection(db,'requestIds')).id,
  watch(uid,next,error) {
    return onSnapshot(query(collection(db,'users',uid,'changeRequests'),orderBy('createdAt','desc'),limit(100)),snapshot=>next(snapshot.docs.map(d=>({...d.data(),id:d.id,userId:uid,pending:d.metadata.hasPendingWrites}))),error);
  },
  async create(uid,values,file,id) {
    const input=requestInput(values);validateScreenshot(file);
    let screenshotPath='';
    if(file) {
      const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
      screenshotPath=`users/${uid}/uploads/change-request_${id}.${extension}`;
      await uploadBytes(ref(storage,screenshotPath),file,{contentType:file.type});
    }
    const target=doc(db,'users',uid,'changeRequests',id);
    await runTransaction(db,async transaction=>{
      const existing=await transaction.get(target);
      if(existing.exists()) {
        const saved=existing.data();
        if(saved.clientUid===uid&&['title','description','pageUrl'].every(key=>saved[key]===input[key])&&saved.screenshotPath===screenshotPath)return;
        throw Error('conflict');
      }
      transaction.set(target,{...input,clientUid:uid,screenshotPath,status:'submitted',scope:'unreviewed',adminNote:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    });
  },
  async review(record,values) {
    const patch=adminRequestPatch(record,values);
    await this.update(record,()=>patch);
  },
  async cancel(record) {
    await this.update(record,current=>{
      if(!CANCELLABLE_STATES.includes(current.status))throw Error('conflict');
      return {status:'cancelled'};
    });
  },
  async update(record,makePatch) {
    await runTransaction(db,async transaction=>{
      const target=doc(db,'users',record.userId,'changeRequests',record.id);
      const snapshot=await transaction.get(target);
      if(!snapshot.exists()||timeOf(snapshot.data().updatedAt)!==timeOf(record.updatedAt))throw Error('conflict');
      transaction.update(target,{...makePatch(snapshot.data()),updatedAt:serverTimestamp()});
    });
  },
  screenshot:path=>getDownloadURL(ref(storage,path))
};
