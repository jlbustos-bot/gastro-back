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
      CREATE TABLE IF NOT EXISTS menus (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
    `);
    console.log('? Tabla menus creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dishes (
        id SERIAL PRIMARY KEY,
        menu_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        available BOOLEAN DEFAULT true,
        preparation_time INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
      );
    `);
    console.log('? Tabla dishes creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL,
        user_id INTEGER,
        table_number INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('? Tabla orders creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        dish_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
      );
    `);
    console.log('? Tabla order_items creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        min_quantity DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
    `);
    console.log('? Tabla inventory creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupo1prod (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT true
      );
    `);
    console.log('? Tabla grupo1prod creada');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dishes_menu ON dishes(menu_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_menus_restaurant ON menus(restaurant_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grupo1prod_activo ON grupo1prod(activo);');
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
      await pool.query(
        'INSERT INTO grupo1prod (nombre, activo) VALUES ($1, $2)',
        ['Producto base', true]
      );
      await pool.query(
        'INSERT INTO grupo1prod (nombre, activo) VALUES ($1, $2)',
        ['Producto premium', true]
      );
      console.log('? Datos de prueba para grupo1prod insertados');
    }

    const restaurantCheck = await pool.query('SELECT COUNT(*) FROM restaurants');
    if (restaurantCheck.rows[0].count === '0') {
      const restaurantResult = await pool.query(
        'INSERT INTO restaurants (name, description, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Restaurante Principal', 'Restaurante de prueba', 'Calle Principal 123', '555-1234', 'info@gastro.com']
      );

      const restaurantId = restaurantResult.rows[0].id;

      const menuResult = await pool.query(
        'INSERT INTO menus (restaurant_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [restaurantId, 'Men� Principal', 'Men� del d�a']
      );

      const menuId = menuResult.rows[0].id;

      const dishes = [
        ['Pizza Margherita', 'Cl�sica pizza italiana', 12.99, 'Pizzas'],
        ['Hamburguesa Especial', 'Con queso y bacon', 10.99, 'Hamburguesas'],
        ['Ensalada C�sar', 'Fresca ensalada con pollo', 8.99, 'Ensaladas'],
        ['Pasta Carbonara', 'Aut�ntica receta italiana', 13.99, 'Pastas'],
      ];

      for (const dish of dishes) {
        await pool.query(
          'INSERT INTO dishes (menu_id, name, description, price, category, available) VALUES ($1, $2, $3, $4, $5, $6)',
          [menuId, dish[0], dish[1], dish[2], dish[3], true]
        );
      }
      console.log('? Datos de prueba insertados');
    }

    console.log('\n? Base de datos inicializada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
    process.exit(1);
  }
};

initDatabase();
