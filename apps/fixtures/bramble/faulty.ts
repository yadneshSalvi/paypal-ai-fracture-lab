import { randomUUID } from "node:crypto";
import { toProviderMoney } from "@fracture/paypal-core";
import type { BrambleContext, WireOrder } from "./contract";
import { FixtureRefusal } from "./contract";

/** Intentionally tutorial-shaped defects. Do not protect this target in the recorder. */
export async function faultyCheckout({run,store,transport}:BrambleContext){
  const state=await store.targetState(run.id,run.businessIntentId);state.attempt++;state.status="processing";
  await store.setTargetState(run.id,state);
  await store.emit(run.id,{lane:"application",kind:"checkout_started",title:`Checkout attempt ${state.attempt}`,detail:"The baseline starts a new checkout for the same purchase intent.",identity:"absent",sourceRef:{path:"apps/fixtures/bramble/faulty.ts",line:9,label:"New checkout on each attempt"}});
  try{
    const money=toProviderMoney({currency:run.currency,minor:run.amountMinor});
    // DEFECT D1: every customer retry creates a different provider order, with no intent claim.
    const created=await transport.fetch(new Request("https://api-m.sandbox.paypal.com/v2/checkout/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent:"CAPTURE",purchase_units:[{amount:{currency_code:money.currencyCode,value:money.value},custom_id:run.businessIntentId}]})}));
    if(!created.ok)throw new FixtureRefusal(created.status);
    const order=await created.json() as WireOrder;state.orderIds.push(order.id);await store.setTargetState(run.id,state);
    await transport.approve(order.id); // A distinct, explicit scripted Sample approval.
    const captured=await transport.fetch(new Request(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${order.id}/capture`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}));
    if(!captured.ok)throw new FixtureRefusal(captured.status);
    const result=await captured.json() as WireOrder;const capture=result.purchase_units?.[0]?.payments?.captures?.[0];
    if(!capture)throw new Error("The sample capture response omitted its resource.");
    // DEFECT D4: the tutorial assumes any returned capture is completed.
    state.status="paid";state.lastCaptureId=capture.id;state.unknown=false;await store.setTargetState(run.id,state);
    const fulfillmentId=randomUUID();
    await store.db.query("INSERT INTO lab_fulfillments(id,run_id,intent_id,capture_id,entitlement_key,document) VALUES($1,$2,$3,$4,$5,$6)",[fulfillmentId,run.id,run.businessIntentId,capture.id,fulfillmentId,JSON.stringify({source:"sample",kind:"digital_book",captureId:capture.id})]);
    await store.emit(run.id,{lane:"application",kind:"fulfilled",title:"The book is delivered",detail:"The baseline marks the purchase paid and creates a download entitlement.",resourceId:capture.id,identity:"absent",facts:{fulfillmentId,captureStatusReturned:capture.status}});
  }catch(error){
    // DEFECT D2: a missing response is called a financial failure, without reconciliation.
    state.status="failed";state.unknown=false;await store.setTargetState(run.id,state);
    const unknown=!(error instanceof FixtureRefusal);
    await store.emit(run.id,{lane:"application",kind:unknown?"unknown_outcome_presented_failed":"payment_refused",title:"Payment failed. Try again.",detail:unknown?"The baseline equates a missing answer with a failed payment. It never reads the original order.":"The sample provider refused the request before a confirmed capture.",identity:"absent",facts:{responseUnknown:unknown,readAttempted:false},sourceRef:{path:"apps/fixtures/bramble/faulty.ts",line:30,label:"Broad failure handling"}});
  }
  return store.targetState(run.id,run.businessIntentId);
}
