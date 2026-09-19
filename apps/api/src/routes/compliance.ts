import type { FastifyInstance } from 'fastify';
import type { DueItem } from '@routeiq/contracts';
import { dues } from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';

const KINDS = ['CDL', 'MEDICAL', 'REGISTRATION', 'INSURANCE', 'INSPECTION'] as const;

export async function complianceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Everything expired or expiring within `withinDays` (default 60), soonest first. A GSI4 query
   * per kind — the index only holds dated items, so this never scans the carrier's data.
   */
  app.get('/v1/compliance/due', { preHandler: requireUser() }, async (request) => {
    const within = Math.min(Math.max(Number((request.query as { withinDays?: string }).withinDays ?? 60) || 60, 1), 365);
    const today = new Date();
    const cutoff = new Date(today.getTime() + within * 86_400_000).toISOString();
    const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const items = await dues.listDue(authOf(request).tenantId, KINDS, cutoff);
    return {
      withinDays: within,
      items: items.map(
        (d): DueItem => ({
          entityType: d.entityType,
          entityId: d.entityId,
          kind: d.kind,
          dueOn: d.dueOn,
          label: d.label,
          daysLeft: Math.round((Date.parse(`${d.dueOn}T00:00:00Z`) - startOfToday) / 86_400_000),
        }),
      ),
    };
  });
}
