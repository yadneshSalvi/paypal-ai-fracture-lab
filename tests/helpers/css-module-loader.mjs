// DOM component tests need class names, not a stylesheet engine. All application
// modules, React state, network handling, and focus effects execute unchanged.
export async function load(url, context, nextLoad) {
  if (url.endsWith(".module.css")) {
    return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, name) => String(name) });" };
  }
  return nextLoad(url, context);
}
