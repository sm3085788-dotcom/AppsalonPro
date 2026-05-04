#!/usr/bin/env node

/**
 * Script de Análisis de Base de Datos Supabase
 * 
 * Este script se conecta a tu base de datos y lista:
 * - Tablas disponibles
 * - Estructura de columnas
 * - Relaciones entre tablas
 */

const { createClient } = require('@supabase/supabase-js');

// Credenciales
const SUPABASE_URL = 'https://nqqntgvoxnnohodsmdqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcW50Z3ZveG5ub2hvZHNtZHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU4OTgsImV4cCI6MjA4Nzc5MTg5OH0.iwcZas_Qrf2dpeqYrADcj2nugZT9T4q3gL1gnKqjHzQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('\n🔍 Analizando base de datos de Supabase...\n');
console.log('📊 Proyecto:', SUPABASE_URL);
console.log('─'.repeat(80));

async function analyzeDatabase() {
  try {
    // Intentar obtener información del esquema usando la API de Supabase
    console.log('\n📋 Intentando listar tablas disponibles...\n');

    // Lista de tablas comunes en sistemas de salón
    const commonTables = [
      'users', 'clientes', 'customers', 'clients',
      'citas', 'appointments', 'reservas', 'bookings',
      'servicios', 'services',
      'productos', 'products', 'inventory',
      'empleados', 'staff', 'employees',
      'pagos', 'payments',
      'categorias', 'categories'
    ];

    const foundTables = [];

    for (const tableName of commonTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          foundTables.push({ name: tableName, count: count || 0 });
        }
      } catch (e) {
        // Tabla no existe o no tenemos permiso
      }
    }

    if (foundTables.length > 0) {
      console.log('✅ Tablas encontradas:\n');
      foundTables.forEach(table => {
        console.log(`   📁 ${table.name} (${table.count} registros)`);
      });

      // Intentar obtener una muestra de datos de cada tabla
      console.log('\n📊 Analizando estructura de tablas:\n');
      
      for (const table of foundTables) {
        console.log(`\n─── ${table.name.toUpperCase()} ───`);
        
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .limit(1);

        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Columnas (${columns.length}):`, columns.join(', '));
          
          // Mostrar tipos de datos inferidos
          console.log('   Tipos de datos:');
          columns.forEach(col => {
            const value = data[0][col];
            const type = value === null ? 'null' : typeof value;
            console.log(`      • ${col}: ${type}`);
          });
        } else if (table.count === 0) {
          console.log('   ⚠️  Tabla vacía - no se puede inferir estructura');
        }
      }

      // Guardar resultados en archivo JSON
      const fs = require('fs');
      const results = {
        analyzed_at: new Date().toISOString(),
        supabase_url: SUPABASE_URL,
        tables: foundTables,
        total_tables: foundTables.length
      };

      fs.writeFileSync(
        'database-schema.json',
        JSON.stringify(results, null, 2)
      );

      console.log('\n✅ Análisis guardado en: database-schema.json');

    } else {
      console.log('⚠️  No se encontraron tablas con los nombres comunes.');
      console.log('\n💡 Esto puede significar:');
      console.log('   1. Las tablas tienen nombres diferentes');
      console.log('   2. Las políticas RLS están bloqueando el acceso');
      console.log('   3. No hay tablas creadas aún\n');
      console.log('📝 Por favor, proporciona manualmente:');
      console.log('   - Nombres de tus tablas');
      console.log('   - O el SQL schema de tu base de datos');
    }

    // Test de conexión básico
    console.log('\n🔌 Test de conexión...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  No hay sesión activa (normal para anon key)');
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }

  } catch (error) {
    console.error('\n❌ Error al analizar la base de datos:');
    console.error(error.message);
    console.log('\n💡 Soluciones posibles:');
    console.log('   1. Verifica que las credenciales sean correctas');
    console.log('   2. Asegúrate que RLS permita acceso público a las tablas');
    console.log('   3. Comparte manualmente el esquema desde Supabase Dashboard');
  }

  console.log('\n' + '─'.repeat(80));
  console.log('📋 Análisis completado\n');
}

analyzeDatabase();
