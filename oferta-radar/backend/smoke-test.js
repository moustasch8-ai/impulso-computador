"use strict";
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const net=require("node:net");
async function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const address=server.address();server.close(error=>error?reject(error):resolve(address.port));});});}
async function waitForServer(base,child){for(let i=0;i<60;i++){if(child.exitCode!==null)throw new Error("Servidor encerrou antes de iniciar.");try{const r=await fetch(base+"/api/health");if(r.ok)return r;}catch(_){}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error("Servidor não iniciou a tempo.");}
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"oferta-radar-test-")),port=await freePort(),base="http://127.0.0.1:"+port;
 const child=spawn(process.execPath,[path.join(__dirname,"server.js")],{cwd:__dirname,env:{...process.env,NODE_ENV:"test",PORT:String(port),DATABASE_PATH:path.join(directory,"test.sqlite"),AUTH_SECRET:"test-auth-secret-with-more-than-32-characters",FRONTEND_ORIGINS:"https://moustasch8-ai.github.io"},stdio:["ignore","pipe","pipe"]});
 let output="";child.stdout.on("data",d=>output+=d.toString());child.stderr.on("data",d=>output+=d.toString());
 const headers=token=>({"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})});
 try{
  const health=await waitForServer(base,child),healthData=await health.json();
  assert.equal(healthData.ok,true);assert.equal(healthData.registrationRequired,true);
  const preflight=await fetch(base+"/api/auth/register",{method:"OPTIONS",headers:{Origin:"https://moustasch8-ai.github.io"}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get("access-control-allow-origin"),"https://moustasch8-ai.github.io");
  assert.match(preflight.headers.get("access-control-allow-headers"),/Authorization/i);
  const guest=await fetch(base+"/api/affiliate-links");assert.equal(guest.status,401);
  const guestOffer=await fetch(base+"/api/offers",{method:"POST",headers:headers(),body:JSON.stringify({})});assert.equal(guestOffer.status,401);
  const account={name:"Pessoa Teste",email:"pessoa@example.com",password:"Senha-forte-123"};
  const signup=await fetch(base+"/api/auth/register",{method:"POST",headers:headers(),body:JSON.stringify(account)});
  assert.equal(signup.status,201);const created=await signup.json();assert.ok(created.token);assert.equal(created.user.email,account.email);
  const me=await fetch(base+"/api/me",{headers:headers(created.token)});assert.equal(me.status,200);assert.equal((await me.json()).user.name,account.name);
  const duplicate=await fetch(base+"/api/auth/register",{method:"POST",headers:headers(),body:JSON.stringify(account)});assert.equal(duplicate.status,409);
  const badPassword=await fetch(base+"/api/auth/register",{method:"POST",headers:headers(),body:JSON.stringify({...account,email:"other@example.com",password:"123"})});assert.equal(badPassword.status,400);
  const login=await fetch(base+"/api/auth/login",{method:"POST",headers:headers(),body:JSON.stringify({email:account.email,password:account.password})});
  assert.equal(login.status,200);const logged=await login.json();assert.ok(logged.token);
  const offerPayload={name:"Produto de teste",store:"Loja de teste",category:"Eletrônicos",old_price:200,price:150,coupon:"TESTE",destination_url:"https://www.example.com/produto",affiliate_url:"https://www.example.com/afiliado",expires_at:null};
  const offerCreate=await fetch(base+"/api/offers",{method:"POST",headers:headers(logged.token),body:JSON.stringify(offerPayload)});
  assert.equal(offerCreate.status,201);const offer=await offerCreate.json();
  const publicOffers=await (await fetch(base+"/api/offers")).json();assert.equal(publicOffers.offers.length,1);assert.equal(publicOffers.offers[0].id,offer.id);
  const invalidOffer=await fetch(base+"/api/offers",{method:"POST",headers:headers(logged.token),body:JSON.stringify({...offerPayload,destination_url:"javascript:alert(1)"})});assert.equal(invalidOffer.status,400);
  const offerRedirect=await fetch(base+"/go/"+offer.id,{redirect:"manual"});assert.equal(offerRedirect.status,302);assert.equal(offerRedirect.headers.get("location"),offerPayload.affiliate_url);
  const linkPayload={store:"Rede de afiliados",name:"Meu link de teste",url:"https://www.example.com/meu-link"};
  const linkCreate=await fetch(base+"/api/affiliate-links",{method:"POST",headers:headers(logged.token),body:JSON.stringify(linkPayload)});assert.equal(linkCreate.status,201);const link=await linkCreate.json();
  const links=await (await fetch(base+"/api/affiliate-links",{headers:headers(logged.token)})).json();assert.equal(links.links.length,1);assert.equal(links.links[0].id,link.id);
  const otherSignup=await fetch(base+"/api/auth/register",{method:"POST",headers:headers(),body:JSON.stringify({name:"Outra Pessoa",email:"outra@example.com",password:"Outra-Senha-456"})});assert.equal(otherSignup.status,201);const other=await otherSignup.json();
  const otherLinks=await (await fetch(base+"/api/affiliate-links",{headers:headers(other.token)})).json();assert.equal(otherLinks.links.length,0);
  const linkRedirect=await fetch(base+"/r/"+link.id,{redirect:"manual"});assert.equal(linkRedirect.status,302);assert.equal(linkRedirect.headers.get("location"),linkPayload.url);
  const commission=await fetch(base+"/api/commissions",{method:"POST",headers:headers(logged.token),body:JSON.stringify({store:"Rede de afiliados",amount:25,status:"pending",reference:"PED-1"})});assert.equal(commission.status,201);
  const commissions=await (await fetch(base+"/api/commissions",{headers:headers(logged.token)})).json();assert.equal(commissions.commissions.length,1);
  const stats=await (await fetch(base+"/api/stats",{headers:headers(logged.token)})).json();assert.equal(stats.offers,1);assert.equal(stats.links,1);assert.equal(stats.clicks,2);assert.equal(stats.pending,25);
  const deleted=await fetch(base+"/api/affiliate-links/"+link.id,{method:"DELETE",headers:headers(logged.token)});assert.equal(deleted.status,200);
  console.log("Oferta Radar API smoke test: OK (CORS, cadastro, login, token, proteção, isolamento por conta, ofertas, links, cliques e comissões).");
 }catch(error){console.error(error);if(output)console.error(output);process.exitCode=1;}
 finally{child.kill("SIGTERM");await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once("exit",resolve);setTimeout(resolve,2000);});fs.rmSync(directory,{recursive:true,force:true});}
})();