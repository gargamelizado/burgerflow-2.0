/**
 * @file auth.repository.js
 * @description Repository de autenticacao e usuarios, responsavel pelo acesso SQL.
 * @author BurgerFlow
 */

import db from '../../config/db.js';

class AuthRepository {
  /**
   * Busca usuario ativo por email para login.
   * @param {string} email - Email normalizado.
   * @returns {Promise<Object|undefined>}
   */
  async findActiveByEmail(email) {
    const connection = await db.getConnection();
    try {
      const [users] = await connection.query('SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE', [email]);
      return users[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Lista usuarios ativos sem retornar hash de senha.
   * @returns {Promise<Array>}
   */
  async findActiveUsers() {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.query('SELECT id, nome, email, nivel_acesso FROM usuarios WHERE ativo = TRUE');
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Cria usuario ativo.
   * @param {Object} user - Dados normalizados do usuario.
   * @returns {Promise<number>}
   */
  async createUser(user) {
    const connection = await db.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO usuarios (nome, email, senha, nivel_acesso, ativo) VALUES (?, ?, ?, ?, TRUE)',
        [user.nome, user.email, user.senha, user.nivel_acesso]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza dados cadastrais de usuario ativo.
   * @param {number|string} id - ID do usuario.
   * @param {Object} user - Dados normalizados.
   * @returns {Promise<number>}
   */
  async updateUser(id, user) {
    const connection = await db.getConnection();
    try {
      const params = [user.nome, user.email, user.nivel_acesso];
      let sql = 'UPDATE usuarios SET nome = ?, email = ?, nivel_acesso = ?';

      if (user.senha) {
        sql += ', senha = ?';
        params.push(user.senha);
      }

      sql += ' WHERE id = ? AND ativo = TRUE';
      params.push(id);

      const [result] = await connection.query(sql, params);
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }

  /**
   * Desativa usuario por exclusao logica.
   * @param {number|string} id - ID do usuario.
   * @returns {Promise<number>}
   */
  async deactivateUser(id) {
    const connection = await db.getConnection();
    try {
      const [result] = await connection.query('UPDATE usuarios SET ativo = FALSE WHERE id = ? AND ativo = TRUE', [id]);
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }
}

export default new AuthRepository();
