// Only the router environment is supplied by this fixture. The mounted provider,
// entry page, React effects, fetch calls, and recovery behavior execute unchanged.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/navigation") return { url: new URL("./navigation-fixture.mjs", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
