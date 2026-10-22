const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middlewares/error.middleware');
const { AppError } = errorMiddleware;
const db = require('./config/db');
const asyncHandler = require('./utils/asyncHandler');
const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/product.routes');
const createItemTypeRoutes = require('./modules/products/itemType.routes');
const cardapioRoutes = require('./modules/products/cardapio.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const cashRoutes = require('./modules/cash/cash.routes');
const userRoutes = require('./modules/users/user.routes');
const reportRoutes = require('./modules/reports/report.routes');
const managementRoutes = require('./modules/management/management.routes');
const app = express();
const orderRoutes = require('./modules/orders/order.routes');
const kitchenRoutes = require('./modules/kitchen/kitchen.routes');
app.use(cors());
app.use(express.json());

app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    try {
      await db.testConnection();
    } catch (error) {
      if (
        ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(error.code)
      ) {
        throw new AppError(
          'Banco de dados indisponível',
          503,
          'DATABASE_UNAVAILABLE'
        );
      }

      throw error;
    }

    res.json({
      message: 'API BurgerFlow funcionando',
      database: 'connected',
    });
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/itens', productRoutes);
app.use('/api/produtos', createItemTypeRoutes('PRODUTO'));
app.use('/api/ingredientes', createItemTypeRoutes('INGREDIENTE'));
app.use('/api/combos', createItemTypeRoutes('COMBO'));
app.use('/api/promocoes', createItemTypeRoutes('PROMOCAO'));
app.use('/api/cardapio', cardapioRoutes);
app.use('/api/estoque', inventoryRoutes);
app.use('/api/caixa', cashRoutes);
app.use('/api', cashRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/gerencial', managementRoutes);
app.use('/api/gerencial/relatorios', reportRoutes);
app.use('/api/pedidos', orderRoutes);
app.use('/api/cozinha', kitchenRoutes);

app.use((req, res, next) => {
  next(
    new AppError(
      `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      404,
      'NOT_FOUND'
    )
  );
});

app.use(errorMiddleware);
module.exports = app;
