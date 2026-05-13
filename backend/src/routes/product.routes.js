const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/produtos', authenticateToken, async (req, res, next) => {
  try {
    const [produtos] = await db.query(`
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      ORDER BY nome ASC
    `);

    return res.json(produtos);
  } catch (error) {
    next(error);
  }
});

router.post('/produtos', authenticateToken, async (req, res, next) => {
  try {
    const {
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo,
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        message: 'Nome do produto é obrigatório.',
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO produtos (
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nome,
        categoria || null,
        tipo || 'simples',
        preco || 0,
        custo || 0,
        quantidade_estoque || 0,
        unidade || 'un',
        ativo ?? true,
      ]
    );

    const [produtoCriado] = await db.query(
      `
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json(produtoCriado[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/produtos/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo,
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        message: 'Nome do produto é obrigatório.',
      });
    }

    const [produtoExiste] = await db.query(
      'SELECT id FROM produtos WHERE id = ?',
      [id]
    );

    if (produtoExiste.length === 0) {
      return res.status(404).json({
        message: 'Produto não encontrado.',
      });
    }

    await db.query(
      `
      UPDATE produtos
      SET
        nome = ?,
        categoria = ?,
        tipo = ?,
        preco = ?,
        custo = ?,
        quantidade_estoque = ?,
        unidade = ?,
        ativo = ?
      WHERE id = ?
      `,
      [
        nome,
        categoria || null,
        tipo || 'simples',
        preco || 0,
        custo || 0,
        quantidade_estoque || 0,
        unidade || 'un',
        ativo ?? true,
        id,
      ]
    );

    const [produtoAtualizado] = await db.query(
      `
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      WHERE id = ?
      `,
      [id]
    );

    return res.json(produtoAtualizado[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/produtos/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [produtoExiste] = await db.query(
      'SELECT id FROM produtos WHERE id = ?',
      [id]
    );
const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/produtos', authenticateToken, async (req, res, next) => {
  try {
    const [produtos] = await db.query(`
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      ORDER BY nome ASC
    `);

    return res.json(produtos);
  } catch (error) {
    next(error);
  }
});

router.post('/produtos', authenticateToken, async (req, res, next) => {
  try {
    const {
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo,
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        message: 'Nome do produto é obrigatório.',
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO produtos (
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nome,
        categoria || null,
        tipo || 'simples',
        preco || 0,
        custo || 0,
        quantidade_estoque || 0,
        unidade || 'un',
        ativo ?? true,
      ]
    );

    const [produtoCriado] = await db.query(
      `
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json(produtoCriado[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/produtos/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      nome,
      categoria,
      tipo,
      preco,
      custo,
      quantidade_estoque,
      unidade,
      ativo,
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        message: 'Nome do produto é obrigatório.',
      });
    }

    const [produtoExiste] = await db.query(
      'SELECT id FROM produtos WHERE id = ?',
      [id]
    );

    if (produtoExiste.length === 0) {
      return res.status(404).json({
        message: 'Produto não encontrado.',
      });
    }

    await db.query(
      `
      UPDATE produtos
      SET
        nome = ?,
        categoria = ?,
        tipo = ?,
        preco = ?,
        custo = ?,
        quantidade_estoque = ?,
        unidade = ?,
        ativo = ?
      WHERE id = ?
      `,
      [
        nome,
        categoria || null,
        tipo || 'simples',
        preco || 0,
        custo || 0,
        quantidade_estoque || 0,
        unidade || 'un',
        ativo ?? true,
        id,
      ]
    );

    const [produtoAtualizado] = await db.query(
      `
      SELECT
        id,
        nome,
        categoria,
        tipo,
        preco,
        custo,
        quantidade_estoque,
        unidade,
        ativo
      FROM produtos
      WHERE id = ?
      `,
      [id]
    );

    return res.json(produtoAtualizado[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/produtos/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [produtoExiste] = await db.query(
      'SELECT id FROM produtos WHERE id = ?',
      [id]
    );

    if (produtoExiste.length === 0) {
      return res.status(404).json({
        message: 'Produto não encontrado.',
      });
    }

    await db.query(
      'DELETE FROM produtos WHERE id = ?',
      [id]
    );

    return res.json({
      message: 'Produto deletado com sucesso.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
    if (produtoExiste.length === 0) {
      return res.status(404).json({
        message: 'Produto não encontrado.',
      });
    }

    await db.query(
      'DELETE FROM produtos WHERE id = ?',
      [id]
    );

    return res.json({
      message: 'Produto deletado com sucesso.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;