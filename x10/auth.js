/* X10 accounts.
   REAL MODE: SUPABASE_URL and SUPABASE_ANON (the public, publishable key) are filled in by build_store.py for the store build.
   Until then the site runs in DEMO MODE: accounts and purchases are kept only in this browser,
   so you can preview the whole flow. Demo mode is NOT secure and must not be used for real sales. */
const X10_CFG={SUPABASE_URL:"https://ezgkqndfjjdifrvlpxcb.supabase.co",SUPABASE_ANON:"sb_publishable__Q-YVhJZoIgR7oL7eFsimg_p2jdNShV"};
const X10Auth=(()=>{
 const REAL=!!(X10_CFG.SUPABASE_URL&&X10_CFG.SUPABASE_ANON);
 const K='x10_demo_acct_v1';
 const rd=()=>{try{return JSON.parse(localStorage.getItem(K)||'null')||{users:{},cur:null}}catch(e){return {users:{},cur:null}}};
 const wr=d=>{try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}};
 let sb=null,cache={user:null,owned:[]};
 async function client(){if(!sb){const m=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');sb=m.createClient(X10_CFG.SUPABASE_URL,X10_CFG.SUPABASE_ANON)}return sb}
 async function load(){
  if(!REAL){const d=rd();const u=d.cur&&d.users[d.cur];cache={user:u?{email:d.cur,name:u.name,mobile:u.mobile}:null,owned:u?u.owned||[]:[]};return cache}
  const c=await client();const {data:{user}}=await c.auth.getUser();
  if(!user){cache={user:null,owned:[]};return cache}
  const {data:rows}=await c.from('purchases').select('item');
  cache={user:{email:user.email,name:(user.user_metadata||{}).name||'',mobile:(user.user_metadata||{}).mobile||''},owned:(rows||[]).map(r=>r.item)};return cache}
 async function signUp({name,email,mobile,password}){email=email.trim().toLowerCase();
  if(!REAL){const d=rd();if(d.users[email])return {error:'exists'};d.users[email]={name,mobile,owned:[]};d.cur=email;wr(d);await load();return {}}
  const c=await client();const {data,error}=await c.auth.signUp({email,password,options:{data:{name,mobile},emailRedirectTo:location.origin+location.pathname}});
  if(error)return {error:/registered/i.test(error.message)?'exists':error.message};
  await load();return {confirm:!data.session}}
 async function signIn({email,password}){email=email.trim().toLowerCase();
  if(!REAL){const d=rd();if(!d.users[email])return {error:'nouser'};d.cur=email;wr(d);await load();return {}}
  const c=await client();const {error}=await c.auth.signInWithPassword({email,password});
  if(error)return {error:'bad'};await load();return {}}
 async function signOut(){if(!REAL){const d=rd();d.cur=null;wr(d)}else{const c=await client();await c.auth.signOut()}cache={user:null,owned:[]}}
 /* demo only: in real mode purchases are written by the payment webhook, never by the browser */
 function demoGrant(items){if(REAL)return;const d=rd();const u=d.cur&&d.users[d.cur];if(!u)return;u.owned=[...new Set([...(u.owned||[]),...items])];wr(d);cache.owned=u.owned}
 /* real mode only: paid pages are on the site encrypted; Supabase gives the key only to an account that owns the product */
 async function course(id){if(!REAL)return null;const c=await client();const {data,error}=await c.from('my_course_keys').select('key').eq('slug',id).maybeSingle();if(error||!data||!data.key)return null;
  const r=await fetch(new URL('d/'+id+'.txt',location.href));if(!r.ok)return null;const b=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0)),raw=b((await r.text()).trim());
  const k=await crypto.subtle.importKey('raw',b(data.key),'AES-GCM',false,['decrypt']);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:raw.slice(0,12)},k,raw.slice(12)))}
 async function resetPassword(email){if(!REAL)return {error:'demo'};const c=await client();const {error}=await c.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:location.origin+location.pathname});return error?{error:error.message}:{}}
 async function setPassword(password){if(!REAL)return {error:'demo'};const c=await client();const {error}=await c.auth.updateUser({password});return error?{error:error.message}:{}}
 const owns=i=>cache.owned.includes(i)||(i!=='lib'&&cache.owned.includes('all'));
 return {REAL,load,signUp,signIn,signOut,demoGrant,owns,course,resetPassword,setPassword,get user(){return cache.user},get owned(){return cache.owned}}
})();
