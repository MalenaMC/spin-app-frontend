const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001"

async function sendTestWebhook(sku = null) {
  const payload = {
    value1: "TestUser123", // username
    value2: "Test gift", // text/message
    value3: sku, // SKU del regalo (null = aleatorio)
    secret: process.env.TIKFINITY_SECRET || "tu_token_secreto_aqui",
  }

  console.log("📤 Enviando webhook de prueba...")
  console.log("Payload:", payload)

  try {
    const response = await fetch(`${SERVER_URL}/webhook/tikfinity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tikfinity-token": payload.secret,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    console.log("✅ Respuesta:", data)
  } catch (err) {
    console.error("❌ Error:", err.message)
  }
}

// Obtener SKU desde argumentos de línea de comandos
const sku = process.argv[2] || null

console.log("🎡 Test de Webhook Tikfinity")
console.log("SKU:", sku || "Aleatorio")
console.log("---")

sendTestWebhook(sku)