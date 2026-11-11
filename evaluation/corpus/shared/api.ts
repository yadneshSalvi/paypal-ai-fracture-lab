import type { PaypalClient } from "paypal";

// JSON records are the deliberately small persistence boundary of the fixtures.
// SDK request/response types remain the actual installed paypal declarations.
export type Data = Record<string, any>;
export interface Row extends Data { version: number }
export interface Store {
  get(table: string, key: string): Promise<Row | null>;
  list(table: string): Promise<Array<{key: string; value: Row}>>;
  insert(table: string, key: string, value: Data): Promise<Row>;
  patch(table: string, key: string, value: Data, expectedVersion?: number): Promise<Row>;
  remove(table: string, key: string): Promise<void>;
  reserve(key: string, resource: string, amountMinor: number, limitMinor: number, metadata: Data): Promise<Row>;
}
export interface Context {
  client: PaypalClient;
  store: Store;
  requestId(...parts: string[]): string;
  verify(event: Data): Promise<boolean>;
}
export interface Result extends Data { status: string; httpStatus: number }
