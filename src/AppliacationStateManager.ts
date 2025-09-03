import { Logger } from "@nestjs/common"

interface IWarning {
	created_at: number
	message: string
	data?: any
	type: "warning" | "fatal"
}

export abstract class ApplicationStateManager {
	static warnings: IWarning[] = []
	private static status: "healthy" | "partial" | "fatal" = "healthy"
	public static GetStatus() {
		return this.status
	}
	public static SetStatus(warning: IWarning) {
		this.warnings.push(warning)
		switch (warning.type) {
			case "fatal": {
				this.status = "fatal"
				Logger.fatal(`${warning.message}\nDATA:${JSON.stringify(warning.data,undefined,4)}`,"ApplicationStateManager")
				this.__handle_fatal()
				break
			} case "warning": {
				this.status = "partial"
				Logger.warn(`${warning.message}\nDATA:${JSON.stringify(warning.data,undefined,4)}`,"ApplicationStateManager")
				break
			}
		}
		Logger.log(`Set application status to ${this.status}`,"ApplicationStateManager")
	}
	public static GetHistory() {
		return this.warnings
	}
	private static async __handle_fatal() {
		// reporting and alarms
	}
}
