"use client"
import { useEffect, useState, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Settings, Play, Trophy } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Segment {
  id: string
  text: string
  color: string
}

interface SpinEvent {
  type: string
  username: string
  text: string
  sku: string | null
  segmentIndex: number
  segment: Segment
  timestamp: string
}

declare global {
  interface Window {
    Winwheel: any
    TweenMax: any
  }
}

export default function WheelPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastWinner, setLastWinner] = useState<SpinEvent | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [recentSpins, setRecentSpins] = useState<SpinEvent[]>([])
  const [spinQueue, setSpinQueue] = useState<SpinEvent[]>([])
  const wheelRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Conectar a Socket.io
  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"
    const newSocket = io(serverUrl)

    newSocket.on("connect", () => {
      console.log("✅ Conectado al servidor")
    })

    newSocket.on("segments-updated", (newSegments: Segment[]) => {
      console.log("📊 Segmentos actualizados:", newSegments)
      setSegments(newSegments)
    })

    newSocket.on("spin", (event: SpinEvent) => {
      console.log("🎡 Evento de giro recibido:", event)
      enqueueSpin(event)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Inicializar Winwheel cuando los segmentos estén listos
  useEffect(() => {
    if (segments.length > 0 && canvasRef.current && typeof window !== "undefined") {
      initWheel()
    }
  }, [segments])

  const initWheel = () => {
    if (!window.Winwheel || !canvasRef.current) return

    const winwheelSegments = segments.map((s) => ({
      fillStyle: s.color,
      text: s.text,
      textFillStyle: "#000",
      textFontSize: 16,
      textFontWeight: "bold",
      lineWidth: 4,
      strokeStyle: "#ffffffff",
    }))

    wheelRef.current = new window.Winwheel({
      canvasId: "wheelCanvas",
      numSegments: segments.length,
      outerRadius: 198,
      innerRadius: 30,
      segments: winwheelSegments,
      lineWidth: 4,
      strokeStyle: "#f1f16cff",
      textOrientation: "horizontal",
      textAlignment: "outer",
      textMargin: 10,
      animation: {
        type: "spinToStop",
        duration: 3,
        spins: 8,
        easing: "Power3.easeOut"
      },
    })
  }

  /*** COLA DE SPINS ***/
  const enqueueSpin = (event: SpinEvent) => {
    setSpinQueue((prev) => [...prev, event])
  }

  useEffect(() => {
    if (!isSpinning && spinQueue.length > 0) {
      const nextSpin = spinQueue[0]
      setSpinQueue((prev) => prev.slice(1))
      runSpin(nextSpin)
    }
  }, [spinQueue, isSpinning])

  const runSpin = (event: SpinEvent) => {
    if (!wheelRef.current) return

    setIsSpinning(true)

    const segmentNumber = (typeof event.segmentIndex === "number") ? event.segmentIndex + 1 : 1
    const stopAngle = wheelRef.current.getRandomForSegment(segmentNumber)

    try { wheelRef.current.stopAnimation(false) } catch (e) { /* ignore */ }

    wheelRef.current.rotationAngle = 0

    wheelRef.current.animation = {
      type: "spinToStop",
      duration: 6,
      spins: 10,
      stopAngle,
      easing: "Power4.easeOut",
      callbackFinished: (indicatedSegment: any) => {
        const finishedAt = new Date().toISOString()

        const resolvedSegment: Segment = {
          id: event.segment?.id ?? `seg_${segmentNumber}`,
          text: indicatedSegment?.text ?? event.segment?.text ?? event.text ?? `Segmento ${segmentNumber}`,
          color: indicatedSegment?.fillStyle ?? event.segment?.color ?? "#cccccc",
        }

        const winner: SpinEvent = {
          type: event.type,
          username: event.username,
          text: indicatedSegment?.text ?? event.text ?? resolvedSegment.text,
          sku: event.sku ?? null,
          segmentIndex: event.segmentIndex ?? segmentNumber - 1,
          segment: resolvedSegment,
          timestamp: finishedAt,
        }

        setLastWinner(winner)
        setRecentSpins((prev) => [winner, ...prev].slice(0, 5))
        setIsSpinning(false)
        console.log("🏆 Ganador (callback):", winner.text, "segmentNumber:", segmentNumber)
      },
    }

    if (typeof wheelRef.current.startAnimation === "function") {
      wheelRef.current.startAnimation()
    } else {
      console.error("startAnimation no es función en wheelRef.current:", wheelRef.current)
      setIsSpinning(false)
    }
  }

  const testSpin = async (sku?: string) => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"
      const response = await fetch(`${serverUrl}/api/test-spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      })
      const data = await response.json()
      console.log("Test spin:", data)
    } catch (err) {
      console.error("Error en test spin:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-purple-600 text-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-purple-800 via-purple-700 to-purple-600 border-b border-purple-500">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">Ruleta para TISTOS</h1>
          </div>
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white border border-purple-400"
          >
            <Settings className="w-5 h-5" />
            Admin
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-purple-800 via-purple-700 to-purple-600 rounded-2xl p-8 border border-purple-600 shadow-2xl">            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Indicador */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                  <div
                    className="w-0 h-0 border-l-[20px] border-l-transparent
                              border-r-[20px] border-r-transparent
                              border-t-[30px] border-t-yellow-400
                              drop-shadow-[0_0_10px_rgba(255,255,0,0.7),0_0_20px_rgba(128,0,255,0.5)]"
                  />
                </div>

                {/* Canvas de la ruleta */}
                <canvas ref={canvasRef} id="wheelCanvas" width="400" height="400" className="drop-shadow-2xl" />

                {/* Botón central */}
                <button
                  onClick={() => testSpin()}
                  disabled={isSpinning}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-pink-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white"
                >
                  <Play className="w-8 h-8 text-white" fill="white" />
                </button>

                {/* ALERTA DE GANADOR */}
                <AnimatePresence>
                  {lastWinner && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-2/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-55 p-4
                                 bg-blue-700
                                 border-4 border-yellow-400 rounded-2xl text-center
                                 shadow-[0_0_20px_rgba(255,255,0,0.7),0_0_40px_rgba(255,255,150,0.5)]
                                 z-20"
                    >
                      <p className="text-xl font-extrabold text-yellow-400 mb-1 drop-shadow-lg">
                        {lastWinner?.segment?.text ?? lastWinner?.text ?? lastWinner?.sku ?? "—"}
                      </p>
                      <p className="text-md font-bold text-white flex items-center justify-center gap-2 drop-shadow">
                        @{lastWinner.username ?? "Anónimo"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Historial + Estado */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Historial reciente */}
          <div className="bg-purple-800 rounded-2xl p-6 border border-purple-600">
            <h3 className="text-xl font-bold mb-4">Historial Reciente</h3>
            <div className="space-y-3">
              {recentSpins.length === 0 ? (
                <p className="text-purple-200 text-center py-4">No hay giros aún</p>
              ) : (
                recentSpins.map((spin, index) => (
                  <div
                    key={`${spin.timestamp}-${index}`}
                    className="bg-purple-700 rounded-lg p-3 border border-purple-500"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{spin.segment?.text ?? spin.text ?? "—"}</span>
                      <div
                        className="w-4 h-4 rounded-full border border-black"
                        style={{ backgroundColor: spin.segment?.color ?? "#444" }}
                      />
                    </div>
                    <p className="text-sm">{spin.username}</p>
                    <p className="text-xs">{spin.timestamp ? new Date(spin.timestamp).toLocaleTimeString() : "—"}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info de conexión */}
          <div className="bg-purple-800 rounded-2xl p-6 border border-purple-600">
            <h3 className="text-xl font-bold mb-4">Estado</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-purple-700 rounded-lg">
                <span>Conexión:</span>
                <span className={`font-semibold ${socket?.connected ? "text-green-400" : "text-red-400"}`}>
                  {socket?.connected ? "🟢 Conectado" : "🔴 Desconectado"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-700 rounded-lg">
                <span>Segmentos:</span>
                <span className="font-semibold">{segments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-700 rounded-lg">
                <span>Estado:</span>
                <span className="font-semibold">{isSpinning ? "🎡 Girando..." : "⏸️ Esperando"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        <AnimatePresence>
          {showAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-6xl mx-auto"
            >
              <AdminPanel segments={segments} onUpdate={setSegments} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scripts de Winwheel */}
      <script src="/js/Winwheel.min.js" async />
      <script src="/js/TweenMax.min.js" async />
    </div>
  )
}

// ------------------------- ADMIN PANEL -------------------------
function AdminPanel({ segments, onUpdate }: { segments: Segment[]; onUpdate: (segments: Segment[]) => void }) {
  const [editedSegments, setEditedSegments] = useState<Segment[]>(segments)

  useEffect(() => {
    setEditedSegments(segments)
  }, [segments])

  const handleSave = async () => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"
      const response = await fetch(`${serverUrl}/api/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedSegments),
      })
      const data = await response.json()
      console.log("Segmentos actualizados:", data)
      onUpdate(data)
    } catch (err) {
      console.error("Error al guardar segmentos:", err)
    }
  }

  return (
    <div className="bg-purple-800 border border-purple-600 rounded-2xl p-6 mt-8">
      <h2 className="text-white text-xl font-bold mb-4">Admin Panel</h2>
      <div className="space-y-4">
        {editedSegments.map((seg, idx) => (
          <div key={seg.id} className="flex gap-3 items-center">
            <input
              className="rounded-lg px-3 py-1 w-32 text-black"
              value={seg.text}
              onChange={(e) =>
                setEditedSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, text: e.target.value } : s)))
              }
            />
            <input
              type="color"
              className="w-10 h-10 p-0 border-none"
              value={seg.color}
              onChange={(e) =>
                setEditedSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, color: e.target.value } : s)))
              }
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg border border-purple-400"
      >
        Guardar Cambios
      </button>
    </div>
  )
}
