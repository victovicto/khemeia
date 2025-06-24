import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.js';

const router = express.Router();

// Middleware de autenticação
const verificarToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ erro: 'Token de acesso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);
    
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    req.usuario = usuario;
    next();
  } catch (erro) {
    res.status(401).json({ erro: 'Token inválido' });
  }
};

// Cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  
  try {
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ erro: 'Email já cadastrado.' });
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

// Login
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

    const token = jwt.sign(
      { id: usuario._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

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

// Obter perfil do usuário
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select('-senha');
    res.json(usuario);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno ao buscar perfil' });
  }
});

// Atualizar perfil do usuário
router.put('/perfil', verificarToken, async (req, res) => {
  const { nome, email, senhaAtual, novaSenha } = req.body;

  try {
    const usuario = await Usuario.findById(req.usuario._id);

    // Verificar se o email já está sendo usado por outro usuário
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ 
        email, 
        _id: { $ne: usuario._id } 
      });
      
      if (emailExistente) {
        return res.status(400).json({ erro: 'Este email já está sendo usado por outro usuário' });
      }
    }

    // Atualizar nome se fornecido
    if (nome) {
      usuario.nome = nome;
    }

    // Atualizar email se fornecido
    if (email) {
      usuario.email = email;
    }

    // Atualizar senha se fornecida
    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({ erro: 'Senha atual é necessária para alterar a senha' });
      }

      const senhaAtualValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaAtualValida) {
        return res.status(400).json({ erro: 'Senha atual incorreta' });
      }

      usuario.senha = await bcrypt.hash(novaSenha, 10);
    }

    await usuario.save();

    // Retornar dados atualizados sem a senha
    const usuarioAtualizado = await Usuario.findById(usuario._id).select('-senha');
    
    res.json({
      mensagem: 'Perfil atualizado com sucesso!',
      usuario: usuarioAtualizado
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno ao atualizar perfil' });
  }
});

export default router;