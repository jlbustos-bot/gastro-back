const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('debe existir la entidad productos en backend y validar referencias de grupo1prod y grupo2prod', () => {
  const requiredFiles = [
    'src/controllers/productoController.ts',
    'src/routes/productoRoutes.ts',
    'src/types/index.ts',
  ];

  requiredFiles.forEach((relativePath) => {
    const fullPath = path.join(__dirname, '..', relativePath);
    assert.ok(fs.existsSync(fullPath), `Falta el archivo: ${relativePath}`);
  });

  const controllerText = fs.readFileSync(path.join(__dirname, '..', 'src/controllers/productoController.ts'), 'utf8');
  assert.match(controllerText, /validateReference/);
  assert.match(controllerText, /grupo1prod/);
  assert.match(controllerText, /grupo2prod/);
});
