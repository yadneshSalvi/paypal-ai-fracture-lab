import { getDatabase } from "../packages/service/src/database";
const db=await getDatabase();await db.query("SELECT 1");console.log("Fracture PostgreSQL application and payment-operation schemas are ready.");await db.close();
