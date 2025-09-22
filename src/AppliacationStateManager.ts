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
	private static config: any = {}
	public static GetStatus() {
		return this.status
	}
	public static GetConfig() {
		return this.config
	}
	public static SetConfig(config: any) {
		this.config = config
		Logger.log(`Set application config to ${JSON.stringify(this.config,undefined,4)}`,"ApplicationStateManager")
	}
	public static async signPayload(payload: any) {
		if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined")
		const secret = process.env.JWT_SECRET
		const stringified = JSON.stringify(payload)
		const encoded = Buffer.from(stringified).toString("base64")
		const hasher = new Bun.CryptoHasher("sha256",secret)
		hasher.update(encoded)
		const signature = hasher.digest("hex")
		return `${encoded}.${signature}`
	}
	public static async verifyPayload(signed_payload: string) {
		if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined")
		const secret = process.env.JWT_SECRET
		
		const [encoded, signature] = signed_payload.split(".")
		const hasher = new Bun.CryptoHasher("sha256",secret)
		hasher.update(encoded)
		const expected_signature = hasher.digest("hex")
		const is_equal = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected_signature))
		if (!is_equal) throw new Error("Invalid signature")
		const stringified = Buffer.from(encoded, "base64").toString("utf-8")
		const payload = JSON.parse(stringified)
		return payload
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
