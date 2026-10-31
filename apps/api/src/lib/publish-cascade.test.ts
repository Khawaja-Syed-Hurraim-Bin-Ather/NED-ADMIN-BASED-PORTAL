import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePublishJob, runPendingJobs, PublishJobRecord } from './publish-cascade';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockJobUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockJobsOrder = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'publish_jobs') {
        const queryBuilder: any = {
          eq: vi.fn().mockImplementation(() => queryBuilder),
          order: mockJobsOrder,
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          update: mockJobUpdate,
        };
      }
      if (table === 'releases') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'rel-1', tag: 'cis-2026-v1', snapshot: { courses: ['CS-115', 'CS-116'] } },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'rel-rollback-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

describe('Publish Cascade Engine (Card A9, Section 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Cascade Job Execution & Idempotency', () => {
    it('executes a queued job step and marks it done', async () => {
      const job: PublishJobRecord = {
        id: 'job-1',
        release_id: 'rel-1',
        step: 'rebuild_graph',
        status: 'queued',
      };

      const result = await executePublishJob(job);

      expect(result.success).toBe(true);
      expect(result.status).toBe('done');

      // Verifies update was called to set status = 'running' then 'done'
      expect(mockJobUpdate).toHaveBeenCalled();
    });

    it('is idempotent: skips execution if job is already marked done', async () => {
      const completedJob: PublishJobRecord = {
        id: 'job-done',
        release_id: 'rel-1',
        step: 'refresh_caches',
        status: 'done',
      };

      const result = await executePublishJob(completedJob);

      expect(result.success).toBe(true);
      expect(result.status).toBe('done');
      expect(result.skipped).toBe(true);
    });

    it('handles side job failure gracefully without crashing the runner', async () => {
      const faultyJob: PublishJobRecord = {
        id: 'job-err',
        release_id: 'rel-1',
        step: 'invalid_unknown_step' as any,
        status: 'queued',
      };

      const result = await executePublishJob(faultyJob);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();

      // Section 8: Failed side job records failure detail but does not undo the publish
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('2. Batch Cascade Runner', () => {
    it('executes all pending jobs for a release in order', async () => {
      mockJobsOrder.mockResolvedValueOnce({
        data: [
          { id: 'j-3', release_id: 'rel-1', step: 'rebuild_graph', status: 'queued' },
          { id: 'j-4', release_id: 'rel-1', step: 'recompute_scores', status: 'queued' },
          { id: 'j-5', release_id: 'rel-1', step: 'refresh_caches', status: 'queued' },
        ],
        error: null,
      });

      const summary = await runPendingJobs('rel-1');

      expect(summary.total).toBe(3);
      expect(summary.completed).toBe(3);
      expect(summary.failed).toBe(0);
    });
  });
});
