# Lab 8 - Documentación de Endpoints

## 1. Endpoint para loguearse
**URL:** POST http://localhost:3000/auth/login  
**Headers:** Authorization: ApiKey ggpapa, Content-Type: application/json  
**Body (JSON):** {"username": "Bryan", "password": "Secreto"}  
**Descripción:** Necesario enviar username y password válidos. Devuelve un JWT si es correcto (200 OK). Error 422 si falta usuario o contraseña.

## 2. Endpoint para lista de productos
**URL:** GET http://localhost:3000/products?page=1&limit=2  
**Headers:** Authorization: ApiKey ggpapa, Accept: application/json o application/xml  
**Query Params:** page=1, limit=2  
**Descripción:** Devuelve productos paginados (200 OK). Error 401 si falta autorización. Error 422 si page o limit no son números enteros positivos.

## 3. Endpoint para obtener el detalle de un producto
**URL:** GET http://localhost:3000/products/:id  
**Headers:** Authorization: ApiKey ggpapa, Accept: application/json o application/xml  
**Descripción:** Devuelve 200 OK si el producto existe. Error 401 si falta autorización. Error 404 si no encuentra el ID. Error 400 si el ID no es un número válido (ej. "holakhaceejejje").

## 4. Endpoint para crear un producto
**URL:** POST http://localhost:3000/products  
**Headers:** Authorization: Bearer <token>, Content-Type: application/json  
**Body (JSON):** {"name":"Mouse Gamer","sku":"MG123","price":49.99,"stock":20,"category":"Electrónica","description":"Mouse con iluminación RGB y alta precisión"}  
**Descripción:** Devuelve 201 Created si se creó correctamente. Error 400 si falta algún campo. Error 401 si falta autorización. Error 403 si el token no es de administrador o editor.

## 5. Endpoint para actualizar un producto existente
**URL:** PUT http://localhost:3000/products/:id  
**Headers:** Authorization: Bearer <token>, Content-Type: application/json  
**Body (JSON):** {"name":"Pikachu","sku":"SK3123","price":50,"stock":10,"category":"Categoria nueva","description":"Nueva descripción"}  
**Descripción:** Devuelve 200 OK si la actualización es correcta. Error 404 si no encuentra el ID. Error 401 si falta autorización o el token expiró. Error 403 si el token no es de administrador o editor. Error 422 si el ID no es válido.

## 6. Endpoint para eliminar productos
**URL:** DELETE http://localhost:3000/products/:id  
**Headers:** Authorization: Bearer <token>, Content-Type: application/json  
**Descripción:** Devuelve 200 OK si el producto se elimina correctamente. Error 401 si falta autorización o el token expiró. Error 403 si el token no es de administrador. Error 404 si no encuentra el ID.

