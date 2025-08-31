declare global {
	namespace NodeJS {
		interface ProcessEnv {
			COLLECTOR_NAME: string
		}
	}
}

export {}