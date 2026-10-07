import { migrate, db, dbPath } from "./index.ts";
console.log("db:", dbPath());
console.log("applied:", migrate(db()));
