"use strict";
require("dotenv").config();
const express=require("express");
const helmet=require("helmet");
const rateLimit=require("express-rate-limit");
const Database=require("better-sqlite3");
const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const fs=require("fs");
const path=require("path");
const app=express();
const port=Number(process.env.PORT||3000);
const prod=process.env.NODE_ENV==="production";
const dbPath=path.resolve(process.env.DATABASE_PATH||path.join(__dirname,"data","oferta-radar.sqlite"));
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const authSecret=String(process.env.AUTH_SECRET||"");
if(authSecret.length<32&&process.env.NODE_ENV!=="test")throw new Error("Configure AUTH_SECRET com pelo menos 32 caracteres.");
const signingSecret=authSecret.length>=32?authSecret:"oferta-radar-test-secret-only-for-tests";
if(prod)app.set("trust proxy",1);
const db=new Database(dbPath);
db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");
db.exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL);CREATE TABLE IF NOT EXISTS offers(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,store TEXT NOT NULL,category TEXT NOT NULL,old_price REAL NOT NULL,price REAL NOT NULL,coupon TEXT,destination_url TEXT NOT NULL,affiliate_url TEXT,expires_at TEXT,clicks INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS affiliate_links(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,store TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,clicks INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS commissions(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,store TEXT NOT NULL,amount REAL NOT NULL,status TEXT NOT NULL,reference TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
const clean=(value,max=140)=>String(value||"").trim().slice(0,max);
const validUrl=value=>{try{const u=new URL(value);return(u.protocol==="https:"||u.protocol==="http:")&&!!u.hostname&&u.hostname.includes(".")&&!u.username&&!u.password;}catch(_){return false;}};
const categories=["Eletrônicos","Casa","Moda","Beleza","Games","Esporte","Outros"];
const allowedOrigins=String(process.env.FRONTEND_ORIGINS||"https://moustasch8-ai.github.io").split(",").map(x=>x.trim()).filter(Boolean);
app.use((req,res,next)=>{
 const origin=req.get("Origin");
 if(origin&&allowedOrigins.includes(origin)){
  res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
 }
 if(req.method==="OPTIONS")return res.sendStatus(204);
 next();
});
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:"24kb"}));
app.disable("x-powered-by");
const authLimit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:"draft-7",legacyHeaders:false,message:{error:"Muitas tentativas. Aguarde alguns minutos e tente novamente."}});
function issueToken(user){
 const payload=Buffer.from(JSON.stringify({uid:user.id,exp:Date.now()+7*24*60*60*1000})).toString("base64url");
 const signature=crypto.createHmac("sha256",signingSecret).update(payload).digest("base64url");
 return payload+"."+signature;
}
function resolveToken(token){
 try{
  const parts=String(token||"").split(".");
  if(parts.length!==2)return null;
  const expected=crypto.createHmac("sha256",signingSecret).update(parts[0]).digest();
  const provided=Buffer.from(parts[1],"base64url");
  if(expected.length!==provided.length||!crypto.timingSafeEqual(expected,provided))return null;
  const payload=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
  if(!Number.isInteger(payload.uid)||!Number.isFinite(payload.exp)||payload.exp<Date.now())return null;
  return db.prepare("SELECT id,name,email FROM users WHERE id=?").get(payload.uid)||null;
 }catch(_){return null;}
}
function auth(req,res,next){
 const header=String(req.get("Authorization")||"");
 const match=header.match(/^Bearer ([A-Za-z0-9_.-]+)$/);
 const account=match?resolveToken(match[1]):null;
 if(!account)return res.status(401).json({error:"Entre na sua conta para continuar."});
 req.account=account;next();
}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"oferta-radar",registrationRequired:true,authentication:"bearer-token"}));
app.post("/api/auth/register",authLimit,async(req,res)=>{
 const name=clean(req.body&&req.body.name,80),email=clean(req.body&&req.body.email,190).toLowerCase(),password=String(req.body&&req.body.password||"");
 if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Informe um nome e e-mail válidos."});
 if(password.length<10||Buffer.byteLength(password,"utf8")>72)return res.status(400).json({error:"A senha precisa ter de 10 a 72 bytes."});
 try{
  const passwordHash=await bcrypt.hash(password,12);
  const id=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name,email,passwordHash).lastInsertRowid;
  const user={id,name,email};res.status(201).json({user,token:issueToken(user)});
 }catch(error){
  if(String(error.code||"").includes("CONSTRAINT"))return res.status(409).json({error:"Este e-mail já está cadastrado."});
  res.status(500).json({error:"Não foi possível criar sua conta."});
 }
});
app.post("/api/auth/login",authLimit,async(req,res)=>{
 const email=clean(req.body&&req.body.email,190).toLowerCase(),password=String(req.body&&req.body.password||"");
 const user=db.prepare("SELECT id,name,email,password_hash FROM users WHERE email=?").get(email);
 if(!user||!(await bcrypt.compare(password,user.password_hash)))return res.status(401).json({error:"E-mail ou senha incorretos."});
 const publicUser={id:user.id,name:user.name,email:user.email};
 res.json({user:publicUser,token:issueToken(publicUser)});
});
app.get("/api/me",auth,(req,res)=>res.json({user:req.account}));
app.post("/api/auth/logout",(req,res)=>res.json({ok:true}));
app.get("/api/offers",(req,res)=>{
 const offers=db.prepare("SELECT id,name,store,category,old_price,price,coupon,expires_at,created_at,clicks FROM offers WHERE expires_at IS NULL OR expires_at='' OR expires_at>=date('now') ORDER BY id DESC LIMIT 250").all();
 res.json({offers});
});
app.post("/api/offers",auth,(req,res)=>{
 const b=req.body||{},name=clean(b.name),store=clean(b.store,60),category=clean(b.category,40),old=Number(b.old_price),price=Number(b.price),destination=clean(b.destination_url,1500),affiliate=clean(b.affiliate_url,1500),coupon=clean(b.coupon,40),expiry=clean(b.expires_at,10)||null;
 if(name.length<3||store.length<2||!categories.includes(category))return res.status(400).json({error:"Confira o nome, a loja e a categoria."});
 if(!Number.isFinite(old)||!Number.isFinite(price)||old<=0||price<=0||price>=old)return res.status(400).json({error:"O preço promocional deve ser menor que o preço anterior."});
 if(!validUrl(destination)||(affiliate&&!validUrl(affiliate)))return res.status(400).json({error:"Informe links válidos começando com http:// ou https://."});
 if(expiry&&(expiry.length!==10||Number.isNaN(Date.parse(expiry))))return res.status(400).json({error:"Data de validade inválida."});
 const id=db.prepare("INSERT INTO offers(owner_id,name,store,category,old_price,price,coupon,destination_url,affiliate_url,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(req.account.id,name,store,category,old,price,coupon,destination,affiliate||null,expiry).lastInsertRowid;
 res.status(201).json({id,message:"Oferta publicada no catálogo."});
});
app.get("/go/:id",(req,res)=>{
 const offer=db.prepare("SELECT id,destination_url,affiliate_url FROM offers WHERE id=?").get(req.params.id);
 if(!offer)return res.status(404).send("Oferta não encontrada.");
 db.prepare("UPDATE offers SET clicks=clicks+1 WHERE id=?").run(offer.id);
 res.redirect(302,offer.affiliate_url||offer.destination_url);
});
app.get("/api/affiliate-links",auth,(req,res)=>{
 const links=db.prepare("SELECT id,store,name,url,clicks FROM affiliate_links WHERE user_id=? ORDER BY id DESC LIMIT 500").all(req.account.id);
 res.json({links});
});
app.post("/api/affiliate-links",auth,(req,res)=>{
 const store=clean(req.body&&req.body.store,60),name=clean(req.body&&req.body.name,90),url=clean(req.body&&req.body.url,1500);
 if(store.length<2||name.length<2||!validUrl(url))return res.status(400).json({error:"Informe loja, nome e link HTTP/HTTPS válido."});
 const id=db.prepare("INSERT INTO affiliate_links(user_id,store,name,url) VALUES(?,?,?,?)").run(req.account.id,store,name,url).lastInsertRowid;
 res.status(201).json({id});
});
app.delete("/api/affiliate-links/:id",auth,(req,res)=>{
 const deleted=db.prepare("DELETE FROM affiliate_links WHERE id=? AND user_id=?").run(req.params.id,req.account.id);
 if(!deleted.changes)return res.status(404).json({error:"Link não encontrado."});
 res.json({ok:true});
});
app.get("/r/:id",(req,res)=>{
 const link=db.prepare("SELECT id,url FROM affiliate_links WHERE id=?").get(req.params.id);
 if(!link)return res.status(404).send("Link não encontrado.");
 db.prepare("UPDATE affiliate_links SET clicks=clicks+1 WHERE id=?").run(link.id);
 res.redirect(302,link.url);
});
app.get("/api/commissions",auth,(req,res)=>{
 const commissions=db.prepare("SELECT id,store,amount,status,reference,created_at FROM commissions WHERE user_id=? ORDER BY id DESC LIMIT 500").all(req.account.id);
 res.json({commissions});
});
app.post("/api/commissions",auth,(req,res)=>{
 const store=clean(req.body&&req.body.store,60),amount=Number(req.body&&req.body.amount),status=String(req.body&&req.body.status||"pending"),reference=clean(req.body&&req.body.reference,80);
 if(store.length<2||!Number.isFinite(amount)||amount<=0||amount>1000000||!["pending","approved","paid"].includes(status))return res.status(400).json({error:"Confira loja, valor e status da comissão."});
 const id=db.prepare("INSERT INTO commissions(user_id,store,amount,status,reference) VALUES(?,?,?,?,?)").run(req.account.id,store,amount,status,reference).lastInsertRowid;
 res.status(201).json({id});
});
app.get("/api/stats",auth,(req,res)=>{
 const userId=req.account.id;
 const offers=db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(clicks),0) AS clicks FROM offers WHERE owner_id=?").get(userId);
 const links=db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(clicks),0) AS clicks FROM affiliate_links WHERE user_id=?").get(userId);
 const commission=db.prepare("SELECT COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending,COALESCE(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END),0) AS approved,COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid FROM commissions WHERE user_id=?").get(userId);
 res.json({offers:offers.count,offerClicks:offers.clicks,links:links.count,linkClicks:links.clicks,clicks:offers.clicks+links.clicks,pending:commission.pending,approved:commission.approved,paid:commission.paid});
});
app.use(express.static(path.resolve(__dirname,".."),{index:"index.html"}));
app.get("*",(req,res,next)=>req.path.startsWith("/api/")||req.path.startsWith("/go/")||req.path.startsWith("/r/")?next():res.sendFile(path.resolve(__dirname,"..","index.html")));
app.use((err,req,res,next)=>{console.error(err.message);if(!res.headersSent)res.status(500).json({error:"Erro interno do servidor."});});
app.listen(port,()=>console.log("Oferta Radar com contas pessoais iniciado na porta "+port));