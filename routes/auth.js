import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';

const router = express.Router();

// Cadastro de usuário
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    // Verificar se o email já está cadastrado
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = new Usuario({ nome, email, senha: senhaHash });
    await novoUsuario.save();

    res.json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno ao cadastrar usuário' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      mensagem: 'Login bem-sucedido',
      token,
      id: usuario._id,
      nome: usuario.nome,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno ao realizar login' });
  }
});

export default router;
