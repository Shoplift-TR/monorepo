import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'

const server = Fastify({
    logger: {
        transport:
            process.env.NODE_ENV === 'development'
                ? { target: 'pino-pretty' }
                : undefined
    }
})

// Plugins
await server.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true
})

await server.register(helmet)

// Health check
server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start
const start = async () => {
    try {
        await server.listen({
            port: Number(process.env.PORT) || 3001,
            host: '0.0.0.0'
        })
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()