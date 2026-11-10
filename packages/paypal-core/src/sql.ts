import pg from "pg";
import Sqlite from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface QueryResult<T> { rows:T[]; rowCount:number }
export interface SqlConnection {
  dialect:"postgres"|"sqlite";
  query<T extends Record<string,unknown>=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<QueryResult<T>>;
}
export interface SqlDatabase extends SqlConnection {
  transaction<T>(work:(connection:SqlConnection)=>Promise<T>):Promise<T>;
  close():Promise<void>;
}
export class PostgresDatabase implements SqlDatabase {
  readonly dialect="postgres" as const;
  readonly pool:pg.Pool;
  constructor(url:string){this.pool=new pg.Pool({connectionString:url,max:8,idleTimeoutMillis:10000,connectionTimeoutMillis:5000});}
  async query<T extends Record<string,unknown>>(sql:string,params:unknown[]=[]):Promise<QueryResult<T>>{
    const result=await this.pool.query<T>(sql,params);return {rows:result.rows,rowCount:result.rowCount??0};
  }
  async transaction<T>(work:(connection:SqlConnection)=>Promise<T>):Promise<T>{
    const client=await this.pool.connect();
    try{
      await client.query("BEGIN");
      const connection:SqlConnection={dialect:"postgres",query:async <R extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>{const result=await client.query<R>(sql,params);return {rows:result.rows,rowCount:result.rowCount??0};}};
      const result=await work(connection);await client.query("COMMIT");return result;
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
  async close(){await this.pool.end();}
}
/** Local adapter persists to a file; the queue only serializes use of one SQLite connection. */
export class SqliteDatabase implements SqlDatabase {
  readonly dialect="sqlite" as const;
  private readonly db:Sqlite.Database;
  private queue:Promise<unknown>=Promise.resolve();
  constructor(path:string){if(path!==":memory:")mkdirSync(dirname(path),{recursive:true});this.db=new Sqlite(path);this.db.pragma("journal_mode = WAL");this.db.pragma("foreign_keys = ON");this.db.pragma("busy_timeout = 5000");}
  private direct<T extends Record<string,unknown>>(sql:string,params:unknown[]=[]):QueryResult<T>{
    const ordered:unknown[]=[];
    const translated=sql.replace(/\$(\d+)/g,(_all,index:string)=>{ordered.push(params[Number(index)-1]);return "?";}).replace(/\s+FOR UPDATE\b/gi,"");
    const statement=this.db.prepare(translated);
    if(statement.reader){const rows=statement.all(...ordered) as T[];return {rows,rowCount:rows.length};}
    const result=statement.run(...ordered);return {rows:[],rowCount:result.changes};
  }
  private serial<T>(work:()=>Promise<T>|T):Promise<T>{const next=this.queue.then(work,work);this.queue=next.then(()=>undefined,()=>undefined);return next;}
  query<T extends Record<string,unknown>>(sql:string,params:unknown[]=[]){return this.serial(()=>this.direct<T>(sql,params));}
  transaction<T>(work:(connection:SqlConnection)=>Promise<T>):Promise<T>{
    return this.serial(async()=>{
      this.db.exec("BEGIN IMMEDIATE");
      try{const result=await work({dialect:"sqlite",query:async <R extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>this.direct<R>(sql,params)});this.db.exec("COMMIT");return result;}
      catch(error){this.db.exec("ROLLBACK");throw error;}
    });
  }
  async close(){await this.queue;this.db.close();}
}
