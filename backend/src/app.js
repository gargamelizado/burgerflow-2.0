const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middlewares/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/product.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const app = express();
const orderRoutes = require('./modules/orders/order.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    message: 'API BurgerFlow funcionando',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/estoque', inventoryRoutes);
app.use('/api/caixa', cashRoutes);
app.use('/api/pedidos', orderRoutes);
app.use('/api/cozinha', kitchenRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorMiddleware);
module.exports = app;


