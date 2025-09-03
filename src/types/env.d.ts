declare global {
	namespace NodeJS {
		interface ProcessEnv {
			COLLECTOR_NAME: string
			JWT_SECRET: string
		}
	}
}

export {}