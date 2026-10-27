import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

export const accountRouter = Router();

// Zod schemas
const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  current_semester: z.number().int().min(1).max(8).optional(),
  career_goal: z.string().max(250).nullable().optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
});

const DeletionRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * GET /api/v1/account/profile
 */
accountRouter.get(
  '/profile',
  requireRole('enrolled', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        res.status(404).json(apiError('NOT_FOUND', 'User profile not found'));
        return;
      }

      res.json({
        data: profile,
      });
    } catch (err: unknown) {
      res.status(500).json(
        apiError(
          'INTERNAL_ERROR',
          err instanceof Error ? err.message : 'Failed to fetch profile'
        )
      );
    }
  }
);

/**
 * PATCH /api/v1/account/profile
 */
accountRouter.patch(
  '/profile',
  requireRole('enrolled', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const parseResult = UpdateProfileSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json(
          apiError(
            'VALIDATION_ERROR',
            'Invalid profile update payload',
            parseResult.error.errors
          )
        );
        return;
      }

      const updates = {
        ...parseResult.data,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        res.status(500).json(apiError('DB_ERROR', error.message));
        return;
      }

      res.json({
        data: updatedProfile,
      });
    } catch (err: unknown) {
      res.status(500).json(
        apiError(
          'INTERNAL_ERROR',
          err instanceof Error ? err.message : 'Failed to update profile'
        )
      );
    }
  }
);

/**
 * POST /api/v1/account/delete-request
 * Rule 9: No self-delete. Users submit a deletion request; Admin completes it within 7 days, logged in audit_log.
 */
accountRouter.post(
  '/delete-request',
  requireRole('enrolled', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const parseResult = DeletionRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json(
          apiError(
            'VALIDATION_ERROR',
            'Invalid deletion request payload',
            parseResult.error.errors
          )
        );
        return;
      }

      const reason = parseResult.data.reason ?? 'User requested account closure';

      // Insert deletion request
      const { data: deletionRecord, error: insertError } = await supabaseAdmin
        .from('deletion_requests')
        .insert({
          user_id: userId,
          reason,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        res.status(500).json(apiError('DB_ERROR', insertError.message));
        return;
      }

      // Institutional audit log entry
      await supabaseAdmin.from('audit_log').insert({
        actor_id: userId,
        action: 'DELETION_REQUESTED',
        target_table: 'profiles',
        target_id: userId,
        details: {
          request_id: deletionRecord.id,
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(201).json({
        data: {
          id: deletionRecord.id,
          status: 'pending',
          message:
            'Account deletion request submitted. An administrator will review and purge your data within 7 days.',
          requested_at: deletionRecord.requested_at,
        },
      });
    } catch (err: unknown) {
      res.status(500).json(
        apiError(
          'INTERNAL_ERROR',
          err instanceof Error ? err.message : 'Failed to submit deletion request'
        )
      );
    }
  }
);
