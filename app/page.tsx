"use client"
import { useEffect, useState, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Settings, Play, Users, Trophy } from "lucide-react"
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
      handleSpin(event)
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
    }))

    wheelRef.current = new window.Winwheel({
      canvasId: "wheelCanvas",
      numSegments: segments.length,
      outerRadius: 200,
      innerRadius: 30,
      segments: winwheelSegments,
      lineWidth: 3,
      strokeStyle: "#ffffff",
      textOrientation: "horizontal",
      textAlignment: "center",
      textMargin: 0,
      animation: {
        type: "spinToStop",
        duration: 5,
        spins: 8,
        easing: "Power3.easeOut"
      },
    })
  }

  const handleSpin = (event: SpinEvent) => {
    // si no hay wheel, o ya está girando, salimos
    if (!wheelRef.current) {
      console.warn("No hay wheelRef cuando llega evento:", event)
      return
    }
    if (isSpinning) {
      console.warn("Ignorando spin porque isSpinning=true", event)
      return
    }

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
          text:
            indicatedSegment?.text ??
            event.segment?.text ??
            event.text ??
            `Segmento ${segmentNumber}`,
          color:
            indicatedSegment?.fillStyle ??
            event.segment?.color ??
            "#cccccc",
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

        console.log("SETLAST: preparando a setLastWinner:", winner)

        setLastWinner(winner)
        setRecentSpins((prev) => {
          const newList = [winner, ...prev]
          return newList.slice(0, 5)
        })

        setIsSpinning(false)
        console.log("🏆 Ganador (callback):", winner.text, "segmentNumber:", segmentNumber)
      },
    }

    // ahora llama a la función nativa startAnimation()
    if (typeof wheelRef.current.startAnimation === "function") {
      console.log("Iniciando animación con stopAngle:", stopAngle, "segmentNumber:", segmentNumber)
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

  useEffect(() => {
    console.log("STATE lastWinner cambió:", lastWinner)
  }, [lastWinner])

  useEffect(() => {
    console.log("STATE recentSpins cambió (len):", recentSpins.length, recentSpins)
  }, [recentSpins])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Ruleta Tikfinity</h1>
          </div>
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors text-white border border-purple-400/30"
          >
            <Settings className="w-5 h-5" />
            Admin
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-purple-900/40 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Indicador */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-pink-500 drop-shadow-lg" />
                </div>

                {/* Canvas de la ruleta */}
                <canvas ref={canvasRef} id="wheelCanvas" width="400" height="400" className="drop-shadow-2xl" />

                {/* Botón central */}
                <button
                  onClick={() => testSpin()}
                  disabled={isSpinning}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white"
                >
                  <Play className="w-8 h-8 text-white" fill="white" />
                </button>
              
                {/* ALERTA DE GANADOR SOBRE LA RULETA */}
                <AnimatePresence>
                  {lastWinner && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-2/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-55 p-4 bg-purple-900/90 border-2 border-pink-400 rounded-2xl text-center shadow-2xl z-20"              >
                      <div className="flex items-center justify-center gap-3 mb-1">
                        <h2 className="text-1xl font-bold text-white">¡Ganaste</h2>
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">
                        {lastWinner?.segment?.text ?? lastWinner?.text ?? lastWinner?.sku ?? "—"}!
                      </p>
                      <p className="text-md font-bold text-white/90 flex items-center justify-center gap-2">
                        @
                        {lastWinner.username ?? "Anónimo"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              
              </div>

              {/* Botones de prueba
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => testSpin()}
                  disabled={isSpinning}
                  className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  🎲 Giro Aleatorio
                </button>
                {segments.slice(0, 3).map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => testSpin(seg.id)}
                    disabled={isSpinning}
                    className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 font-medium hover:opacity-90"
                    style={{ backgroundColor: seg.color }}
                  >
                    {seg.text}
                  </button>
                ))}
              </div>
               */}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Historial reciente */}
          <div className="bg-purple-900/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Historial Reciente</h3>
            <div className="space-y-3">
              {recentSpins.length === 0 ? (
                <p className="text-purple-200/60 text-center py-4">No hay giros aún</p>
              ) : (
                recentSpins.map((spin, index) => (
                  <motion.div
                    key={`${spin.timestamp}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-purple-800/30 rounded-lg p-3 border border-purple-400/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">{spin.segment?.text ?? spin.text ?? "—"}</span>                      <div
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: spin.segment?.color ?? "#444" }}
                      />
                    </div>
                    <p className="text-sm text-purple-200/70">{spin.username}</p>
                    <p className="text-xs text-purple-200/50">
                      {spin.timestamp ? new Date(spin.timestamp).toLocaleTimeString() : "—"}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Info de conexión */}
          <div className="bg-purple-900/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Estado</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-purple-800/30 rounded-lg">
                <span className="text-purple-200/70">Conexión:</span>
                <span className={`font-semibold ${socket?.connected ? "text-green-400" : "text-red-400"}`}>
                  {socket?.connected ? "🟢 Conectado" : "🔴 Desconectado"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-800/30 rounded-lg">
                <span className="text-purple-200/70">Segmentos:</span>
                <span className="font-semibold text-white">{segments.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-800/30 rounded-lg">
                <span className="text-purple-200/70">Estado:</span>
                <span className="font-semibold text-white">{isSpinning ? "🎡 Girando..." : "⏸️ Esperando"}</span>
              </div>
            </div>
          </div>
        </div>

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
        body: JSON.stringify({ segments: editedSegments }),
      })

      if (response.ok) {
        alert("✅ Segmentos actualizados correctamente")
        onUpdate(editedSegments)
      } else {
        alert("❌ Error al actualizar segmentos")
      }
    } catch (err) {
      console.error("Error:", err)
      alert("❌ Error de conexión")
    }
  }

  const addSegment = () => {
    const newSegment: Segment = {
      id: `SKU_${Date.now()}`,
      text: `Premio ${editedSegments.length + 1}`,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    }
    setEditedSegments([...editedSegments, newSegment])
  }

  const removeSegment = (index: number) => {
    setEditedSegments(editedSegments.filter((_, i) => i !== index))
  }

  const updateSegment = (index: number, field: keyof Segment, value: string) => {
    const updated = [...editedSegments]
    updated[index] = { ...updated[index], [field]: value }
    setEditedSegments(updated)
  }

  return (
    <div className="bg-purple-900/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
      <h2 className="text-2xl font-bold text-white mb-6">Panel de Administración</h2>

      <div className="space-y-4 mb-6">
        {editedSegments.map((seg, idx) => (
          <div key={idx} className="bg-purple-800/30 rounded-lg p-4 border border-purple-400/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-purple-200/70 mb-2 font-medium">ID (SKU)</label>
                <input
                  type="text"
                  value={seg.id}
                  onChange={(e) => updateSegment(idx, "id", e.target.value)}
                  className="w-full px-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded text-white placeholder:text-purple-300/50"
                />
              </div>
              <div>
                <label className="block text-sm text-purple-200/70 mb-2 font-medium">Texto</label>
                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => updateSegment(idx, "text", e.target.value)}
                  className="w-full px-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded text-white placeholder:text-purple-300/50"
                />
              </div>
              <div>
                <label className="block text-sm text-purple-200/70 mb-2 font-medium">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={seg.color}
                    onChange={(e) => updateSegment(idx, "color", e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-purple-400/30"
                  />
                  <input
                    type="text"
                    value={seg.color}
                    onChange={(e) => updateSegment(idx, "color", e.target.value)}
                    className="flex-1 px-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded text-white placeholder:text-purple-300/50"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeSegment(idx)}
                  className="w-full px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={addSegment}
          className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg transition-colors font-medium"
        >
          + Agregar Segmento
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors font-medium"
        >
          💾 Guardar Cambios
        </button>
      </div>

      <div className="mt-6 p-4 bg-purple-800/30 border border-purple-400/30 rounded-lg">
        <h3 className="font-bold text-white mb-2">📡 Webhook URL para Tikfinity/IFTTT:</h3>
        <code className="block bg-black/40 p-3 rounded text-pink-300 text-sm break-all">
          {process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"}/webhook/tikfinity
        </code>
        <p className="text-sm text-purple-200/70 mt-2">
          Configura esta URL en IFTTT como tu webhook endpoint. Los parámetros value1, value2, value3 se procesarán
          automáticamente.
        </p>
      </div>
    </div>
  )
}
