/**
 * Script de semilla: llama al endpoint POST /seed del servidor.
 * Uso: npm run seed [count] [tenantId]
 * El servidor debe estar en ejecución antes de llamar a este script.
 */
import * as http from 'http';

const count = process.argv[2] ?? '50000';
const tenantId = process.argv[3] ?? '';

const path = `/seed?count=${count}${tenantId ? `&tenantId=${tenantId}` : ''}`;
const port = process.env['PORT'] ?? '3000';

const options: http.RequestOptions = {
  host: 'localhost',
  port: Number(port),
  path,
  method: 'POST',
  headers: { 'Content-Length': '0' },
};

console.log(`Sembrando ${count} registros en http://localhost:${port}${path} ...`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk: Buffer) => (data += chunk.toString()));
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data) as unknown;
      console.log('Resultado:', parsed);
    } catch {
      console.log('Respuesta:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e: Error) => {
  console.error('Error al conectar con el servidor:', e.message);
  process.exit(1);
});

req.end();
