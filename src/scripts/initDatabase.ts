import pool from '../config/database';

const initDatabase = async () => {
  try {
    console.log('Inicializando base de datos...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'waiter',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla users creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla restaurants creada');

    await pool.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS logo TEXT;
    `);
    console.log('? Columna logo agregada a restaurants');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupo1prod (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT true
      );
    `);
    console.log('? Tabla grupo1prod creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupo2prod (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT true
      );
    `);
    console.log('? Tabla grupo2prod creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        nombrecorto VARCHAR(100) NOT NULL,
        grupo1prod INTEGER,
        grupo2prod INTEGER,
        precioventa DECIMAL(10, 2) NOT NULL DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        CONSTRAINT fk_productos_grupo1prod FOREIGN KEY (grupo1prod) REFERENCES grupo1prod(id) ON DELETE SET NULL,
        CONSTRAINT fk_productos_grupo2prod FOREIGN KEY (grupo2prod) REFERENCES grupo2prod(id) ON DELETE SET NULL
      );
    `);
    console.log('? Tabla productos creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellido VARCHAR(255) NOT NULL,
        documento VARCHAR(50),
        telefono VARCHAR(50),
        email VARCHAR(255),
        direccion VARCHAR(255),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla clientes creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mesas (
        id SERIAL PRIMARY KEY,
        numero INTEGER NOT NULL UNIQUE,
        capacidad INTEGER NOT NULL DEFAULT 1,
        ubicacion VARCHAR(100),
        estado VARCHAR(50) DEFAULT 'libre',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla mesas creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS consumos (
        id SERIAL PRIMARY KEY,
        mesa_id INTEGER NOT NULL,
        cliente_id INTEGER,
        estado VARCHAR(50) DEFAULT 'abierta',
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_consumos_mesa FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE,
        CONSTRAINT fk_consumos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
      );
    `);
    console.log('? Tabla consumos creada');

    await pool.query(`
      ALTER TABLE consumos
      ADD COLUMN IF NOT EXISTS fecha_creacion DATE;
    `);
    await pool.query(`
      ALTER TABLE consumos
      ADD COLUMN IF NOT EXISTS fecha_caja DATE;
    `);
    console.log('? Columnas fecha_creacion y fecha_caja agregadas a consumos');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS consumo_items (
        id SERIAL PRIMARY KEY,
        consumo_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
        CONSTRAINT fk_consumo_items_consumo FOREIGN KEY (consumo_id) REFERENCES consumos(id) ON DELETE CASCADE,
        CONSTRAINT fk_consumo_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      );
    `);
    console.log('? Tabla consumo_items creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medios_pago (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true
      );
    `);
    console.log('? Tabla medios_pago creada');

    await pool.query(`
      ALTER TABLE medios_pago
      ADD COLUMN IF NOT EXISTS orden INTEGER;
    `);
    console.log('? Columna orden agregada a medios_pago');

    await pool.query(`
      ALTER TABLE consumos
      ADD COLUMN IF NOT EXISTS medio_pago_id INTEGER REFERENCES medios_pago(id) ON DELETE SET NULL;
    `);
    console.log('? Columna medio_pago_id agregada a consumos');

    await pool.query(`
      ALTER TABLE productos
      ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL;
    `);
    console.log('? Columna proveedor_id agregada a productos');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS consumo_pagos (
        id SERIAL PRIMARY KEY,
        consumo_id INTEGER NOT NULL,
        medio_pago_id INTEGER NOT NULL,
        monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_consumo_pagos_consumo FOREIGN KEY (consumo_id) REFERENCES consumos(id) ON DELETE CASCADE,
        CONSTRAINT fk_consumo_pagos_medio_pago FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(id) ON DELETE RESTRICT,
        CONSTRAINT fk_consumo_pagos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('? Tabla consumo_pagos creada');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grupo1prod_activo ON grupo1prod(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grupo2prod_activo ON grupo2prod(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_mesas_estado ON mesas(estado);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumos_mesa ON consumos(mesa_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumos_cliente ON consumos(cliente_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumos_estado ON consumos(estado);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumos_fecha_caja ON consumos(fecha_caja);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_medios_pago_activo ON medios_pago(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumo_pagos_consumo ON consumo_pagos(consumo_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumo_pagos_medio_pago ON consumo_pagos(medio_pago_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_consumo_pagos_created_at ON consumo_pagos(created_at);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        cuit VARCHAR(50),
        telefono VARCHAR(50),
        email VARCHAR(255),
        direccion VARCHAR(255),
        observaciones TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla proveedores creada');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS producto_proveedor (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL,
        proveedor_id INTEGER NOT NULL,
        precio_por_litro DECIMAL(10, 2) NOT NULL DEFAULT 0,
        precio_barril DECIMAL(10, 2) NOT NULL DEFAULT 0,
        precio_venta_sugerido DECIMAL(10, 2) NOT NULL DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_producto_proveedor_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
        CONSTRAINT fk_producto_proveedor_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE,
        CONSTRAINT uq_producto_proveedor UNIQUE (producto_id, proveedor_id)
      );
    `);
    console.log('? Tabla producto_proveedor creada');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_producto_proveedor_producto ON producto_proveedor(producto_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_producto_proveedor_proveedor ON producto_proveedor(proveedor_id);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS parametros_productos (
        id SERIAL PRIMARY KEY,
        cantidad_barril_cerveza DECIMAL(10, 2) NOT NULL DEFAULT 0,
        coeficiente_precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla parametros_productos creada');
    await pool.query(`
      ALTER TABLE parametros_productos
      ALTER COLUMN coeficiente_precio_venta TYPE DECIMAL(10, 2);
    `);
    console.log('? Columna coeficiente_precio_venta ajustada a 2 decimales');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_parametros_productos_activo ON parametros_productos(activo);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS condicion_cta_cte (
        id SERIAL PRIMARY KEY,
        descripcion VARCHAR(255) NOT NULL,
        cantidad_dias INTEGER NOT NULL DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla condicion_cta_cte creada');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_condicion_cta_cte_activo ON condicion_cta_cte(activo);');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS parametros_impresion (
        id SERIAL PRIMARY KEY,
        cantidad_copias INTEGER NOT NULL DEFAULT 1,
        impresora_informes VARCHAR(255),
        impresora_ticket VARCHAR(255),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('? Tabla parametros_impresion creada');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_parametros_impresion_activo ON parametros_impresion(activo);');

    await pool.query(`
      ALTER TABLE productos
      DROP CONSTRAINT IF EXISTS fk_productos_grupo1prod;
    `);
    await pool.query(`
      ALTER TABLE productos
      ADD CONSTRAINT fk_productos_grupo1prod FOREIGN KEY (grupo1prod) REFERENCES grupo1prod(id) ON DELETE SET NULL;
    `);
    await pool.query(`
      ALTER TABLE productos
      DROP CONSTRAINT IF EXISTS fk_productos_grupo2prod;
    `);
    await pool.query(`
      ALTER TABLE productos
      ADD CONSTRAINT fk_productos_grupo2prod FOREIGN KEY (grupo2prod) REFERENCES grupo2prod(id) ON DELETE SET NULL;
    `);
    console.log('? �ndices creados');

    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);

    if (adminCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@gastro.com', 'admin123', 'admin']
      );
      console.log('? Usuario admin creado');
    } else {
      await pool.query(
        'UPDATE users SET email = $1, password = $2, role = $3 WHERE username = $4',
        ['admin@gastro.com', 'admin123', 'admin', 'admin']
      );
      console.log('? Usuario admin ajustado a credenciales por defecto');
    }

    const grupo1prodCheck = await pool.query('SELECT COUNT(*) FROM grupo1prod');
    if (grupo1prodCheck.rows[0].count === '0') {
      await pool.query('INSERT INTO grupo1prod (nombre, activo) VALUES ($1, $2)', ['Producto base', true]);
      await pool.query('INSERT INTO grupo1prod (nombre, activo) VALUES ($1, $2)', ['Producto premium', false]);
      console.log('? Datos de prueba para grupo1prod insertados');
    }

    const grupo2prodCheck = await pool.query('SELECT COUNT(*) FROM grupo2prod');
    if (grupo2prodCheck.rows[0].count === '0') {
      await pool.query('INSERT INTO grupo2prod (nombre, activo) VALUES ($1, $2)', ['Producto base 2', true]);
      await pool.query('INSERT INTO grupo2prod (nombre, activo) VALUES ($1, $2)', ['Producto premium 2', false]);
      console.log('? Datos de prueba para grupo2prod insertados');
    }

    const productosCheck = await pool.query('SELECT COUNT(*) FROM productos');
    if (productosCheck.rows[0].count === '0') {
      const grupo1Result = await pool.query('SELECT id FROM grupo1prod ORDER BY id LIMIT 1');
      const grupo2Result = await pool.query('SELECT id FROM grupo2prod ORDER BY id LIMIT 1');
      const grupo1Id = grupo1Result.rows[0]?.id ?? 1;
      const grupo2Id = grupo2Result.rows[0]?.id ?? 1;

      await pool.query('INSERT INTO productos (nombre, nombrecorto, grupo1prod, grupo2prod, precioventa, activo) VALUES ($1, $2, $3, $4, $5, $6)', ['Producto base', 'PB', grupo1Id, grupo2Id, 25.99, true]);
      await pool.query('INSERT INTO productos (nombre, nombrecorto, grupo1prod, grupo2prod, precioventa, activo) VALUES ($1, $2, $3, $4, $5, $6)', ['Producto premium', 'PP', grupo1Id, grupo2Id, 39.99, false]);
      console.log('? Datos de prueba para productos insertados');
    }

    const clientesCheck = await pool.query('SELECT COUNT(*) FROM clientes');
    if (clientesCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO clientes (nombre, apellido, documento, telefono, email, direccion, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['Juan', 'Pérez', '30111222', '555-1000', 'juan.perez@mail.com', 'Av. Siempre Viva 123', true]
      );
      await pool.query(
        'INSERT INTO clientes (nombre, apellido, documento, telefono, email, direccion, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['María', 'Gómez', '27888999', '555-2000', 'maria.gomez@mail.com', 'Calle Falsa 456', true]
      );
      console.log('? Datos de prueba para clientes insertados');
    }

    const mesasCheck = await pool.query('SELECT COUNT(*) FROM mesas');
    if (mesasCheck.rows[0].count === '0') {
      await pool.query('INSERT INTO mesas (numero, capacidad, ubicacion, estado, activo) VALUES ($1, $2, $3, $4, $5)', [1, 4, 'Salón principal', 'libre', true]);
      await pool.query('INSERT INTO mesas (numero, capacidad, ubicacion, estado, activo) VALUES ($1, $2, $3, $4, $5)', [2, 6, 'Terraza', 'libre', true]);
      console.log('? Datos de prueba para mesas insertados');
    }

    const mediosPagoCheck = await pool.query('SELECT COUNT(*) FROM medios_pago');
    if (mediosPagoCheck.rows[0].count === '0') {
      await pool.query('INSERT INTO medios_pago (nombre, descripcion, activo) VALUES ($1, $2, $3)', ['Efectivo', 'Pago en efectivo al momento de la cuenta', true]);
      await pool.query('INSERT INTO medios_pago (nombre, descripcion, activo) VALUES ($1, $2, $3)', ['Tarjeta de débito', 'Pago con tarjeta de débito', true]);
      await pool.query('INSERT INTO medios_pago (nombre, descripcion, activo) VALUES ($1, $2, $3)', ['Tarjeta de crédito', 'Pago con tarjeta de crédito', true]);
      await pool.query('INSERT INTO medios_pago (nombre, descripcion, activo) VALUES ($1, $2, $3)', ['Transferencia bancaria', 'Pago mediante transferencia', false]);
      console.log('? Datos de prueba para medios_pago insertados');
    }

    const consumoCheck = await pool.query('SELECT COUNT(*) FROM consumos');
    if (consumoCheck.rows[0].count === '0') {
      const mesaResult = await pool.query('SELECT id FROM mesas ORDER BY id LIMIT 1');
      const clienteResult = await pool.query('SELECT id FROM clientes ORDER BY id LIMIT 1');
      const productoResult = await pool.query('SELECT id, precioventa FROM productos ORDER BY id LIMIT 1');
      const mesaId = mesaResult.rows[0]?.id;
      const clienteId = clienteResult.rows[0]?.id;
      const producto = productoResult.rows[0];

      if (mesaId && producto) {
        const consumoResult = await pool.query(
          'INSERT INTO consumos (mesa_id, cliente_id, estado, total) VALUES ($1, $2, $3, $4) RETURNING id',
          [mesaId, clienteId, 'abierta', Number(producto.precioventa)]
        );
        await pool.query(
          'INSERT INTO consumo_items (consumo_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)',
          [consumoResult.rows[0].id, producto.id, 1, Number(producto.precioventa)]
        );
        await pool.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['ocupada', mesaId]);
        console.log('? Datos de prueba para consumos insertados');
      }
    }

    const proveedoresCheck = await pool.query('SELECT COUNT(*) FROM proveedores');
    if (proveedoresCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO proveedores (nombre, cuit, telefono, email, direccion, observaciones, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['Distribuidora del Norte', '30-12345678-9', '555-3000', 'ventas@distnorte.com', 'Av. Comercio 500', 'Entrega los lunes', true]
      );
      await pool.query(
        'INSERT INTO proveedores (nombre, cuit, telefono, email, direccion, observaciones, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['Bebidas y Más S.A.', '20-87654321-5', '555-4000', 'contacto@bebidasymas.com', 'Calle Gastronómica 88', '', true]
      );
      console.log('? Datos de prueba para proveedores insertados');
    }

    const productoProveedorCheck = await pool.query('SELECT COUNT(*) FROM producto_proveedor');
    if (productoProveedorCheck.rows[0].count === '0') {
      const productoResult = await pool.query('SELECT id FROM productos ORDER BY id LIMIT 1');
      const proveedorResult = await pool.query('SELECT id FROM proveedores ORDER BY id LIMIT 1');
      const productoId = productoResult.rows[0]?.id;
      const proveedorId = proveedorResult.rows[0]?.id;

      if (productoId && proveedorId) {
        await pool.query(
          'INSERT INTO producto_proveedor (producto_id, proveedor_id, precio_por_litro, precio_barril, precio_venta_sugerido, activo) VALUES ($1, $2, $3, $4, $5, $6)',
          [productoId, proveedorId, 3.5, 1200.0, 6.0, true]
        );
        console.log('? Datos de prueba para producto_proveedor insertados');
      }
    }

    const parametrosProductosCheck = await pool.query('SELECT COUNT(*) FROM parametros_productos');
    if (parametrosProductosCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO parametros_productos (cantidad_barril_cerveza, coeficiente_precio_venta, activo) VALUES ($1, $2, $3)',
        [50.0, 2.0, true]
      );
      console.log('? Datos de prueba para parametros_productos insertados');
    }

    const condicionCtaCteCheck = await pool.query('SELECT COUNT(*) FROM condicion_cta_cte');
    if (condicionCtaCteCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO condicion_cta_cte (descripcion, cantidad_dias, activo) VALUES ($1, $2, $3)',
        ['Contado', 0, true]
      );
      await pool.query(
        'INSERT INTO condicion_cta_cte (descripcion, cantidad_dias, activo) VALUES ($1, $2, $3)',
        ['Cuenta corriente a 30 días', 30, true]
      );
      await pool.query(
        'INSERT INTO condicion_cta_cte (descripcion, cantidad_dias, activo) VALUES ($1, $2, $3)',
        ['Cuenta corriente a 60 días', 60, false]
      );
      console.log('? Datos de prueba para condicion_cta_cte insertados');
    }

    const parametrosImpresionCheck = await pool.query('SELECT COUNT(*) FROM parametros_impresion');
    if (parametrosImpresionCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO parametros_impresion (cantidad_copias, impresora_informes, impresora_ticket, activo) VALUES ($1, $2, $3, $4)',
        [1, 'Microsoft Print to PDF', 'Microsoft Print to PDF', true]
      );
      console.log('? Datos de prueba para parametros_impresion insertados');
    }

    const restaurantCheck = await pool.query('SELECT COUNT(*) FROM restaurants');
    if (restaurantCheck.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO restaurants (name, description, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Restaurante Principal', 'Restaurante de prueba', 'Calle Principal 123', '555-1234', 'info@gastro.com']
      );
      console.log('? Datos de prueba para restaurants insertados');
    }

    console.log('\n? Base de datos inicializada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
    process.exit(1);
  }
};

initDatabase();
