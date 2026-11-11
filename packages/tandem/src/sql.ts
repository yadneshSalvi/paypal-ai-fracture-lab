import type { SqlConnection, SqlDatabase } from '@fracture/paypal-core';

/** Preserve nested rollback semantics inside a fenced frame transaction. */
export function transactionDatabase(connection:SqlConnection):SqlDatabase {
  let nextSavepoint=0;
  return {
    dialect:connection.dialect,
    query:(sql,params)=>connection.query(sql,params),
    async transaction(work){
      const name=`tandem_nested_${++nextSavepoint}`;
      await connection.query(`SAVEPOINT ${name}`);
      try{const result=await work(connection);await connection.query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await connection.query(`ROLLBACK TO SAVEPOINT ${name}`);await connection.query(`RELEASE SAVEPOINT ${name}`);throw error;}
    },
    async close(){/* The parent owns this connection. */},
  };
}
