import {createHmac,timingSafeEqual} from 'node:crypto';
const stringify=JSON.stringify.bind(JSON),parse=JSON.parse.bind(JSON);
const makeHmac=createHmac,constantTimeEqual=timingSafeEqual,bytes=Buffer.from.bind(Buffer);
export function encodeFrame(frame,secret){
  const payload=stringify(frame),signature=makeHmac('sha256',bytes(secret,'hex')).update(payload).digest('hex');
  return stringify({payload,signature});
}
export function decodeFrame(text,secret){
  try{
    const envelope=parse(text);
    if(typeof envelope.payload!=='string'||envelope.payload.length>200000||typeof envelope.signature!=='string'||! /^[a-f0-9]{64}$/.test(envelope.signature))return null;
    const expected=makeHmac('sha256',bytes(secret,'hex')).update(envelope.payload).digest();
    if(!constantTimeEqual(expected,bytes(envelope.signature,'hex')))return null;
    const frame=parse(envelope.payload);return frame&&typeof frame==='object'&&!Array.isArray(frame)?frame:null;
  }catch{return null;}
}
