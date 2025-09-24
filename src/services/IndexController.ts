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
}
