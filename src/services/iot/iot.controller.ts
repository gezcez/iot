import { db } from "@common/db"
import { GezcezError, GezcezResponse, logger } from "@gezcez/core"
import { Body, Controller, Get, Ip, Post, Query, Req, Res } from "@nestjs/common"
import { logsTable, messageQueueTable } from "@schema"
import { and, asc, eq, isNull } from "drizzle-orm"

@Controller({
	path: ""
})
export class IOTController {
	@Post("/log")
	async getTemplate(
		@Req() req: Request,
		@Ip() ip: string,
		@Body()
		body: {
			message: string
			level?: "log" | "warn" | "error"
			unix_time: string
		}
	) {
		const { message, level, unix_time } = body
		console.log("payload", req["payload"])
		await db.insert(logsTable).values({
			device_id: parseInt(req["payload"].sub),
			message: message,
			level: level || "log",
			lifetime: parseInt(unix_time),
			ip: ip
		})
		return GezcezResponse({ __message: "Hi from template!" })
	}

	@Post("/message")
	async postMessage(
		@Ip() ip: string,
		@Req() req: Request,
		@Body() body: { message: string },
		@Query("device_id") device_id: number
	) {
		const message = body.message
		const target_device_id = device_id
		const actor = parseInt(req["payload"].sub)
		if (!actor || actor <= 0) return GezcezError("BAD_REQUEST",{__message:"Invalid actor_id"})
		if (req["payload"].type !== "internal-token") return GezcezError("BAD_REQUEST",{__message:"Only internal-tokens can post messages"})
		if (!target_device_id || target_device_id <= 0) return GezcezError("BAD_REQUEST",{__message:"Invalid target device_id"})
		logger.log(`Actor #${actor} is posting a message to device #${target_device_id}. (remote_ip=${ip})`)
		const message_escaped = message.replace(/'/g, "''")
		await db.insert(messageQueueTable).values({
			device_id: target_device_id,
			message: message_escaped,
			actor_id: actor,
			actor_ip: ip
		})
		return GezcezResponse({ __message: "Message queued!" })
	}

	@Get("/message")
	async getMessage(@Ip() ip: string, @Req() req: Request) {
		const device_id = parseInt(req["payload"].sub)
		if (!device_id || device_id <= 0) return GezcezError("BAD_REQUEST",{__message:"Invalid device_id"})
		if (req["payload"].type !== "device") return GezcezError("BAD_REQUEST",{__message:"Only devices can fetch messages"})
		const remote_ip =
			process.env.NODE_ENV !== "dev" ? req.headers["CF-Connecting-IP"] : ip
		logger.log(
			`Device #${device_id} is checking messages. (remote_ip=${remote_ip})`
		)
		const [message_row] = await db
			.select()
			.from(messageQueueTable)
			.orderBy(asc(messageQueueTable.created_at))
			.where(
				and(
					eq(messageQueueTable.device_id, device_id),
					isNull(messageQueueTable.read_at)
				)
			)
			.limit(1)
		console.log("message_row", message_row)
		if (!message_row) return
		await db
			.update(messageQueueTable)
			.set({
				read_at: new Date(),
				read_ip: remote_ip
			})
			.where(eq(messageQueueTable.id, message_row.id))
			.returning()
		console.log("Updated message as read")
		return message_row.message
	}

	
	@Post("/log")
	async log(
		@Req() req: Request,
		@Ip() ip: string,
		@Query("message") message: string,
		@Query("level") level: "log" | "warn" | "error",
		@Query("unix_time") unix_time: string,
	) {
		const logEntry = {
			message,
			level: level || "log",
			unix_time: parseInt(unix_time),
			ip,
			received_at: Date.now()
		}
		await db.insert(logsTable).values({
			device_id: parseInt(req["payload"].sub),
			message: logEntry.message,
			level: logEntry.level,
			ip: logEntry.ip,
			lifetime: logEntry.unix_time
		})
		console.log("Request IP:", ip)
		return GezcezResponse({ __message: "Hi from template!" })
	}
}
