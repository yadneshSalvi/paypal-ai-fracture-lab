export function usePathname() { return globalThis.__fractureTestPathname ?? "/ai-workbench"; }
export function useRouter() { return { push(path) { globalThis.__fractureRequestedPath = path; }, replace(path) { globalThis.__fractureRequestedPath = path; }, prefetch() {}, refresh() {}, back() {}, forward() {} }; }
