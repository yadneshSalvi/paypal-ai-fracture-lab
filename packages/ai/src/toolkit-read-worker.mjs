import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axios = require('axios');
const pending = new Map();
let sequence = 0;
parentPort.on('message', message => {
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error('The controlled Sample read is unavailable.'));
  else request.resolve(message);
});
// Only the trusted installed Toolkit runs here. This is a separate heap, not an OS sandbox.
axios.defaults.adapter = async config => {
  const url = new URL(config.url);
  const token = config.method === 'post' && url.pathname === '/v1/oauth2/token';
  const read = config.method === 'get' && url.pathname === `/v2/checkout/orders/${workerData.wireOrderId}`;
  if (url.origin !== 'https://api.sandbox.paypal.com' || url.search || url.hash || (!token && !read)) throw new Error('TOOLKIT_ENDPOINT_DENIED');
  const id = ++sequence;
  const received = await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    parentPort.postMessage({ type: 'request', id, method: token ? 'POST' : 'GET', path: url.pathname });
  });
  const response = { data: received.body, status: received.status, statusText: String(received.status), headers: received.headers, config, request: {} };
  if (response.status >= 400) { const error = new Error('The controlled Sample resource read failed.'); error.response = response; throw error; }
  return response;
};
try {
  if (!/^[A-Z0-9]{17,32}$/.test(workerData.wireOrderId)) throw new Error('TOOLKIT_RESOURCE_DENIED');
  const { PayPalAgentToolkit } = require('@paypal/agent-toolkit/openai');
  const toolkit = new PayPalAgentToolkit({ clientId: 'sample-only-id', clientSecret: 'sample-only-secret', configuration: { actions: { orders: { get: true } }, context: { sandbox: true } } });
  const tools = toolkit.getTools();
  if (tools.length !== 1 || tools[0].function.name !== 'get_order') throw new Error('TOOLKIT_TOOLSET_CHANGED');
  const result = await toolkit.handleToolCall({ id: workerData.callId, type: 'function', function: { name: 'get_order', arguments: JSON.stringify({ id: workerData.wireOrderId }) } });
  const content = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
  if (content?.error || content?.ok === false) throw new Error('TOOLKIT_READ_FAILED');
  parentPort.postMessage({ type: 'result', body: content });
} catch {
  parentPort.postMessage({ type: 'failure' });
}
