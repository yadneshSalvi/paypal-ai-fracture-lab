import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axios = require('axios');
const awaiting = new Map();
let sequence = 0;
parentPort.on('message', message => {
  const pending = awaiting.get(message.id);
  if (!pending) return;
  awaiting.delete(message.id);
  if (message.error) {
    const error = new Error('The isolated provider response was unavailable.');
    error.request = {};
    pending.reject(error);
  } else pending.resolve(message);
});
// This module has its own worker heap. Never modify the web server's Axios adapter.
axios.defaults.adapter = async config => {
  const url = new URL(config.url);
  if (url.origin !== 'https://api.sandbox.paypal.com' || config.method !== 'post' || !['/v1/oauth2/token', '/v2/checkout/orders'].includes(url.pathname)) throw new Error('ERRAND_ENDPOINT_DENIED');
  const id = ++sequence;
  const received = await new Promise((resolve, reject) => {
    awaiting.set(id, { resolve, reject });
    parentPort.postMessage({ type:'request', id, path:url.pathname, method:'POST', headers:config.headers.toJSON(), body:config.data });
  });
  const response = { data:received.body, status:received.status, statusText:String(received.status), headers:received.headers, config, request:{} };
  if (response.status >= 400) {
    const error = new Error('The isolated provider refused the request.');
    error.response = response; error.request = {}; throw error;
  }
  return response;
};
try {
  if (workerData.tool !== 'create_order') throw new Error('ERRAND_TOOL_DENIED');
  const { PayPalAgentToolkit } = require('@paypal/agent-toolkit/openai');
  const toolkit = new PayPalAgentToolkit({clientId:'sample-only-id',clientSecret:'sample-only-secret',configuration:{actions:{orders:{create:true}},context:{sandbox:true,request_id:workerData.requestId}}});
  const exposed = toolkit.getTools().map(tool=>tool.function.name);
  if (exposed.length !== 1 || exposed[0] !== 'create_order') throw new Error('ERRAND_TOOLSET_CHANGED');
  const result = await toolkit.handleToolCall({id:workerData.callId,type:'function',function:{name:'create_order',arguments:JSON.stringify(workerData.arguments)}});
  const content=typeof result.content==='string'?JSON.parse(result.content):result.content;
  if(content?.error||content?.ok===false)parentPort.postMessage({type:'failure',code:content.error?.code??content.code??'ERRAND_TOOL_FAILURE',status:content.error?.status??content.status??null});
  else parentPort.postMessage({type:'result',result:content,exposed,schema:toolkit.getTools()[0].function.parameters});
} catch (error) {
  parentPort.postMessage({type:'failure',code:typeof error?.code==='string'?error.code:'ERRAND_TOOL_FAILURE',status:typeof error?.status==='number'?error.status:null});
}
