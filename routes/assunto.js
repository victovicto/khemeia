import express from 'express';
import mongoose from 'mongoose';
import autenticarToken from '../middleware/authid.js';
import Assunto from '../models/assunto.js';

const router = express.Router();

// Rota GET para listar todos os assuntos
router.get('/', async (req, res) => {
  try {
    const assuntos = await Assunto.find({ ativo: true }).sort({ ordem: 1 });
    res.status(200).json(assuntos);
  } catch (error) {
    console.error('Erro ao buscar assuntos:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar assuntos.' });
  }
});

// Rota GET para buscar um assunto específico pelo ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID de assunto inválido.' });
    }
    
    const assunto = await Assunto.findById(id);
    
    if (!assunto) {
      return res.status(404).json({ erro: 'Assunto não encontrado.' });
    }
    
    res.status(200).json(assunto);
  } catch (error) {
    console.error('Erro ao buscar assunto específico:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar assunto.' });
  }
});

// Rota POST para criar um novo assunto (requer autenticação)
router.post('/', autenticarToken, async (req, res) => {
  try {
    const { titulo, descricao, resumo, videoUrl, questoes } = req.body;
    
    // Validações básicas
    if (!titulo || !descricao || !resumo || !videoUrl || !questoes || questoes.length === 0) {
      return res.status(400).json({ erro: 'Dados incompletos. Todos os campos são obrigatórios.' });
    }
    
    // Validação da estrutura das questões
    if (questoes.length > 5) {
      return res.status(400).json({ erro: 'Cada assunto deve ter no máximo 5 questões.' });
    }
    
    // Verificar se cada questão tem o formato esperado
    for (let i = 0; i < questoes.length; i++) {
      const questao = questoes[i];
      
      if (!questao.pergunta || !questao.alternativas || !questao.explicacao) {
        return res.status(400).json({ 
          erro: `Questão ${i+1} tem formato inválido. Cada questão deve ter pergunta, alternativas e explicação.` 
        });
      }
      
      // Verificar se há pelo menos uma alternativa correta
      const temAlternativaCorreta = questao.alternativas.some(alt => alt.correta === true);
      if (!temAlternativaCorreta) {
        return res.status(400).json({ 
          erro: `Questão ${i+1} deve ter pelo menos uma alternativa correta.` 
        });
      }
    }
    
    // Verificar se o título já existe
    const assuntoExistente = await Assunto.findOne({ titulo });
    if (assuntoExistente) {
      return res.status(400).json({ erro: 'Já existe um assunto com este título.' });
    }
    
    // Criar o novo assunto
    const novoAssunto = new Assunto({
      titulo,
      descricao,
      resumo,
      videoUrl,
      questoes,
      ordem: await Assunto.countDocuments() + 1 // Define a ordem como o próximo número disponível
    });
    
    await novoAssunto.save();
    
    res.status(201).json({ 
      mensagem: 'Assunto criado com sucesso!', 
      assunto: novoAssunto 
    });
  } catch (error) {
    console.error('Erro ao criar assunto:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ erro: error.message });
    }
    
    res.status(500).json({ erro: 'Erro interno ao criar assunto.' });
  }
});

// Rota PUT para atualizar um assunto existente (requer autenticação)
router.put('/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, resumo, videoUrl, questoes, ativo, ordem } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID de assunto inválido.' });
    }
    
    // Verificar se o assunto existe
    const assunto = await Assunto.findById(id);
    if (!assunto) {
      return res.status(404).json({ erro: 'Assunto não encontrado.' });
    }
    
    // Verificar se o título já existe em outro assunto
    if (titulo && titulo !== assunto.titulo) {
      const assuntoExistente = await Assunto.findOne({ titulo, _id: { $ne: id } });
      if (assuntoExistente) {
        return res.status(400).json({ erro: 'Já existe outro assunto com este título.' });
      }
    }
    
    // Preparar o objeto de atualização
    const assuntoAtualizado = {
      ...(titulo && { titulo }),
      ...(descricao && { descricao }),
      ...(resumo && { resumo }),
      ...(videoUrl && { videoUrl }),
      ...(questoes && { questoes }),
      ...(ativo !== undefined && { ativo }),
      ...(ordem !== undefined && { ordem }),
      updatedAt: new Date()
    };
    
    // Atualizar o assunto
    const assuntoResult = await Assunto.findByIdAndUpdate(
      id, 
      assuntoAtualizado, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      mensagem: 'Assunto atualizado com sucesso!', 
      assunto: assuntoResult 
    });
  } catch (error) {
    console.error('Erro ao atualizar assunto:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ erro: error.message });
    }
    
    res.status(500).json({ erro: 'Erro interno ao atualizar assunto.' });
  }
});

// Rota DELETE para remover um assunto (requer autenticação)
router.delete('/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID de assunto inválido.' });
    }
    
    // Verificar se o assunto existe
    const assunto = await Assunto.findById(id);
    if (!assunto) {
      return res.status(404).json({ erro: 'Assunto não encontrado.' });
    }
    
    // Em vez de excluir, apenas marcar como inativo
    await Assunto.findByIdAndUpdate(id, { ativo: false, updatedAt: new Date() });
    
    res.status(200).json({ mensagem: 'Assunto removido com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover assunto:', error);
    res.status(500).json({ erro: 'Erro interno ao remover assunto.' });
  }
});

export default router;