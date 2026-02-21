#!/usr/bin/env node

/**
 * Script de generación de archivos de environment
 * Lee variables del .env y las inyecta en los archivos de configuración de Angular
 *
 * Uso:
 *   ts-node scripts/set-env.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Colores para console.log
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

// Cargar variables del .env (busca en la raíz del proyecto)
const envPath = path.resolve(__dirname, '../../../.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log(`${colors.blue}📁 Cargando variables desde: ${envPath}${colors.reset}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`${colors.yellow}⚠️  Archivo .env no encontrado en: ${envPath}${colors.reset}`);
  console.log(`${colors.yellow}   Usando variables de entorno del sistema${colors.reset}`);
}

// Obtener el Client ID de Google (desde .env o environment)
const googleClientId = process.env['GOOGLE_CLIENT_ID'] || '';

// Detectar si estamos en entorno de producción
const isProduction = process.env['NODE_ENV'] === 'production' || process.env['CI'] === 'true';

if (!googleClientId) {
  const errorMsg = `❌ GOOGLE_CLIENT_ID no está configurado`;

  if (isProduction) {
    // En producción, FALLAR el build si falta la variable
    console.error(`${colors.red}${errorMsg}${colors.reset}`);
    console.error(
      `${colors.red}▶️  BUILD DETENIDO: Configure GOOGLE_CLIENT_ID en las variables de entorno${colors.reset}`,
    );
    console.error(
      `${colors.yellow}\nPasos para configurar en tu plataforma de despliegue:${colors.reset}`,
    );
    console.error(`${colors.blue}  Render:${colors.reset} Environment > Add Environment Variable`);
    console.error(`${colors.blue}  Vercel:${colors.reset} Settings > Environment Variables`);
    console.error(`${colors.blue}  Railway:${colors.reset} Variables > New Variable`);
    console.error(
      `${colors.blue}  GitHub Actions:${colors.reset} Settings > Secrets and variables > Actions\n`,
    );
    process.exit(1);
  } else {
    // En desarrollo, solo advertir
    console.log(`${colors.red}${errorMsg}${colors.reset}`);
    console.log(
      `${colors.yellow}   La aplicación funcionará pero Google Sign-In no estará disponible${colors.reset}`,
    );
  }
}

// Template para el archivo environment.ts (producción)
const environmentProdTemplate = `// Este archivo es autogenerado por scripts/set-env.ts
// NO edites este archivo manualmente - los cambios se perderán
// Para modificar valores, edita el archivo .env en la raíz del proyecto

const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId: ${JSON.stringify(googleClientId)},
};

export { environment };
`;

// Template para el archivo environment.development.ts
const environmentDevTemplate = `// Este archivo es autogenerado por scripts/set-env.ts
// NO edites este archivo manualmente - los cambios se perderán
// Para modificar valores, edita el archivo .env en la raíz del proyecto

const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  googleClientId: ${JSON.stringify(googleClientId)},
};

export { environment };
`;

// Template para el archivo environment.ts (usado en build)
const environmentBuildTemplate = `// Este archivo es autogenerado por scripts/set-env.ts
// NO edites este archivo manualmente - los cambios se perderán
// Para modificar valores, edita el archivo .env en la raíz del proyecto

const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  googleClientId: ${JSON.stringify(googleClientId)},
};

export { environment };
`;

// Paths de los archivos a generar
const environmentsDir = path.resolve(__dirname, '../src/environments');
const environmentTsPath = path.join(environmentsDir, 'environment.ts');
const environmentDevTsPath = path.join(environmentsDir, 'environment.development.ts');
const environmentProdTsPath = path.join(environmentsDir, 'environment.prod.ts');

// Crear directorio si no existe
if (!fs.existsSync(environmentsDir)) {
  fs.mkdirSync(environmentsDir, { recursive: true });
}

// Escribir archivos
try {
  fs.writeFileSync(environmentTsPath, environmentBuildTemplate, 'utf8');
  fs.writeFileSync(environmentDevTsPath, environmentDevTemplate, 'utf8');
  fs.writeFileSync(environmentProdTsPath, environmentProdTemplate, 'utf8');

  console.log(`${colors.green}✅ Archivos de environment generados correctamente:${colors.reset}`);
  console.log(`   ${colors.blue}→${colors.reset} ${environmentTsPath}`);
  console.log(`   ${colors.blue}→${colors.reset} ${environmentDevTsPath}`);
  console.log(`   ${colors.blue}→${colors.reset} ${environmentProdTsPath}`);

  if (googleClientId) {
    console.log(
      `${colors.green}✅ Google Client ID configurado: ${colors.reset}***${googleClientId.slice(-20)}`,
    );
  }

  console.log(`${colors.green}🚀 Listo para iniciar Angular${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}❌ Error al generar archivos de environment:${colors.reset}`, error);
  process.exit(1);
}
