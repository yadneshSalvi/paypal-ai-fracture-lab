export function encodeFrame(frame:Record<string,unknown>,secret:string):string;
export function decodeFrame(text:string,secret:string):Record<string,unknown>|null;
