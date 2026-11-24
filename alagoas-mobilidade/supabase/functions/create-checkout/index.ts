import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método não permitido."},405);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,token=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
 if(!token)return json({error:"Checkout ainda não configurado: falta cadastrar MERCADOPAGO_ACCESS_TOKEN nos secrets das Edge Functions."},503);
 const auth=req.headers.get("Authorization")||"",client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)return json({error:"Faça login para continuar."},401);
 const body=await req.json().catch(()=>({})),bookingId=String(body.booking_id||""),method=body.payment_method==="pix"?"pix":body.payment_method==="card"?"card":"";
 if(!bookingId||!method)return json({error:"Reserva ou forma de pagamento inválida."},400);
 const admin=createClient(url,service);
 const {data:booking,error:bookingError}=await admin.from("bookings").select("id,passenger_id,total_amount,status,ride_offer_id,expires_at").eq("id",bookingId).single();
 if(bookingError||!booking||booking.passenger_id!==user.id)return json({error:"Reserva não encontrada."},404);
 if(booking.status!=="pending_payment"||new Date(booking.expires_at).getTime()<Date.now())return json({error:"A reserva expirou. Faça uma nova reserva."},409);
 const {data:offer}=await admin.from("ride_offers").select("origin_city,destination_city").eq("id",booking.ride_offer_id).single();
 const {data:payment,error:insertError}=await admin.from("payments").insert({booking_id:booking.id,payer_id:user.id,payment_method:method,amount:booking.total_amount,status:"pending"}).select("id").single();
 if(insertError)return json({error:"Não foi possível iniciar o pagamento."},500);
 const site=Deno.env.get("APP_SITE_URL")||"https://alagoas-mobilidade.onrender.com";
 const preference={items:[{id:booking.id,title:"Carona "+(offer?.origin_city||"")+" → "+(offer?.destination_city||""),quantity:1,currency_id:"BRL",unit_price:Number(booking.total_amount)}],external_reference:booking.id,notification_url:url+"/functions/v1/mercado-pago-webhook",back_urls:{success:site+"/?payment=success",pending:site+"/?payment=pending",failure:site+"/?payment=failure"},auto_return:"approved",payment_methods:{excluded_payment_types:method==="pix"?[{id:"credit_card"},{id:"debit_card"},{id:"prepaid_card"}]:[{id:"bank_transfer"},{id:"ticket"}]},metadata:{booking_id:booking.id,payment_record_id:payment.id}};
 const response=await fetch("https://api.mercadopago.com/checkout/preferences",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(preference)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.init_point){await admin.from("payments").update({status:"rejected"}).eq("id",payment.id);return json({error:result.message||"O provedor não conseguiu criar o checkout."},502)}
 await admin.from("payments").update({checkout_url:result.init_point}).eq("id",payment.id);
 return json({checkout_url:result.init_point,payment_id:payment.id});
});