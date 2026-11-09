import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeDatabase,
  getVerifiedOrgs,
  registerUser,
  loginUser,
  getPendingUsers,
  verifyUserAction,
  getTenantSimulationState,
  saveTenantSimulationState,
  resetTenantSimulationState,
} from './src/server/db.js';
import { ADMIN_EMAIL } from './src/types/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await initializeDatabase();
  const app = express();
  const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON payload parser
  app.use(express.json({ limit: '50mb' }));

  // --- API ROUTE HANDLERS ---

  // Health and System Status Ticker
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OPERATIONAL',
      service: 'DigiTwin Industrial SCADA Gateway',
      version: '2.8.0',
      timestamp: Date.now(),
      uptimeSeconds: process.uptime(),
      gatewayLatencyMs: Math.floor(12 + Math.random() * 5),
      edgeNodesOnline: 16,
      adminContact: ADMIN_EMAIL,
    });
  });

  // 1. Get Verified Organizations (Strictly verified only; unverified orgs are hidden)
  app.get('/api/orgs/verified', async (_req: Request, res: Response) => {
    try {
      const orgs = await getVerifiedOrgs();
      res.json({ success: true, organisations: orgs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. User Registration (Created with PENDING_APPROVAL status)
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, badgeId, department, requestedOrganisation, role } = req.body;
      if (!name || !email || !password || !badgeId || !requestedOrganisation) {
        return res.status(400).json({
          success: false,
          error: 'Missing required registration fields (name, email, password, badgeId, requestedOrganisation).',
        });
      }

      const result = await registerUser({
        name,
        email,
        password,
        badgeId,
        department: department || 'Discrete Manufacturing Operations',
        requestedOrganisation,
        role: role || 'PLANT_OPERATOR',
      });

      if (!result.success) {
        return res.status(409).json(result);
      }
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. User Authentication / Login (Enforces approval status)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your Operator Badge ID / Email and Security Passcode.',
        });
      }

      const result = await loginUser(identifier, password);
      if (!result.success) {
        // Return 403 Forbidden if pending or rejected
        const statusCode = result.status === 'PENDING_APPROVAL' || result.status === 'REJECTED' ? 403 : 401;
        return res.status(statusCode).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Admin: List Pending Registrations
  app.get('/api/admin/pending-users', async (req: Request, res: Response) => {
    try {
      const pending = await getPendingUsers();
      res.json({ success: true, pendingUsers: pending });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Admin: Verify / Approve / Reject User & Organization
  app.post('/api/admin/verify-user', async (req: Request, res: Response) => {
    try {
      const { userId, approved, rejectionReason, adminEmail } = req.body;
      if (!userId || typeof approved !== 'boolean') {
        return res.status(400).json({ success: false, error: 'userId and approved boolean required.' });
      }

      const verifierEmail = adminEmail || ADMIN_EMAIL;
      const result = await verifyUserAction(userId, approved, verifierEmail, rejectionReason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Multi-Tenant Digital Twin State: Load
  app.get('/api/twin/state/:orgId', async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const saved = await getTenantSimulationState(orgId);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Multi-Tenant Digital Twin State: Save
  app.post('/api/twin/state/:orgId', async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { state } = req.body;
      if (!state) {
        return res.status(400).json({ success: false, error: 'Missing simulation state in body.' });
      }
      await saveTenantSimulationState(orgId, state);
      res.json({ success: true, message: `Digital twin state persisted for tenant ${orgId}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Multi-Tenant Digital Twin State: Reset
  app.post('/api/twin/reset/:orgId', async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      await resetTenantSimulationState(orgId);
      res.json({ success: true, message: `Tenant ${orgId} simulation state reset to clean baseline` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Plant CoPilot AI route (Grounded Diagnostic)
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, plantContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemInstruction = `You are DigiTwin AI, Chief Manufacturing & Reliability Engineer for an aerospace discrete-event factory floor.
You have real-time telemetry access to 28 stations across 3 machining lines (RM1 Lathe, RM2 Milling, RM3 Shaping), 3-stage QC subsystems, Assembly, and Packaging.
Analyze the user's question with precise engineering logic, referencing live plant state:
Current Plant State:
${JSON.stringify(plantContext, null, 2)}
Always explain:
1. Root cause of any active machine breakdowns, bottlenecks, or scrap rates.
2. Step-by-step actionable solutions (speed adjustment, bearing replacement, hone rework server, feed rebalancing).
3. Impact on OEE, throughput, and per-unit production margins.
Keep answers concise, direct, authoritative, and formatted in clean markdown.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: message,
          config: {
            systemInstruction,
          },
        });

        return res.json({ reply: response.text });
      }

      // Grounded fallback response when API key is not attached
      return res.json({
        reply: `🤖 **DigiTwin Plant Intelligence Assessment:**\n\n• **Active Alarms:** ${plantContext?.activeFaultCount ?? 0} active faults\n• **Current OEE:** ${(plantContext?.oee?.overallOEE ?? 0).toFixed(1)}%\n• **Bottleneck Station:** ${plantContext?.bottleneck?.name ?? 'Quality Control RM1'}\n• **Action Plan:** Maintain spindle bearing vibration within ISO 10816 limits (<2.8 mm/s) and clear staging buffers before shift handover.`
      });
    } catch (err: any) {
      res.json({
        reply: `🤖 **DigiTwin Diagnostic Response:** Machine telemetry received. Monitor CNC tool flank wear index against the 0.30mm ISO 3685 threshold.`
      });
    }
  });

  // --- SERVING FRONTEND ---
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite Middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DigiTwin SCADA] Server operational on http://0.0.0.0:${PORT}`);
    console.log(`[DigiTwin SCADA] Chief Administrator & Verifier: ${ADMIN_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('[DigiTwin SCADA] Fatal startup error:', err);
  process.exit(1);
});
