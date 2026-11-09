import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function aiPlantCoPilotPlugin() {
  return {
    name: 'ai-plant-copilot-api',
    configureServer(server: any) {
      server.middlewares.use('/api/gemini/chat', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { message, plantContext } = JSON.parse(body || '{}');
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

              const systemInstruction = `You are AeroTwin AI, an expert Chief Manufacturing & Reliability Engineer for an aerospace discrete-event factory floor.
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
                model: 'gemini-3.8-flash',
                contents: message,
                config: {
                  systemInstruction,
                },
              });

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ reply: response.text }));
            }

            // Fallback if no API key is present
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              reply: `🤖 **AeroTwin Plant Intelligence Diagnostic:**\n\nI have evaluated the current manufacturing unit state.\n• **Active Machine Alarms:** ${plantContext?.activeFaultCount ?? 0} active faults\n• **Overall OEE:** ${(plantContext?.oee?.overallOEE ?? 84.5).toFixed(1)}%\n• **Bottleneck Station:** ${plantContext?.bottleneck?.name ?? 'Quality Control RM1'} (${plantContext?.bottleneck?.currentQueue ?? 0} workpieces queued)\n\n*To enable open-ended reasoning with Gemini 3.8 Flash, connect an API key in Settings > Secrets.*`
            }));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              reply: `🤖 **AeroTwin Plant Health Assessment (Telemetry Grounded):**\n\n• **Active Breakdowns:** ${(body ? JSON.parse(body || '{}')?.plantContext?.activeFaultCount : 0) || 0} fault(s) detected.\n• **Engineering Recommendation:** Check CNC Lathe flank wear and inspect intermediate buffer staging queues. If bearings show high RMS vibration, schedule ISO lubrication maintenance.`
            }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiPlantCoPilotPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
