import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const devicesTable = sqliteTable("devices", {
   id: int().primaryKey({ autoIncrement: true }),
   type: text().notNull(),
   details: text(),
   created_at: int().notNull(),
   updated_at: int().notNull()
});

export const logsTable = sqliteTable("logs", {
   id: int().primaryKey({ autoIncrement: true }),
   device_id: int().notNull(),
   message: text().notNull(),
   created_at: int({mode: "timestamp_ms"}).notNull(),
   received_at: int({mode: "timestamp_ms"}).defaultNow().notNull(),
   level: text().notNull().default("log").$type<"log" | "warn" | "error">()
},(self)=>[
   index("device_logs_table").on(self.device_id,self.created_at),
   index("device_logs_table").on(self.device_id,self.level),
   index("device_logs_table").on(self.received_at)
]);

export const configTable = sqliteTable("config", {
   id: int().primaryKey({ autoIncrement: true }),
   device_id: int().notNull(),
   key: text().notNull(),
   value: text().notNull(),
   created_at: int({mode: "timestamp_ms"}).notNull(),
   updated_at: int({mode: "timestamp_ms"}).notNull()
},(self)=>[
   index("device_config_table").on(self.device_id,self.key)
]);