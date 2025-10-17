import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signToken } from '../lib/jwt.js';

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/signin', async (request, reply) => {
    try {
      const body = signinSchema.parse(request.body);

      const [user] = await db.select().from(profiles).where(eq(profiles.email, body.email)).limit(1);

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.send({
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: error.errors });
      }
      console.error('Signin error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
