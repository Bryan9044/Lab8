import express from 'express';
import jwt from 'jsonwebtoken';
import { readFile, writeFile } from 'fs/promises';
import { time, timeStamp } from 'console';
import path from 'path';
import { get } from 'http';


const API_KEY = "ggpapa";
const JWT_SECRET = "elbicho";

const app = express();
const port = 3000;
app.use(express.json());



//Función para leer todos los usuarios del archivo JSON
async function getUsers() {
  try {
    const data = await readFile('./db/users.json', 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}


//Función para leer todos los productos del archivo JSON
async function getProducts() {
    try {
        const data = await readFile('./db/products.json', 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}


//Función para válidar los datos del producto
function validateProduct(data, existingProducts) {
    const { name, sku, price, stock, category } = data;

    if (!name || !sku || price == null || stock == null || !category) {
        return {
            status: 422,
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: { required: ['name', 'sku', 'price', 'stock', 'category'] }
        };
    }

    if (price <= 0) {
        return {
            status: 422,
            code: 'INVALID_PRICE',
            message: 'Price must be greater than 0',
            details: { price }
        };
    }

    if (stock < 0) {
        return {
            status: 422,
            code: 'INVALID_STOCK',
            message: 'Stock must be >= 0',
            details: { stock }
        };
    }

    const exists = existingProducts.some(p => p.sku === sku);
    if (exists) {
        return {
            status: 409,
            code: 'SKU_CONFLICT',
            message: 'SKU already exists',
            details: { sku }
        };
    }

    return null; 
}

//Función para guardar los productos en el JSON
async function saveProducts(products) {
  try {
    await writeFile('./db/products.json', JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving products:", err);
    throw err;
  }
}

//Función para eliminar productos en el JSON
async function deletingProducts(id) {
  try {
    const products = await getProducts(); 
    const updatedProducts = products.filter(p => p.id !== id); 
    await writeFile('./db/products.json', JSON.stringify(updatedProducts, null, 2), 'utf8');
    return updatedProducts;
  } catch (err) {
    console.error("Error deleting product:", err);
    throw err;
  }
}


// middleware para autenticar que sea correcta la API Key
function apiKeyAuth(req, res, next) {
  const header = req.get('authorization');
  console.log("Authorization header recibido:", header);

  if (!header) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const [scheme, key] = header.split(' ');

  if (scheme !== 'ApiKey' || key.trim() !== API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key',
      expected: API_KEY,
      received: key 
    });
  }

  next();
}


// middleware para autenticar usando JWT
function jwtAuth(req, res, next) {
    const header = req.get('Authorization');
    if (!header) {
        return res.status(401).json({
            error: { message: 'Missing Authorizatiion header'},
            timeStamp: new Date().toISOString(),
            path: req.originalUrl
        });
    }
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: { message: 'Invalid Authorization format. U have to use Bearer token'},
            timeStamp: new Date().toISOString(),
            path: req.originalUrl
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({
            error: { message: 'Invalid or expired token'},
            timeStamp: new Date().toISOString(),
            path: req.originalUrl
        });
    }
}



app.post('/auth/login', apiKeyAuth, async (req, res) => {
  const { username, password } = req.body || {};
  console.log("JWT_SECRET:", JWT_SECRET);
  if (!username || !password) {
    return res.status(422).json({
      error: {
        message: 'username and password are required'
      },
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }

  const users = await getUsers();
  const user = users.find(x => x.username === username && x.password === password);
  if (!user) {
    return res.status(401).json({
      error: {
        message: 'Invalid credentials'
      },
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.status(200).json({
    data: { token },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});


// Este es el middleware que usa el next o sea se podría decir que es como el global por si los demás fallan
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const errorResponse = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong',
      details: err.details || {}
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };
  res.status(status).json(errorResponse);
});



app.get('/products', apiKeyAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum <= 0 || isNaN(limitNum) || limitNum <= 0) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Page and limit must be positive integers',
          details: { page, limit }
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    const products = await getProducts();
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginated = products.slice(startIndex, endIndex);

    const accept = req.get('Accept') || 'application/json';

    if (accept.includes('application/xml')) {
      res.set('Content-Type', 'application/xml');
      const xmlItems = paginated.map(p => `
        <product>
          <id>${p.id}</id>
          <name>${p.name}</name>
          <sku>${p.sku}</sku>
          <price>${p.price}</price>
          <stock>${p.stock}</stock>
          <category>${p.category}</category>
          <description>${p.description}</description>
        </product>
      `).join('');

      const xml = `<products>
        ${xmlItems}
        <pagination>
          <currentPage>${pageNum}</currentPage>
          <limit>${limitNum}</limit>
          <total>${products.length}</total>
          <totalPages>${Math.ceil(products.length / limitNum)}</totalPages>
        </pagination>
      </products>`;

      return res.status(200).send(xml);
    } else {
      return res.status(200).json({
        data: paginated,
        pagination: {
          currentPage: pageNum,
          limit: limitNum,
          total: products.length,
          totalPages: Math.ceil(products.length / limitNum)
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

  } catch (err) {
    next(err);
  }
});



app.get('/products/:id', apiKeyAuth, async (req, res, next) => {
    try {

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            const err = new Error('Invalid Product ID');
            err.status = 400;
            err.code = 'INVALID_ID';
            err.details = { param: 'id', received: req.params.id };
            throw err;
        }


        const products = await getProducts();


        const product = products.find(p => p.id === id);
        if(!product) {
            const err = new Error('Product Not Found');
            err.status = 404;
            err.code = 'NOT_FOUND';
            err.details = { param: 'id', received: req.params.id};
            throw err;
        }

        const accept = req.get('Accept') || 'application/json';
        if (accept.includes('application/xml')){
            res.set('Content-Type', 'application/xml');
            const xml = `<product>
            <id>${product.id}</id>
            <name>${product.name}</name>
            <description>${product.description}</description>
            </product>`;
            return res.status(200).send(xml);


        }
        return res.status(200).json({
            id: product.id,
            name: product.name,
            description: product.description,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        })


    } catch (err) {
        next(err);
    }
});


app.post('/products', jwtAuth, async (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
        return res.status(403).json({
            error: { message: 'Forbidden. You need to be an admin or an editor to access this resource'},
            timeStamp: new Date().toISOString(),
            path: req.originalUrl
        });
    }

    try {
        const products = await getProducts();
        const newProduct = req.body;

        const validationError = validateProduct(newProduct, products);
        if (validationError) {
            return res.status(validationError.status).json({
                error: validationError,
                timestamp: new Date().toISOString(),
                path: req.originalUrl
            });
        }

        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

        const productToSave = {
            id: newId,
            ...newProduct
        };

        products.push(productToSave);

        await saveProducts(products);

        return res.status(201).json({
            data: productToSave,
            message: "Product created successfully",
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        });

    } catch (err) {
        next(err);
    }
});


app.put('/products/:id', jwtAuth, async (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
        return res.status(403).json({
            error: { message: 'Forbidden. You need to be an admin or an editor to access this resource' },
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        });
    }

    try {
        const products = await getProducts();
        const productId = parseInt(req.params.id);
        const modifiedProduct = req.body;

        if (isNaN(productId)) {
            return res.status(422).json({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID', details: { id: req.params.id } },
                timestamp: new Date().toISOString(),
                path: req.originalUrl
            });
        }

        const index = products.findIndex(p => p.id === productId);
        if (index === -1) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Product not found', details: { id: productId } },
                timestamp: new Date().toISOString(),
                path: req.originalUrl
            });
        }

        const validationError = validateProduct(modifiedProduct, products.filter(p => p.id !== productId));
        if (validationError) {
            return res.status(validationError.status).json({
                error: validationError,
                timestamp: new Date().toISOString(),
                path: req.originalUrl
            });
        }

        products[index] = { id: productId, ...modifiedProduct };

        await saveProducts(products);

        return res.status(200).json({
            data: products[index],
            message: 'Product updated successfully',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        });

    } catch (err) {
        next(err);
    }
});



app.delete('/products/:id', jwtAuth, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: { message: 'Forbidden. You need to be an admin to access this resource' },
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }

  try {
    const productId = parseInt(req.params.id, 10);

    if (isNaN(productId)) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid product ID', details: { id: req.params.id } },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    const products = await getProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Product not found', details: { id: productId } },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    const updatedProducts = await deletingProducts(productId);

    return res.status(200).json({
      data: product,
      message: 'Product deleted successfully',
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });

  } catch (err) {
    next(err);
  }
});








app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});