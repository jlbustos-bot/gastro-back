const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'gastro', user: 'operador', password: 'operador' });

(async () => {
  const creado = [];
  try {
    const base = 'http://localhost:3000/api/productos';
    const login = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const { token } = await login.json();
    const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const create = await fetch(base, {
      method: 'POST', headers: H,
      body: JSON.stringify({ nombre: 'Producto Prov Test', nombrecorto: 'PPT', grupo1prod: null, grupo2prod: null, proveedor_id: 2, precioventa: 99.99, activo: true }),
    });
    const created = await create.json();
    creado.push(created.id);
    console.log('POST status:', create.status, 'id:', created.id, 'proveedor_id:', created.proveedor_id);

    const lista = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
    const rows = await lista.json();
    const found = rows.find((r) => r.id === created.id);
    console.log('GET list: proveedor_nombre en listado:', found?.proveedor_nombre);

    const update = await fetch(`${base}/${created.id}`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ ...created, proveedor_id: 1, nombre: 'Producto Prov Editado' }),
    });
    const updated = await update.json();
    console.log('PUT status:', update.status, 'proveedor_id:', updated.proveedor_id);

    const byId = await fetch(`${base}/${created.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const got = await byId.json();
    console.log('GET byId: proveedor_id:', got.proveedor_id, 'proveedor_nombre:', got.proveedor_nombre);

    const bad = await fetch(base, {
      method: 'POST', headers: H,
      body: JSON.stringify({ nombre: 'X', nombrecorto: 'X', proveedor_id: 9999, precioventa: 1, activo: true }),
    });
    console.log('POST proveedor inexistente status (esperado 400):', bad.status);

    const del = await fetch(`${base}/${created.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    console.log('DELETE status:', del.status);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    if (creado.length) {
      await pool.query('DELETE FROM productos WHERE id = ANY($1)', [creado]);
    }
    await pool.end();
  }
})();