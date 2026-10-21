import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor Eco_Ruta escuchando en http://localhost:${env.PORT}`);
  console.log(`📋 Entorno: ${env.NODE_ENV}`);
  console.log(`🩺 Salud de API: http://localhost:${env.PORT}/api/health`);
});
