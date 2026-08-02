import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalStore } from '../src/local/store.mjs';
import { createApiHandler } from '../src/core/api.mjs';
import { hashPassword } from '../src/core/auth.mjs';

async function setup(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'charmnest-'));
  const store=new LocalStore({dbPath:path.join(dir,'db.sqlite'),uploadsDir:path.join(dir,'uploads')});store.init();
  const env={APP_ENV:'development',SESSION_SECRET:'0123456789abcdef0123456789abcdef',MAKER_PASSWORD_HASH:await hashPassword('maker-password-123'),ADULT_PASSWORD_HASH:await hashPassword('adult-password-123')};
  const handle=createApiHandler({store,env});
  return{dir,store,handle};
}
async function login(handle,username,password){
  const response=await handle(new Request('http://local/api/auth/login',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':`${username}-ip`},body:JSON.stringify({username,password})}));
  assert.equal(response.status,200);
  const data=await response.json();
  return{cookie:response.headers.get('set-cookie').split(';')[0],csrf:data.session.csrf,session:data.session};
}
function request(url,{method='GET',body,auth}={}){const headers={};if(body)headers['content-type']='application/json';if(auth){headers.cookie=auth.cookie;headers['x-csrf-token']=auth.csrf;}return new Request(`http://local${url}`,{method,headers,body:body?JSON.stringify(body):undefined});}
const drop={name:'Spooky Vibes',slug:'spooky-vibes',month:'October',year:2026,headline:'Orange and black',publicNotes:'Limited seasonal drop.',privateNotes:'Keep two ghost charms for custom orders.',colors:['Orange','Black'],colorHexes:['#ff7a00','#111111'],featuredCharm:'Ghost',beadedAvailable:true,braidedAvailable:true,quantity:20,schoolPriceCents:200,customPriceCents:300,onlinePriceMinCents:800,onlinePriceMaxCents:1500,releaseDate:'2026-10-01',endDate:'2026-10-31',tiktokUrl:'',etsyUrl:'',status:'published'};

test('maker publishing request is downgraded to review and adult can publish',async()=>{
  const {handle}=await setup();const maker=await login(handle,'maker','maker-password-123');
  let response=await handle(request('/api/studio/drops',{method:'POST',body:drop,auth:maker}));assert.equal(response.status,201);let data=await response.json();assert.equal(data.drop.status,'review');
  const adult=await login(handle,'adult','adult-password-123');
  response=await handle(request(`/api/studio/drops/${data.drop.id}/status`,{method:'POST',body:{status:'published'},auth:adult}));assert.equal(response.status,200);
  response=await handle(request('/api/public/drop'));data=await response.json();assert.equal(data.drop.name,'Spooky Vibes');assert.equal('privateNotes' in data.drop,false);
});

test('photo upload requires explicit no-face confirmation',async()=>{
  const {handle}=await setup();const maker=await login(handle,'maker','maker-password-123');
  const bad={originalName:'bracelet.png',mimeType:'image/png',altText:'Bracelet on wrist',caption:'',noFacesConfirmed:false,originalBase64:'AQID',webBase64:'AQID',thumbBase64:'AQID'};
  let response=await handle(request('/api/studio/photos',{method:'POST',body:bad,auth:maker}));assert.equal(response.status,422);
  bad.noFacesConfirmed=true;response=await handle(request('/api/studio/photos',{method:'POST',body:bad,auth:maker}));assert.equal(response.status,201);const data=await response.json();assert.equal(data.photo.status,'pending');
});

test('public special order stores masked email for public receipt',async()=>{
  const {handle}=await setup();const body={firstName:'Ava',contactEmail:'adult@example.com',braceletStyle:'beaded',quantity:2,colors:['Pink','Gold'],charm:'Heart',nameWord:'BESTIE',size:'standard',neededBy:'',giftPackaging:true,notes:'Matching pair',consent:true};
  const response=await handle(request('/api/orders',{method:'POST',body}));assert.equal(response.status,201);const data=await response.json();assert.equal(data.order.contactEmail,'a***@example.com');assert.equal(data.order.estimatedCents,2600);
});
