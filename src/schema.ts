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
   created_at: int({mode: "timestamp_ms"}).defaultNow().notNull(),
   lifetime: int(),
   level: text().notNull().default("log").$type<"log" | "warn" | "error">(),
   ip: text().notNull()
},(self)=>[
   index("device_logs_table").on(self.device_id,self.created_at),
   index("device_logs_table").on(self.device_id,self.level,self.created_at),
   index("device_logs_table").on(self.created_at)
]);

export const configTable = sqliteTable("config", {
   id: int().primaryKey({ autoIncrement: true }),
   device_id: int().notNull(),
   key: text().notNull(),
   value: text().notNull(),
   created_at: int({mode: "timestamp_ms"}).notNull().defaultNow(),
   updated_at: int({mode: "timestamp_ms"})
},(self)=>[
   index("device_config_table").on(self.device_id,self.key)
]);

export const messageQueueTable = sqliteTable("message_queue", {
   id: int().primaryKey({ autoIncrement: true }),
   device_id: int().notNull(),
   message: text().notNull(),
   created_at: int({mode: "timestamp_ms"}).notNull().defaultNow(),
   read_at: int({mode: "timestamp_ms"}),
   read_ip: text(),
   actor_id: int(),
   actor_ip: text(),
},(self)=>[
   index("device_message_queue").on(self.device_id,self.created_at)
]);