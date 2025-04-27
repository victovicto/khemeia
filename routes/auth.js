import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';

const router = express.Router();

// Cadastro de usuário
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  const senhaHash = await bcrypt.hash(senha, 10);

  const novoUsuario = new Usuario({ nome, email, senha: senhaHash });
  await novoUsuario.save();

  res.json({ mensagem: "Usuário cadastrado com sucesso!" });
});

// Login de usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await Usuario.findOne({ email });

  if (!usuario || !await bcrypt.compare(senha, usuario.senha)) {
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Incluindo o nome do usuário junto com o ID e o token
  res.json({
    mensagem: "Login bem-sucedido",
    token,
    id: usuario._id,
    nome: usuario.nome,  
  });
});

export default router;

