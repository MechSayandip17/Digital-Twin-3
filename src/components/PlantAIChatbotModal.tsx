import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  TrendingUp,
  Cpu,
  Layers,
  HelpCircle,
  RotateCcw,
  User,
} from 'lucide-react';
import { PlantSimulationState } from '../types/factory';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface PlantAIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationState: PlantSimulationState;
  onRepairStation?: (stationId: string) => void;
}

export const PlantAIChatbotModal: React.FC<PlantAIChatbotModalProps> = ({
  isOpen,
  onClose,
  simulationState,
  onRepairStation,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 **Hello! I am DigiTwin AI, your Manufacturing Plant Co-Pilot.**

I have real-time telemetry access to all 28 stations across the 3 processing lines (RM1 Lathe, RM2 Milling, RM3 Shaping), Final Assembly, QC, and Shipping.

Ask me anything about:
• **Active problems, equipment breakdowns, & sensor anomalies**
• **Root cause analysis & step-by-step engineering solutions**
• **Upstream bottlenecks, cycle-time balancing, & queue buildups**
• **Scrap rates in QC, Ra roughness hone issues, & dimensional tolerances**
• **OEE metrics, production pace, & unit economics**

Click one of the suggested prompts below or type your question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Gather current plant health summary
  const activeFaults = Object.values(simulationState.stations).filter(
    s => s.activeFault !== 'NONE'
  );
  const bottleneckStation = simulationState.bottleneckStationId
    ? simulationState.stations[simulationState.bottleneckStationId]
    : null;

  const quickPrompts = [
    '🚨 What active problems and machine faults exist right now, and how do I solve them?',
    '⏳ Where is the biggest production bottleneck and how should I rebalance the line?',
    '🔍 Why are workpieces being scrapped or reworked at Quality Control?',
    '📊 How is our plant OEE performing today and what is dragging it down?',
    '💰 Break down per-unit production economics, COGS, and margin',
  ];

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Prepare live plant context snapshot
    const plantContext = {
      timeSeconds: simulationState.timeSeconds,
      clock: `${simulationState.config.simulatedDate} • ${(
        simulationState.config.simulatedSecondsOfDay / 3600
      ).toFixed(2)}h`,
      dayCount: simulationState.config.simulatedDayCount,
      completedToday: simulationState.completedCount,
      arrearsUnits: simulationState.config.arrearsUnits,
      dailyTarget: simulationState.config.dailyTargetUnits,
      oee: simulationState.oee,
      activeFaultCount: activeFaults.length,
      activeFaults: activeFaults.map(f => ({
        stationId: f.id,
        name: f.name,
        line: f.line,
        activeFault: f.activeFault,
        sensors: {
          vibrationRms: f.sensors.vibrationRms,
          temperature: f.sensors.temperature,
          motorCurrent: f.sensors.motorCurrent,
          toolWearIndex: f.sensors.toolWearIndex,
        },
        status: f.status,
      })),
      bottleneck: bottleneckStation
        ? {
            id: bottleneckStation.id,
            name: bottleneckStation.name,
            currentQueue: bottleneckStation.currentQueueCount,
            utilization: bottleneckStation.utilization,
            nominalTime: bottleneckStation.nominalProcessingTime,
          }
        : null,
      qcStats: {
        qcRm1Scrap: simulationState.stations['qc_rm1']?.qcSubsystem?.check2Scrapped ?? 0,
        qcRm1Rework: simulationState.stations['qc_rm1']?.qcSubsystem?.check2SentToRework ?? 0,
        qcRm1Fpy: simulationState.stations['qc_rm1']?.qcSubsystem?.firstPassYield ?? 100,
        defectLogLength:
          simulationState.stations['qc_rm1']?.qcSubsystem?.defectAuditLog?.length ?? 0,
      },
    };

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-6).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
          plantContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || data.text || 'Diagnosis completed.';
        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error('Server returned non-200');
      }
    } catch {
      // Intelligent rule-based fallback diagnostics engine
      const fallbackReply = generateExpertDiagnostics(userText, plantContext);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Built-in industrial engineering reasoning engine
  const generateExpertDiagnostics = (prompt: string, ctx: any): string => {
    const p = prompt.toLowerCase();

    if (p.includes('problem') || p.includes('fault') || p.includes('breakdown') || p.includes('solve')) {
      if (ctx.activeFaultCount === 0) {
        return `✅ **Current Plant Status: Fully Nominal**
No acute machine breakdowns or active alarms are currently logged.

**Preventive Observations:**
• **Line Balance:** Highest infeed queue is currently at **${ctx.bottleneck ? ctx.bottleneck.name : 'CNC Lathe'}** (${ctx.bottleneck ? ctx.bottleneck.currentQueue : 0} workpieces staged).
• **Predictive Health:** Spindle vibrations and motor currents are within ISO 10816 class guidelines.
• **Recommendations:** Keep conveyor lubrication schedules updated and verify tool insert flank wear before the next shift rollover.`;
      }

      const faultList = ctx.activeFaults
        .map((f: any) => {
          let causeAndSolution = '';
          if (f.activeFault === 'SPINDLE_BEARING_VIBRATION') {
            causeAndSolution = `• **Root Cause:** Race spalling or unbalance in spindle bearing (RMS: ${f.sensors.vibrationRms.toFixed(2)} mm/s).\n• **Solution:** Trigger station maintenance to replace bearing cartridges and apply ISO VG 32 high-speed spindle lubricant.`;
          } else if (f.activeFault === 'SPINDLE_THERMAL_EXPANSION') {
            causeAndSolution = `• **Root Cause:** Coolant fluid flow starvation causing thermal jacket rise to ${f.sensors.temperature.toFixed(1)}°C.\n• **Solution:** Flush coolant lines, inspect chiller pump pressure, and trigger station maintenance.`;
          } else if (f.activeFault === 'TOOL_FLANK_WEAR') {
            causeAndSolution = `• **Root Cause:** ISO 3685 flank wear VB index reached critical limit (${f.sensors.toolWearIndex.toFixed(2)}mm).\n• **Solution:** Index or swap carbide cutting inserts to restore dimensional tolerances and reduce cutting force current.`;
          } else if (f.activeFault === 'BELT_SLIP_AND_TENSION_LOSS') {
            causeAndSolution = `• **Root Cause:** Drive pulley friction loss and belt tension decay below 380N.\n• **Solution:** Re-tension pneumatic take-up cylinder and inspect belt drive teeth.`;
          } else {
            causeAndSolution = `• **Root Cause:** Equipment fault code \`${f.activeFault}\` active.\n• **Solution:** Perform station maintenance or click "Repair All" to reset equipment state.`;
          }

          return `### 🚨 ${f.name} (${f.line})
**Fault:** \`${f.activeFault.replace(/_/g, ' ')}\`
${causeAndSolution}`;
        })
        .join('\n\n');

      return `⚠️ **I detected ${ctx.activeFaultCount} active equipment problem(s) in the manufacturing plant:**

${faultList}

**Immediate Prescriptive Action:**
Click on the affected station in the canvas or use the **"Repair All"** button in the header toolbar to execute restorative maintenance.`;
    }

    if (p.includes('bottleneck') || p.includes('balance') || p.includes('cycle') || p.includes('slow')) {
      return `⏳ **Bottleneck & Cycle-Time Diagnostic:**

**Identified Bottleneck Station:**
• **Station:** ${ctx.bottleneck ? ctx.bottleneck.name : 'Quality Control / CNC Lathe'}
• **Buffer Queue Depth:** ${ctx.bottleneck ? ctx.bottleneck.currentQueue : 0} units waiting
• **Station Utilization:** ${ctx.bottleneck ? ctx.bottleneck.utilization : 0}%

**Root Cause:**
In discrete-event manufacturing, the slowest machining operation sets the throughput ceiling for the entire line:
• CNC Lathe cycle: **6.0 min (360s)**
• CNC Milling cycle: **4.0 min (240s)**
• CNC Shaping cycle: **3.5 min (210s)**
• Final Assembly cycle: **4.0 min (240s)**

**Recommended Engineering Solutions:**
1. **Feed & Speed Optimization:** Increase CNC Lathe feed rate from 0.18 mm/rev to 0.22 mm/rev using coated TiAlN inserts to trim cycle time by ~45 seconds.
2. **Buffer Sizing:** Ensure the intermediate staging FIFO buffer capacity is set to at least 40 units to absorb upstream conveyor surges.
3. **Auto-Balance:** Click the **"Auto-Balance"** button in the Operational Optimization tab to automatically synchronize cycle durations.`;
    }

    if (p.includes('scrap') || p.includes('qc') || p.includes('rework') || p.includes('quality')) {
      return `🔍 **Quality Control Subsystem & Scrap Analysis:**

**Current QC Metrics (Today's Run):**
• **First Pass Yield (FPY):** ${ctx.qcStats.qcRm1Fpy}%
• **Scrapped Units (Check II / III):** ${ctx.qcStats.qcRm1Scrap} units condemned
• **Rework Circuit Transits:** ${ctx.qcStats.qcRm1Rework} units routed to precision honing

**Common Defect Root Causes:**
1. **Shaft Concentricity & Runout (> ±0.020 mm):** Caused by jaw chuck clamping torque decay or worn lathe tailstock centers.
2. **Surface Roughness Ra > 0.80 µm:** Occurs when carbide insert nose radius chips or when cutting fluid concentration drops below 8% Brix.
3. **Core Hardness Loss during Rework:** Parts cycled through rework excessive times may suffer thermal surface tempering.

**How to Solve:**
• Open the **QC Subsystem & Rework Circuit** modal to review real-time audit logs.
• Adjust tool wear change intervals to prevent out-of-tolerance parts before they reach Check I.
• Tighten incoming material hardness inspections at the raw material infeed block.`;
    }

    if (p.includes('oee') || p.includes('performance') || p.includes('target') || p.includes('arrears')) {
      return `📊 **Overall Equipment Effectiveness (OEE) Analysis:**

• **Overall OEE:** **${ctx.oee.overallOEE.toFixed(1)}%**
  - **Availability (A):** ${ctx.oee.availability.toFixed(1)}% (Lost time: maintenance stops & lunch break)
  - **Performance (P):** ${ctx.oee.performance.toFixed(1)}% (Cycle time adherence vs theoretical maximum)
  - **Quality (Q):** ${ctx.oee.quality.toFixed(1)}% (First pass yield vs scrap rejects)

**Progress Against Daily Target:**
• **Completed Today:** ${ctx.completedToday} / ${ctx.dailyTarget} units
• **Arrears Backlog:** ${ctx.arrearsUnits} unfulfilled units

**To elevate OEE above World-Class (>85%):**
1. Eliminate unplanned machine stops with predictive bearing lubrication.
2. Optimize conveyor speeds (Transporter RM1: 360s, RM2: 240s, RM3: 210s).
3. Ensure truck arrival stays punctual in the 08:00 AM - 10:00 AM delivery window.`;
    }

    // Default overview
    return `🏭 **DigiTwin Plant Overview (Live Telemetry):**

• **Simulated Time:** ${ctx.clock} (Day ${ctx.dayCount})
• **Overall OEE:** ${ctx.oee.overallOEE.toFixed(1)}%
• **Today's Production:** ${ctx.completedToday} finished goods completed (Target: ${ctx.dailyTarget})
• **Active Faults:** ${ctx.activeFaultCount} machine alarms
• **Primary Bottleneck:** ${ctx.bottleneck ? ctx.bottleneck.name : 'None'} (${ctx.bottleneck ? ctx.bottleneck.currentQueue : 0} queue depth)

How can I help you optimize the manufacturing line further? Try asking about **fault diagnosis**, **line balancing**, **QC defect reduction**, or **per-unit economics**!`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-cyan-950/50">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  DigiTwin AI Plant Co-Pilot
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Live Telemetry Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Industrial Diagnostics, Root Cause Analysis & Prescriptive Engineering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setMessages([
                  {
                    id: `reset-${Date.now()}`,
                    sender: 'assistant',
                    text: 'Conversation reset. How can I assist you with the manufacturing unit?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Plant Telemetry Bar */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] overflow-x-auto gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">Plant Health:</span>
            {activeFaults.length > 0 ? (
              <span className="font-bold text-rose-400 flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                {activeFaults.length} Fault(s) Active
              </span>
            ) : (
              <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Nominal
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">Bottleneck:</span>
            <span className="font-mono text-amber-300 font-bold">
              {bottleneckStation ? bottleneckStation.name : 'Balanced'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">OEE:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {simulationState.oee.overallOEE.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">Output Today:</span>
            <span className="font-mono text-emerald-300 font-bold">
              {simulationState.completedCount} / {simulationState.config.dailyTargetUnits}
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 shadow-md rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.text}
                <div
                  className={`text-[9px] mt-1.5 text-right font-mono ${
                    msg.sender === 'user' ? 'text-cyan-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse pl-10">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing plant telemetry & synthesizing solution...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex gap-2 overflow-x-auto scrollbar-thin">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 rounded-lg px-2.5 py-1 whitespace-nowrap transition flex items-center gap-1 shrink-0"
            >
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="p-3 bg-slate-800/90 border-t border-slate-700 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask about active problems, solutions, bottlenecks, OEE, scrap rates..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition shadow flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
