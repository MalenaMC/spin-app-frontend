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
                {/* Indicador con sombra propia */}
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}>
                  <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '20px solid transparent',
                      borderRight: '20px solid transparent',
                      borderTop: '30px solid rgb(255, 223, 0)', // amarillo sólido
                      filter: 'drop-shadow(0 0 8px rgb(255, 223, 0)) drop-shadow(0 0 15px rgba(255, 223, 0, 0.5))', // sombra glow
                  }} />
                </div>

                {/* Canvas de la ruleta */}
                <canvas ref={canvasRef} id="wheelCanvas" width="400" height="400" className="drop-shadow-2xl" />

                {/* Botón central con degradado */}
                  <button
                    onClick={() => testSpin()}
                    disabled={isSpinning}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '4px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgb(255, 50, 150), rgb(128, 0, 255))', // degradado rosa → morado
                      boxShadow: '0 0 15px rgb(255,50,150), 0 0 30px rgba(128,0,255,0.6)', // glow
                      cursor: isSpinning ? 'not-allowed' : 'pointer',
                      opacity: isSpinning ? 0.5 : 1,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => { if(!isSpinning) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)' }}
                    onMouseLeave={(e) => { if(!isSpinning) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)' }}
                  >
                    <Play style={{ width: '32px', height: '32px', color: 'white', fill: 'white' }} />
                  </button>

                {/* Alerta de ganador con glow */}
                {lastWinner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    style={{
                      position: 'absolute',
                      top: '20%',
                      left: '25%',
                      transform: 'translate(-50%, -50%)',
                      width: '220px',
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(40, 44, 109, 1), rgba(39, 14, 71, 1), rgba(103, 21, 114, 1))', // degradado glow
                      border: '4px solid rgba(255, 237, 156, 1)', // borde amarillo
                      borderRadius: '16px',
                      textAlign: 'center',
                      boxShadow: `
                        0 0 10px rgba(255, 238, 0, 1),
                        0 0 25px rgba(105, 46, 119, 1),
                        0 0 40px rgba(28, 51, 100, 1),
                        0 0 15px rgba(255, 0, 242, 1)
                      `, // sombras múltiples para efecto glow
                      zIndex: 20,
                    }}
                  >
                    <p style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'rgba(255, 236, 253, 1)',
                      marginBottom: '4px',
                      textShadow: '0 0 5px rgba(255, 0, 212, 1), 0 0 5px rgba(255, 0, 255, 1)', // brillo en el texto
                    }}>
                      {lastWinner.segment?.text ?? lastWinner.text ?? lastWinner.sku ?? "—"}
                    </p>
                    <p style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'white',
                      margin: 0,
                      textShadow: '0 0 2px white, 0 0 5px rgba(255, 255, 255, 1)', // brillo leve en usuario
                    }}>
                      @{lastWinner.username ?? "Anónimo"}
                    </p>
                  </motion.div>
                )}
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
