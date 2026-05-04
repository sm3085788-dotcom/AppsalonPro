#!/usr/bin/env node

/**
 * Script de Verificación de Configuración - AppSalon Pro
 * 
 * Verifica que todo esté correctamente configurado antes de iniciar el desarrollo.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verificando configuración de AppSalon Pro...\n');

let errors = 0;
let warnings = 0;

// Verificar Node.js version
const nodeVersion = process.version;
const [major] = nodeVersion.slice(1).split('.').map(Number);

if (major < 18) {
  console.error('❌ Node.js version debe ser 18 o superior. Actual:', nodeVersion);
  errors++;
} else {
  console.log('✅ Node.js version:', nodeVersion);
}

// Verificar estructura de carpetas
const requiredDirs = [
  'apps/salon',
  'apps/clientes',
  'apps/web-catalogo',
  'shared/config',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Carpeta existe: ${dir}`);
  } else {
    console.error(`❌ Carpeta no encontrada: ${dir}`);
    errors++;
  }
});

// Verificar archivos importantes
const requiredFiles = [
  'package.json',
  'apps/salon/package.json',
  'apps/clientes/package.json',
  'apps/web-catalogo/package.json',
  'shared/config/supabaseClient.js',
  '.gitignore',
];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Archivo existe: ${file}`);
  } else {
    console.error(`❌ Archivo no encontrado: ${file}`);
    errors++;
  }
});

// Verificar node_modules
console.log('\n📦 Verificando instalación de dependencias...\n');

const appsWithDeps = [
  'apps/salon',
  'apps/clientes',
  'apps/web-catalogo',
];

appsWithDeps.forEach(app => {
  const nodeModules = path.join(__dirname, app, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    console.log(`✅ Dependencias instaladas: ${app}`);
  } else {
    console.warn(`⚠️  Dependencias no instaladas: ${app} (ejecuta: npm run install:${app.split('/')[1]})`);
    warnings++;
  }
});

// Verificar archivos .env
console.log('\n🔑 Verificando archivos de configuración...\n');

const envFiles = [
  { path: 'apps/salon/.env', name: 'App Salón' },
  { path: 'apps/clientes/.env', name: 'App Clientes' },
  { path: 'apps/web-catalogo/.env.local', name: 'Web Catálogo' },
];

envFiles.forEach(({ path: filePath, name }) => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar si tiene las variables configuradas
    if (content.includes('SUPABASE_URL=') && content.includes('SUPABASE_ANON_KEY=')) {
      const hasUrl = !content.match(/SUPABASE_URL=\s*$/m);
      const hasKey = !content.match(/SUPABASE_ANON_KEY=\s*$/m);
      
      if (hasUrl && hasKey) {
        console.log(`✅ ${name}: Credenciales configuradas`);
      } else {
        console.warn(`⚠️  ${name}: .env existe pero las credenciales están vacías`);
        warnings++;
      }
    } else {
      console.warn(`⚠️  ${name}: .env existe pero falta configuración`);
      warnings++;
    }
  } else {
    console.warn(`⚠️  ${name}: Archivo .env no encontrado (copia .env.example)`);
    warnings++;
  }
});

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 Resumen de Verificación\n');

if (errors === 0 && warnings === 0) {
  console.log('🎉 ¡Todo configurado correctamente!');
  console.log('\n✨ Puedes comenzar a desarrollar:');
  console.log('   • npm run salon:start');
  console.log('   • npm run clientes:start');
  console.log('   • npm run web:dev');
} else {
  if (errors > 0) {
    console.error(`❌ ${errors} error(es) encontrado(s)`);
  }
  if (warnings > 0) {
    console.warn(`⚠️  ${warnings} advertencia(s) encontrada(s)`);
  }
  
  console.log('\n📝 Pasos sugeridos:');
  if (warnings > 0 && errors === 0) {
    console.log('   1. Instalar dependencias: npm run install:all');
    console.log('   2. Configurar credenciales de Supabase en archivos .env');
    console.log('   3. Ejecutar nuevamente: node verify-setup.js');
  }
}

console.log('='.repeat(60) + '\n');

process.exit(errors > 0 ? 1 : 0);
