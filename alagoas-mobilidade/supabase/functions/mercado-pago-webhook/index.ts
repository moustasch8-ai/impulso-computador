import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST"&&req.method!=="GET")return new Response("Method not allowed",{status:405});
 const token=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");if(!token)return new Response("Not configured",{status:503});
 const body=req.method==="POST"?await req.json().catch(()=>({})): {},url=new URL(req.url);
 const id=String(body?.data?.id||url.searchParams.get("data.id")||url.searchParams.get("id")||"");if(!id)return new Response("ok");
 const verify=await fetch("https://api.mercadopago.com/v1/payments/"+encodeURIComponent(id),{headers:{Authorization:"Bearer "+token}});
 if(!verify.ok)return new Response("Payment verification failed",{status:400});
 const payment=await verify.json(),bookingId=String(payment.external_reference||payment.metadata?.booking_id||"");if(!bookingId)return new Response("Missing booking reference");
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:booking}=await admin.from("bookings").select("id,status,expires_at").eq("id",bookingId).maybeSingle();if(!booking)return new Response("Booking not found");
 let status=payment.status==="approved"?"approved":payment.status==="refunded"||payment.status==="charged_back"?"refunded":payment.status==="rejected"?"rejected":payment.status==="cancelled"?"cancelled":"pending";
 if(status==="approved"){
  const reserved=booking.status==="pending_payment"&&new Date(booking.expires_at).getTime()>Date.now();
  if(reserved)await admin.from("bookings").update({status:"confirmed",updated_at:new Date().toISOString()}).eq("id",bookingId).eq("status","pending_payment");
  else {const refund=await fetch("https://api.mercadopago.com/v1/payments/"+encodeURIComponent(id)+"/refunds",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{}"});if(refund.ok)status="refunded";}
 }
 await admin.from("payments").update({status,provider_payment_id:String(payment.id),updated_at:new Date().toISOString()}).eq("booking_id",bookingId);
 if(status==="refunded"&&booking.status==="confirmed")await admin.from("bookings").update({status:"refunded",updated_at:new Date().toISOString()}).eq("id",bookingId);
 return new Response("ok");
});