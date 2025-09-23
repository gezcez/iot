import { db } from "@common/db"
import { GezcezResponse } from "@gezcez/core"
import { Body, Controller, Get, Ip, Post, Req } from "@nestjs/common"
import { logsTable } from "@schema"

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
      console.log("payload",req["payload"])
		await db.insert(logsTable).values({
			device_id: parseInt(req["payload"].sub),
			message: message,
			level: level || "log",
			lifetime: parseInt(unix_time),
			ip: ip
		})
		return GezcezResponse({ __message: "Hi from template!" })
	}
}
