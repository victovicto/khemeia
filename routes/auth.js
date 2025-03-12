import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';  // Importar JWT
import Usuario from '../models/usuario.js';

const router = express.Router();

// Login de usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await Usuario.findOne({ email });

  if (!usuario || !await bcrypt.compare(senha, usuario.senha)) {
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  // Criar token JWT
  const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ mensagem: "Login bem-sucedido", token });
});

export default router;
