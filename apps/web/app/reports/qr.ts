/**
 * Self-contained QR Code encoder (ISO/IEC 18004 Model 2): byte mode, error-correction level M, versions 1–9
 * (up to 180 bytes — ample for a report link). No dependency, no network call. Returns the module matrix or
 * null when the text does not fit, so the caller can show the plain link instead.
 */
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5];
const rawModules = (version: number) => { let result = (16 * version + 128) * version + 64; if (version >= 2) { const align = Math.floor(version / 7) + 2; result -= (25 * align - 10) * align - 55; if (version >= 7) result -= 36; } return result; };
const dataCodewords = (version: number) => Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[version]! * BLOCKS[version]!;

function multiply(x: number, y: number) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; }
function divisor(degree: number) { const result = new Array<number>(degree).fill(0); result[degree - 1] = 1; let root = 1; for (let i = 0; i < degree; i++) { for (let j = 0; j < degree; j++) { result[j] = multiply(result[j]!, root); if (j + 1 < degree) result[j]! ^= result[j + 1]!; } root = multiply(root, 2); } return result; }
function remainder(data: number[], generator: number[]) { const result = generator.map(() => 0); for (const byte of data) { const factor = byte ^ result.shift()!; result.push(0); generator.forEach((coefficient, i) => { result[i]! ^= multiply(coefficient, factor); }); } return result; }

export function qrMatrix(text: string): boolean[][] | null {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1; while (version <= 9 && bytes.length > dataCodewords(version) - 2) version++;
  if (version > 9) return null;
  const capacity = dataCodewords(version) * 8;
  const bits: number[] = []; const append = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  append(4, 4); append(bytes.length, 8); for (const byte of bytes) append(byte, 8);
  append(0, Math.min(4, capacity - bits.length)); append(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));

  // Split into blocks, append Reed–Solomon remainders, interleave.
  const blocks = BLOCKS[version]!, ecc = ECC_PER_BLOCK[version]!, total = Math.floor(rawModules(version) / 8);
  const shortBlocks = blocks - total % blocks, shortLength = Math.floor(total / blocks), generator = divisor(ecc);
  const parts: number[][] = []; let offset = 0;
  for (let i = 0; i < blocks; i++) { const length = shortLength - ecc + (i < shortBlocks ? 0 : 1); const chunk = data.slice(offset, offset + length); offset += length; const parity = remainder(chunk, generator); if (i < shortBlocks) chunk.push(0); parts.push([...chunk, ...parity]); }
  const codewords: number[] = [];
  for (let i = 0; i < parts[0]!.length; i++) parts.forEach((part, j) => { if (i !== shortLength - ecc || j >= shortBlocks) codewords.push(part[i]!); });

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { modules[y]![x] = dark; reserved[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const distance = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, distance !== 2 && distance !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  if (version >= 2) {
    const count = Math.floor(version / 7) + 2, step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2, positions = [6];
    for (let position = size - 7; positions.length < count; position -= step) positions.splice(1, 0, position);
    positions.forEach((cy, i) => positions.forEach((cx, j) => { if ((i === 0 && j === 0) || (i === 0 && j === count - 1) || (i === count - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  }
  const format = (mask: number) => {
    const value = (0 << 3) | mask; let rem = value; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const word = ((value << 10) | rem) ^ 0x5412, bit = (i: number) => ((word >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i)); set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i)); set(8, size - 8, true);
  };
  format(0);
  if (version >= 7) { let rem = version; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25); const word = (version << 12) | rem; for (let i = 0; i < 18; i++) { const dark = ((word >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3); set(a, b, dark); set(b, a, dark); } }
  // Zigzag placement of the interleaved codewords.
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vertical = 0; vertical < size; vertical++) for (let j = 0; j < 2; j++) { const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vertical : vertical; if (!reserved[y]![x] && index < codewords.length * 8) { modules[y]![x] = ((codewords[index >>> 3]! >>> (7 - (index & 7))) & 1) !== 0; index++; } } }
  const masks: ((x: number, y: number) => boolean)[] = [(x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const apply = (mask: number) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!reserved[y]![x] && masks[mask]!(x, y)) modules[y]![x] = !modules[y]![x]; };
  const penalty = () => {
    let result = 0, dark = 0;
    const line = (at: (i: number) => boolean) => { let run = 1, history = 0; for (let i = 0; i < size; i++) { if (i > 0 && at(i) === at(i - 1)) { run++; if (run === 5) result += 3; else if (run > 5) result++; } else run = 1; history = ((history << 1) | (at(i) ? 1 : 0)) & 0x7ff; if (i >= 10 && (history === 0x5d0 || history === 0x05d)) result += 40; } };
    for (let y = 0; y < size; y++) line(i => modules[y]![i]!);
    for (let x = 0; x < size; x++) line(i => modules[i]![x]!);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const color = modules[y]![x]; if (color === modules[y]![x + 1] && color === modules[y + 1]![x] && color === modules[y + 1]![x + 1]) result += 3; }
    for (const row of modules) for (const cell of row) if (cell) dark++;
    return result + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0, lowest = Infinity;
  for (let mask = 0; mask < 8; mask++) { apply(mask); format(mask); const score = penalty(); if (score < lowest) { lowest = score; best = mask; } apply(mask); }
  apply(best); format(best);
  return modules;
}

/** One SVG path for the dark modules, including the four-module quiet zone the symbology requires. */
export function qrSvgPath(matrix: boolean[][]): { path: string; size: number } {
  const quiet = 4; let path = "";
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += `M${x + quiet},${y + quiet}h1v1h-1z`; }));
  return { path, size: matrix.length + quiet * 2 };
}
