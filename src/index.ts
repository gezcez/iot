import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	Module,
	NestInterceptor,
	ValidationPipe
} from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { apiReference } from "@scalar/nestjs-api-reference"

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus
} from "@nestjs/common"

import { WsAdapter } from "@nestjs/platform-ws"
import { Response } from "express"
import { map } from "rxjs"
import {
	BuildAuthenticationGuard,
	GezcezError,
	GezcezResponse,
	LoggerMiddleware
} from "@gezcez/core"
import { TemplateController } from "@services/template/template.controller"
import { IndexController } from "@services/IndexController"
import { SignJWT } from "jose"

const CollectorAuthGuard = BuildAuthenticationGuard({
	aud: `collector-${process.env.COLLECTOR_NAME}`,
	issuer: "internal.gezcez.com",
	secret: process.env.JWT_SECRET
})
@Module({
	controllers: [TemplateController, IndexController]
})
export class AppModule {}

export async function bootstrap(ignore_listen?: boolean) {
	Logger.log(
		`Project init successfull, bootstrapping server [COLLECTOR_TYPE=${process.env.COLLECTOR_NAME}]`
	)
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true
	})
	app.useGlobalPipes(new ValidationPipe())

	if (process.env.NODE_ENV !== "production") {
		const is_generate_prod_token = process.argv.includes("--token")
		const token_sub = is_generate_prod_token
			? process.argv[process.argv.indexOf("--token") + 1]
			: undefined
		if (is_generate_prod_token) {
			if (!token_sub) {
				throw new Error("You must provide a subject with --sub <subject>")
			}
			const new_token = await new SignJWT({ type: "internal-token" })
				.setProtectedHeader({ alg: "HS256", typ: "JWT" })
				.setSubject(token_sub)
				.setAudience("iot.gezcez.com")
				.setIssuer("iot.gezcez.com")
				.setExpirationTime(is_generate_prod_token ? "1y" : "24h")
				.sign(new TextEncoder().encode(process.env.JWT_SECRET + "_jwt_token"))
			Logger.debug(`Sample JWT Token (valid for 24h): ${new_token}`)
		}
	}
	app.use(LoggerMiddleware)
	app.useGlobalGuards(new CollectorAuthGuard())
	app.useGlobalInterceptors(new ResponseInterceptor())
	app.useWebSocketAdapter(new WsAdapter(app))
	const openapi_doc = new DocumentBuilder()
		.setTitle(`collector-${process.env.COLLECTOR_NAME} API Documentation`)
		.setDescription(`private docs for collector-${process.env.COLLECTOR_NAME}`)
		.setVersion("1.0.0")
		.setContact(
			"phasenull.dev",
			"https://phasenull.dev",
			"contact@phasenull.dev"
		)
		.addBearerAuth()
		.build()
	app.useGlobalFilters(new ErrorHandler())
	const document = SwaggerModule.createDocument(app, openapi_doc)
	app.use(
		"/docs",
		apiReference({
			theme: "bluePlanet",
			content: document
		})
	)
	SwaggerModule.setup("swagger", app, document)
	if (!ignore_listen) {
		await app.listen(process.env.PORT || 80, process.env.HOST || "localhost")
		Logger.log(`Application is running on: ${await app.getUrl()}`)
	}
	return app
}

bootstrap()

@Catch()
class ErrorHandler implements ExceptionFilter {
	catch(exception: any, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest()

		// console.log(response.json())
		const status =
			exception.result?.status ||
			exception.status ||
			HttpStatus.INTERNAL_SERVER_ERROR
		if (![404, 400, 403, 401, 200].includes(status)) {
			console.error("global exception", status, exception.status, exception)
		}
		response.status(status).json(
			exception.result?.message
				? {
						...exception,
						result: { ...exception.result, path: request.path }
					}
				: {
						...getGezcezResponseFromStatus(exception?.result?.status || status),
						result: {
							...getGezcezResponseFromStatus(
								exception?.result?.status || status
							).result,
							message: exception.response?.message,
							path: request.path
						}
					}
		)
	}
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler) {
		// You can also access the request/response if needed
		const ctx = context.switchToHttp()
		const response = ctx.getResponse() as Response
		// response.status(response.?.status || 500)

		return next.handle().pipe(
			map((data) => {
				// Example: Override status code if needed
				response.status(data?.result?.status || 500)

				return data
			})
		)
	}
}
function getGezcezResponseFromStatus(status: number) {
	switch (status) {
		case 500: {
			return GezcezError("INTERNAL_SERVER_ERROR", {
				__message: "Sunucu hata verdi :("
			})
		}
		case 404: {
			return GezcezError("NOT_FOUND", { __message: "Sayfa bulunamadı :(" })
		}
		case 400: {
			return GezcezError("BAD_REQUEST", {
				__message: "Sunucuya hatalı istek yolladın."
			})
		}
		case 401: {
			return GezcezError("UNAUTHORIZED", {
				__message: "Bu işlemi gerçekleştirmek için giriş yapmalısın."
			})
		}
		case 403: {
			return GezcezError("FORBIDDEN", {
				__message: "Bu işlemi gerçekleştirebilmek için yeterli iznin yok."
			})
		}
		default: {
			return GezcezError("INTERNAL_SERVER_ERROR", {
				__message: `Sunucuda düşünemediğimiz gizemli bir hata oluştu (${status})`
			})
		}
	}
}
