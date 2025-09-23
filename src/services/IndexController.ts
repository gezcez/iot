import { ApplicationStateManager } from "@AppliacationStateManager"
import { GezcezResponse } from "@gezcez/core"
import { Body, Controller, Get, Ip, Post, Req } from "@nestjs/common"

@Controller()
export class IndexController {
	@Get("health")
	async getHealth(@Req() req: Request) {
		return GezcezResponse({ health: ApplicationStateManager.GetStatus() })
	}

	@Get("health-history")
	async getStatus(@Req() req: Request) {
		return GezcezResponse({ history: ApplicationStateManager.GetHistory() })
	}
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
		const logEntry = {
			message,
			level: level || "log",
			unix_time: parseInt(unix_time),
			ip,
			received_at: Date.now()
		}
		console.log("Request IP:", ip)
		return GezcezResponse({ __message: "Hi from template!" })
	}
}
