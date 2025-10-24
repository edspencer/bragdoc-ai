'use server';

import { z } from 'zod/v3';

import { createUser, getUser } from '@/database/queries';
import { sendWelcomeEmail } from '@/lib/email/client';
import { captureServerEvent, identifyUser } from '@/lib/posthog-server';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    // Validate ToS acceptance
    const tosAccepted = formData.get('tosAccepted') === 'true';
    if (!tosAccepted) {
      return { status: 'invalid_data' };
    }

    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    const newUser = await createUser(
      validatedData.email,
      validatedData.password,
    );

    // Track user registration
    try {
      await captureServerEvent(newUser.id, 'user_registered', {
        method: 'email',
        email: validatedData.email,
        user_id: newUser.id,
      });

      // Identify user in PostHog
      await identifyUser(newUser.id, {
        email: validatedData.email,
        name: validatedData.email.split('@')[0],
      });
    } catch (error) {
      console.error('Failed to track registration event:', error);
      // Don't fail registration if tracking fails
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: validatedData.email,
        userId: newUser.id,
        username: validatedData.email.split('@')[0]!,
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
