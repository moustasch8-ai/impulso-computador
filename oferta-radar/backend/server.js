"use strict";
require("dotenv").config();
const express=require("express"),helmet=require("helmet"),rateLimit=require("express-rate-limit"),Database=require("better-sqlite3"),fs=require("fs"),path=require("path");
const app=express(),port=Number(process.env.PORT||3000),prod=process.env.NODE_ENV==="production";
const dbPath=path.resolve(process.env.DATABASE_PATH||path.join(__dirname,"data","oferta-radar.sqlite")),dataDir=path.dirname(dbPath);
fs.mkdirSync(dataDir,{recursive:true});
if(prod)app.set("trust proxy",1);
const db=new Database(dbPath);
db.pragma("journal_mode=WAL");
db.pragma("foreign_keys=ON");
db.exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL);CREATE TABLE IF NOT EXISTS offers(id INTEGER PRIMARY KEY,owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,store TEXT NOT NULL,category TEXT NOT NULL,old_price REAL NOT NULL,price REAL NOT NULL,coupon TEXT,destination_url TEXT NOT NULL,affiliate_url TEXT,expires_at TEXT,clicks INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS affiliate_links(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,store TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,clicks INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS commissions(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,store TEXT NOT NULL,amount REAL NOT NULL,status TEXT NOT NULL,reference TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
const publicUserEmail="public-submissions@ofertaradar.invalid";
let publicUser=db.prepare("SELECT id FROM users WHERE email=?").get(publicUserEmail);
if(!publicUser){const result=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run("Envios públicos do Oferta Radar",publicUserEmail,"!no-password-login!");publicUser={id:result.lastInsertRowid};}
const publicUserId=publicUser.id;
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:"24kb"}));
const clean=(value,max=140)=>String(value||"").trim().slice(0,max);
const validUrl=value=>{try{const u=new URL(value);return(u.protocol==="https:"||u.protocol==="http:")&&!!u.hostname&&u.hostname.includes(".")&&!u.username&&!u.password;}catch(_){return false;}};
const publicSubmitLimit=rateLimit({windowMs:60*60*1000,limit:20,standardHeaders:"draft-7",legacyHeaders:false,message:{error:"Limite de envios atingido. Tente novamente mais tarde."}});
const categories=["Eletrônicos","Casa","Moda","Beleza","Games","Esporte","Outros"];
app.get("/api/health",(req,res)=>res.json({ok:true,service:"oferta-radar",registrationRequired:false}));
app.get("/api/offers",(req,res)=>{
 const offers=db.prepare("SELECT id,name,store,category,old_price,price,coupon,expires_at,created_at,clicks FROM offers WHERE expires_at IS NULL OR expires_at='' OR expires_at>=date('now') ORDER BY id DESC LIMIT 250").all();
 res.json({offers});
});
app.post("/api/offers",publicSubmitLimit,(req,res)=>{
 const b=req.body||{},name=clean(b.name),store=clean(b.store,60),category=clean(b.category,40);
 const old=Number(b.old_price),price=Number(b.price),destination=clean(b.destination_url,1500),affiliate=clean(b.affiliate_url,1500),coupon=clean(b.coupon,40),expiry=clean(b.expires_at,10)||null;
 if(name.length<3||store.length<2||!categories.includes(category))return res.status(400).json({error:"Confira o nome, a loja e a categoria."});
 if(!Number.isFinite(old)||!Number.isFinite(price)||old<=0||price<=0||price>=old)return res.status(400).json({error:"O preço promocional deve ser menor que o preço anterior."});
 if(!validUrl(destination)||(affiliate&&!validUrl(affiliate)))return res.status(400).json({error:"Informe links válidos começando com http:// ou https://."});
 if(expiry&&(expiry.length!==10||Number.isNaN(Date.parse(expiry))))return res.status(400).json({error:"Data de validade inválida."});
 const id=db.prepare("INSERT INTO offers(owner_id,name,store,category,old_price,price,coupon,destination_url,affiliate_url,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(publicUserId,name,store,category,old,price,coupon,destination,affiliate||null,expiry).lastInsertRowid;
 res.status(201).json({id,message:"Oferta publicada no catálogo compartilhado."});
});
app.get("/go/:id",(req,res)=>{
 const offer=db.prepare("SELECT id,destination_url,affiliate_url FROM offers WHERE id=?").get(req.params.id);
 if(!offer)return res.status(404).send("Oferta não encontrada.");
 db.prepare("UPDATE offers SET clicks=clicks+1 WHERE id=?").run(offer.id);
 res.redirect(302,offer.affiliate_url||offer.destination_url);
});
app.get("/api/affiliate-links",(req,res)=>{
 const links=db.prepare("SELECT id,store,name,url,clicks FROM affiliate_links ORDER BY id DESC LIMIT 500").all();
 res.json({links});
});
app.post("/api/affiliate-links",publicSubmitLimit,(req,res)=>{
 const store=clean(req.body&&req.body.store,60),name=clean(req.body&&req.body.name,90),url=clean(req.body&&req.body.url,1500);
 if(store.length<2||name.length<2||!validUrl(url))return res.status(400).json({error:"Informe loja, nome e link válido HTTP/HTTPS."});
 const id=db.prepare("INSERT INTO affiliate_links(user_id,store,name,url) VALUES(?,?,?,?)").run(publicUserId,store,name,url).lastInsertRowid;
 res.status(201).json({id,message:"Link adicionado ao mural público."});
});
app.get("/r/:id",(req,res)=>{
 const link=db.prepare("SELECT id,url FROM affiliate_links WHERE id=?").get(req.params.id);
 if(!link)return res.status(404).send("Link não encontrado.");
 db.prepare("UPDATE affiliate_links SET clicks=clicks+1 WHERE id=?").run(link.id);
 res.redirect(302,link.url);
});
app.get("/api/stats",(req,res)=>{
 const offerStats=db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(clicks),0) AS clicks FROM offers WHERE expires_at IS NULL OR expires_at='' OR expires_at>=date('now')").get();
 const linkStats=db.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(clicks),0) AS clicks FROM affiliate_links").get();
 res.json({offers:offerStats.count,offerClicks:offerStats.clicks,links:linkStats.count,linkClicks:linkStats.clicks,clicks:offerStats.clicks+linkStats.clicks});
});
app.use(express.static(path.resolve(__dirname,".."),{index:"index.html"}));
app.get("*",(req,res,next)=>req.path.startsWith("/api/")||req.path.startsWith("/go/")||req.path.startsWith("/r/")?next():res.sendFile(path.resolve(__dirname,"..","index.html")));
app.use((err,req,res,next)=>{console.error(err.message);if(!res.headersSent)res.status(500).json({error:"Erro interno do servidor."});});
app.listen(port,()=>console.log("Oferta Radar público rodando na porta "+port));
