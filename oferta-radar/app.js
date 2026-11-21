(() => {
"use strict";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const API_BASE = String(window.OFERTA_RADAR_API_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "ofertaRadar.authToken.v1";
const STORAGE = { offers:"ofertaRadar.offers.v2", clicks:"ofertaRadar.clicks.v2" };
const state = {
  user:null, mode:"login", pendingPage:"links", page:"ofertas",
  offers:[], links:[], commissions:[], apiOnline:false, demo:false,
  stats:{ clicks:0, offers:0, links:0, pending:0, approved:0, paid:0 }
};
const demoOffers = [
 {id:"demo-1",name:"Fone Bluetooth sem fio",store:"Loja exemplo",category:"Eletrônicos",old_price:199.9,price:129.9,coupon:"RADAR10",icon:"🎧",sample:true,created_at:"2026-11-21"},
 {id:"demo-2",name:"Luminária de mesa LED",store:"Casa exemplo",category:"Casa",old_price:89.9,price:59.9,icon:"💡",sample:true,created_at:"2026-11-20"},
 {id:"demo-3",name:"Mochila para notebook",store:"Moda exemplo",category:"Moda",old_price:159.9,price:99.9,icon:"🎒",sample:true,created_at:"2026-11-19"},
 {id:"demo-4",name:"Kit cuidados pessoais",store:"Beleza exemplo",category:"Beleza",old_price:119.9,price:74.9,icon:"🧴",sample:true,created_at:"2026-11-18"},
 {id:"demo-5",name:"Controle para jogos",store:"Games exemplo",category:"Games",old_price:249.9,price:179.9,icon:"🎮",sample:true,created_at:"2026-11-17"},
 {id:"demo-6",name:"Garrafa térmica 1L",store:"Esporte exemplo",category:"Esporte",old_price:79.9,price:49.9,icon:"🥤",sample:true,created_at:"2026-11-16"}
];
const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message,error=false){const el=$("#toast");el.textContent=message;el.classList.toggle("error",error);el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),3600);}
function apiUrl(path){return API_BASE+path;}
async function api(path,options={}){
 const headers={"Content-Type":"application/json",...(options.headers||{})};
 const token=localStorage.getItem(TOKEN_KEY);
 if(token)headers.Authorization="Bearer "+token;
 let response;
 try{response=await fetch(apiUrl(path),{...options,headers});}
 catch(_){throw new Error("Não foi possível conectar ao servidor do Oferta Radar.");}
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(data.error||"Não foi possível concluir a solicitação.");error.status=response.status;throw error;}
 return data;
}
function localRead(key){try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch(_){return [];}}
function localWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){toast("Não foi possível salvar neste navegador.",true);return false;}}
function isValidWebLink(value){try{const url=new URL(String(value).trim());return(url.protocol==="http:"||url.protocol==="https:")&&!!url.hostname&&url.hostname.includes(".")&&!url.username&&!url.password;}catch(_){return false;}}
function discount(offer){const old=Number(offer.old_price),price=Number(offer.price);return old>price&&old>0?Math.round((1-price/old)*100):0;}
function setDataStatus(){
 const status=$("#publicAccessStatus");
 if(status){status.textContent=state.user?"● Olá, "+state.user.name:"● Vitrine pública · conta gratuita";status.title=state.user?"Você está conectado à sua conta.":"Entre ou crie uma conta para acessar suas ferramentas pessoais.";}
 const button=$("#accountButton");
 if(button){button.textContent=state.user?"Sair":"Entrar";button.title=state.user?"Encerrar sessão":"Entrar ou criar conta";}
}
function authUI(){
 const logged=!!state.user;
 $("#linksLocked").classList.toggle("hidden",logged);
 $("#linksContent").classList.toggle("hidden",!logged);
 $("#publishLocked").classList.toggle("hidden",logged);
 $("#offerForm").classList.toggle("hidden",!logged);
 $("#salesLocked").classList.toggle("hidden",logged);
 $("#salesContent").classList.toggle("hidden",!logged);
 setDataStatus();
}
function authMode(mode){
 state.mode=mode;
 const signup=mode==="signup";
 $("#nameWrap").classList.toggle("hidden",!signup);
 $("#authName").required=signup;
 $("#authPassword").autocomplete=signup?"new-password":"current-password";
 $("#authTitle").textContent=signup?"Crie sua conta":"Entre na sua conta";
 $("#authDesc").textContent=signup?"Cadastre-se gratuitamente para guardar seus links, publicar ofertas e ver seus resultados.":"Acesse seus links, publicações e resultados.";
 $("#authSubmit").textContent=signup?"Criar conta grátis →":"Entrar →";
 $("#switchText").textContent=signup?"Já tem uma conta?":"Ainda não tem conta?";
 $("#switchMode").textContent=signup?"Entrar":"Criar cadastro";
 $("#authMessage").textContent=API_BASE?"":"O acesso por conta será ativado quando o servidor do site for publicado.";
}
function openAuth(mode="login",pageName){
 if(pageName)state.pendingPage=pageName;
 authMode(mode);
 $("#authModal").classList.remove("hidden");
 $("#authEmail").focus();
}
function closeAuth(){$("#authModal").classList.add("hidden");}
async function submitAuth(event){
 event.preventDefault();
 if(!API_BASE){$("#authMessage").textContent="O formulário está pronto, mas o servidor de contas ainda não foi publicado. A publicação exige ativar a hospedagem da API.";return;}
 const payload={email:$("#authEmail").value.trim(),password:$("#authPassword").value};
 if(state.mode==="signup")payload.name=$("#authName").value.trim();
 const submit=$("#authSubmit");submit.disabled=true;submit.textContent="Aguarde...";
 try{
  const result=await api(state.mode==="signup"?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify(payload)});
  localStorage.setItem(TOKEN_KEY,result.token);
  state.user=result.user;
  closeAuth();authUI();toast(state.mode==="signup"?"Conta criada com sucesso.":"Entrada realizada com sucesso.");
  const destination=state.pendingPage||"links";page(destination);
  if(destination==="links")await loadLinks();
  if(destination==="vendas")await loadPrivatePanel();
 }catch(error){$("#authMessage").textContent=error.message;toast(error.message,true);}
 finally{submit.disabled=false;submit.textContent=state.mode==="signup"?"Criar conta grátis →":"Entrar →";}
}
async function logout(){
 localStorage.removeItem(TOKEN_KEY);state.user=null;state.links=[];state.commissions=[];authUI();page("ofertas");toast("Você saiu da sua conta.");
}
function page(name,addHistory=true){
 if(!$("#page-"+name))return;
 state.page=name;
 $$(".page").forEach(el=>el.classList.add("hidden"));
 $("#page-"+name).classList.remove("hidden");
 $$(".nav").forEach(button=>{const active=button.dataset.page===name;button.classList.toggle("active",active);if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");});
 if(addHistory&&location.hash!=="#"+name)history.pushState({page:name},"","#"+name);
 if(name==="ofertas")loadOffers();
 if(name==="links"&&state.user)loadLinks();
 if(name==="vendas"&&state.user)loadPrivatePanel();
 window.scrollTo({top:0,behavior:"smooth"});
}
function currentFilters(){
 const query=$("#search").value.trim().toLowerCase(),store=$("#store").value,category=$("#category").value,minimum=Number($("#minimum").value),sort=$("#sort").value;
 const results=state.offers.filter(o=>(!query||(o.name+" "+o.store+" "+o.category).toLowerCase().includes(query))&&(!store||store===o.store)&&(!category||category===o.category)&&discount(o)>=minimum);
 results.sort((a,b)=>sort==="price"?Number(a.price)-Number(b.price):sort==="recent"?String(b.created_at||"").localeCompare(String(a.created_at||"")):discount(b)-discount(a));
 return results;
}
function renderOffers(){
 const offers=currentFilters(),grid=$("#offerGrid");grid.innerHTML="";
 $("#resultCount").textContent=offers.length+(offers.length===1?" oferta encontrada":" ofertas encontradas");
 $("#emptyOffers").classList.toggle("hidden",offers.length!==0);
 offers.forEach(offer=>{
  const card=document.createElement("article");card.className="offer-card";
  let action;
  if(offer.sample)action='<button class="btn primary" type="button" disabled>Exemplo · sem link</button>';
  else if(offer.local){const target=offer.affiliate_url||offer.destination_url;action='<a class="btn primary" href="'+esc(target)+'" target="_blank" rel="noopener noreferrer" data-local-offer="'+esc(offer.id)+'">Ver oferta ↗</a>';}
  else action='<a class="btn primary" href="'+esc(apiUrl("/go/"+encodeURIComponent(offer.id)))+'" target="_blank" rel="noopener noreferrer">Ver oferta ↗</a>';
  card.innerHTML='<div class="visual">'+esc(offer.icon||"🛍️")+'<span class="discount">-'+discount(offer)+'%</span>'+(offer.sample?'<span class="sample">EXEMPLO</span>':"")+'</div><div class="offer-body"><div class="store-name">'+esc(offer.store)+' · '+esc(offer.category)+'</div><div class="offer-title">'+esc(offer.name)+'</div><div class="old-price">'+money(offer.old_price)+'</div><div class="new-price">'+money(offer.price)+'</div><div class="coupon">'+(offer.coupon?"Cupom: "+esc(offer.coupon):"&nbsp;")+'</div><div class="offer-meta"><span>Conferir na loja</span><span>'+(offer.sample?"dados fictícios":"preço informado")+'</span></div>'+action+'</div>';
  grid.append(card);
 });
 const stores=[...new Set(state.offers.map(o=>o.store))].sort(),select=$("#store"),previous=select.value;
 select.innerHTML='<option value="">Todas as lojas</option>'+stores.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");
 select.value=stores.includes(previous)?previous:"";
 $("#offerCount").textContent=state.offers.length;$("#storeCount").textContent=stores.length;
 $("#dataBadge").textContent=state.apiOnline?"CATÁLOGO ONLINE":state.demo?"AMOSTRA DE DEMONSTRAÇÃO":"DADOS LOCAIS";
}
async function loadOffers(){
 try{const data=await api("/api/offers");state.apiOnline=true;const local=localRead(STORAGE.offers).map(o=>({...o,local:true}));state.offers=[...(data.offers||[]),...local];state.demo=state.offers.length===0;if(state.demo)state.offers=demoOffers;}
 catch(_){state.apiOnline=false;state.offers=[...localRead(STORAGE.offers).map(o=>({...o,local:true})),...demoOffers];state.demo=true;}
 renderOffers();
}
function renderLinks(){
 const list=$("#myLinks");list.innerHTML="";$("#linkTotal").textContent=state.links.length;
 if(!state.links.length){list.innerHTML='<div class="empty"><h3>Nenhum link cadastrado</h3><p>Adicione seu primeiro link de afiliado.</p></div>';return;}
 state.links.forEach(link=>{
  const row=document.createElement("div");row.className="data-row";
  const tracked=apiUrl("/r/"+encodeURIComponent(link.id));
  row.innerHTML='<div class="row-icon">↗</div><div class="row-main"><b>'+esc(link.name)+'</b><small>'+esc(link.store)+' · '+esc(link.url)+'</small></div><div class="row-metric">'+Number(link.clicks||0)+'<small>cliques</small></div><a class="row-btn" href="'+esc(tracked)+'" target="_blank" rel="noopener noreferrer">Abrir</a><button class="row-btn" type="button" data-copy="'+esc(tracked)+'">Copiar rastreamento</button><button class="row-btn" type="button" data-delete="'+esc(link.id)+'">Excluir</button>';
  list.append(row);
 });
}
async function loadLinks(){
 if(!state.user)return;
 try{const data=await api("/api/affiliate-links");state.links=data.links||[];$("#storageMode").textContent="Conta pessoal";renderLinks();}
 catch(error){toast(error.message,true);if(error.status===401)logout();}
}
function renderCommissions(){
 const list=$("#commissionList");list.innerHTML="";
 if(!state.commissions.length){list.innerHTML='<div class="empty"><h3>Nenhuma comissão registrada</h3><p>Registre aqui os valores confirmados na rede parceira.</p></div>';return;}
 state.commissions.forEach(item=>{
  const label=item.status==="paid"?"Paga":item.status==="approved"?"Aprovada":"Pendente",row=document.createElement("div");row.className="data-row";
  row.innerHTML='<div class="row-icon">R$</div><div class="row-main"><b>'+esc(item.store)+'</b><small>'+esc(item.reference||"Sem referência")+' · registro manual</small></div><span class="tag '+esc(item.status)+'">'+label+'</span><div class="row-metric">'+money(item.amount)+'</div>';
  list.append(row);
 });
}
async function loadPrivatePanel(){
 if(!state.user)return;
 try{
  const [stats,commissions]=await Promise.all([api("/api/stats"),api("/api/commissions")]);
  state.stats=stats;state.commissions=commissions.commissions||[];
  $("#salesClicks").textContent=stats.clicks||0;$("#salesOffers").textContent=stats.offers||0;$("#salesLinks").textContent=stats.links||0;
  $("#pendingSum").textContent=money(stats.pending||0);$("#approvedSum").textContent=money(stats.approved||0);$("#paidSum").textContent=money(stats.paid||0);
  renderCommissions();
 }catch(error){toast(error.message,true);if(error.status===401)logout();}
}
function trackLocalClick(id){const clicks=localRead(STORAGE.clicks),entry=clicks.find(x=>x.id===id);if(entry)entry.count=Number(entry.count||0)+1;else clicks.push({id,count:1});localWrite(STORAGE.clicks,clicks);}
async function addLink(event){
 event.preventDefault();const url=$("#linkUrl").value.trim();
 if(!isValidWebLink(url)){toast("Cole um endereço válido iniciado por http:// ou https://.",true);$("#linkUrl").focus();return;}
 try{await api("/api/affiliate-links",{method:"POST",body:JSON.stringify({store:$("#linkStore").value.trim(),name:$("#linkName").value.trim(),url})});$("#linkForm").reset();toast("Link salvo na sua conta.");await loadLinks();}
 catch(error){toast(error.message,true);if(error.status===401)logout();}
}
async function addOffer(event){
 event.preventDefault();const destination=$("#destinationUrl").value.trim(),affiliate=$("#offerAffiliate").value.trim(),old=Number($("#oldPrice").value),price=Number($("#newPrice").value);
 if(!isValidWebLink(destination)){toast("Informe o link original válido do produto.",true);$("#destinationUrl").focus();return;}
 if(affiliate&&!isValidWebLink(affiliate)){toast("O link de afiliado não é válido.",true);$("#offerAffiliate").focus();return;}
 if(!Number.isFinite(old)||!Number.isFinite(price)||old<=0||price<=0||price>=old){toast("O preço promocional precisa ser menor que o anterior.",true);$("#newPrice").focus();return;}
 const payload={name:$("#productName").value.trim(),store:$("#productStore").value.trim(),category:$("#productCategory").value,old_price:old,price,coupon:$("#coupon").value.trim(),destination_url:destination,affiliate_url:affiliate,expires_at:$("#expiry").value||null};
 try{await api("/api/offers",{method:"POST",body:JSON.stringify(payload)});$("#offerForm").reset();toast("Oferta publicada no catálogo.");await loadOffers();page("ofertas");}
 catch(error){toast(error.message,true);if(error.status===401)logout();}
}
async function addCommission(event){
 event.preventDefault();const payload={store:$("#saleStore").value.trim(),amount:Number($("#saleAmount").value),status:$("#saleStatus").value,reference:$("#saleRef").value.trim()};
 try{await api("/api/commissions",{method:"POST",body:JSON.stringify(payload)});$("#commissionForm").reset();toast("Comissão registrada. Confira o status no parceiro.");await loadPrivatePanel();}
 catch(error){toast(error.message,true);if(error.status===401)logout();}
}
function bind(){
 $$(".nav,[data-page]").forEach(button=>button.addEventListener("click",()=>page(button.dataset.page)));
 $$("[data-auth]").forEach(button=>button.addEventListener("click",()=>openAuth("login",state.page)));
 $$("[data-close]").forEach(button=>button.addEventListener("click",closeAuth));
 $("#accountButton").addEventListener("click",()=>state.user?logout():openAuth());
 $("#authForm").addEventListener("submit",submitAuth);
 $("#switchMode").addEventListener("click",()=>authMode(state.mode==="login"?"signup":"login"));
 $("#linkForm").addEventListener("submit",addLink);$("#offerForm").addEventListener("submit",addOffer);$("#commissionForm").addEventListener("submit",addCommission);
 $$("[data-scroll]").forEach(button=>button.addEventListener("click",()=>{const target=$("#"+button.dataset.scroll);if(target)target.scrollIntoView({behavior:"smooth"});}));
 ["search","store","category","minimum","sort"].forEach(id=>$("#"+id).addEventListener(id==="search"?"input":"change",renderOffers));
 $("#clearFilters").addEventListener("click",()=>{$("#search").value="";$("#store").value="";$("#category").value="";$("#minimum").value="0";$("#sort").value="discount";renderOffers();});
 $("#myLinks").addEventListener("click",async event=>{
  const copy=event.target.closest("[data-copy]");if(copy){try{await navigator.clipboard.writeText(new URL(copy.dataset.copy,location.href).href);toast("Link de rastreamento copiado.");}catch(_){toast("Não foi possível copiar.",true);}}
  const del=event.target.closest("[data-delete]");if(del&&confirm("Excluir este link da sua conta?")){try{await api("/api/affiliate-links/"+encodeURIComponent(del.dataset.delete),{method:"DELETE"});await loadLinks();toast("Link excluído.");}catch(error){toast(error.message,true);}}
 });
 $("#offerGrid").addEventListener("click",async event=>{const local=event.target.closest("[data-local-offer]");if(local)trackLocalClick(local.dataset.localOffer);});
 window.addEventListener("popstate",()=>{const name=location.hash.slice(1);page($("#page-"+name)?name:"ofertas",false);});
 $("#authModal").addEventListener("keydown",event=>{if(event.key==="Escape")closeAuth();});
}
async function init(){
 bind();authUI();await loadOffers();
 const token=localStorage.getItem(TOKEN_KEY);
 if(token&&API_BASE){try{const data=await api("/api/me");state.user=data.user;authUI();}catch(_){localStorage.removeItem(TOKEN_KEY);}}
 const initial=location.hash.slice(1),start=$("#page-"+initial)?initial:"ofertas";
 page(start,false);authUI();
}
document.addEventListener("DOMContentLoaded",init);
})();