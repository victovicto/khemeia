import express from 'express';
import mongoose from 'mongoose';
import autenticarToken from '../middleware/authid.js';
import Desempenho from '../models/desempenhos.js';
import Usuario from '../models/usuario.js'; // Adicionei a importação do modelo de usuário

const router = express.Router();

// Rota GET /desempenho - Retorna o desempenho completo de um usuário
router.get('/', autenticarToken, async (req, res) => {
  const usuarioId = req.usuarioId;  // Obtendo o usuarioId do token

  // Validação do formato do usuarioId
  if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
    return res.status(400).json({ erro: 'ID de usuário inválido.' });
  }

  try {
    // Verificando se o usuário existe
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    // Agregando os dados para calcular o desempenho
    const desempenho = await Desempenho.aggregate([
      { $match: { usuarioId: mongoose.Types.ObjectId(usuarioId) } }, // Filtra pelo usuário
      { $group: { 
          _id: "$assunto",
          totalRespondidas: { $sum: 1 },
          totalAcertos: { $sum: { $cond: [{ $eq: ["$acertou", true] }, 1, 0] } },
          totalErros: { $sum: { $cond: [{ $eq: ["$acertou", false] }, 1, 0] } },
      }},
      { $project: {
          assunto: "$_id",
          totalRespondidas: 1,
          totalAcertos: 1,
          totalErros: 1,
          percentual: { $multiply: [{ $divide: ["$totalAcertos", "$totalRespondidas"] }, 100] },
      }},
      { $sort: { percentual: -1 } }  // Ordena os assuntos pelo percentual de acertos
    ]);

    // Verificando se o desempenho foi encontrado
    if (!desempenho || desempenho.length === 0) {
      return res.status(404).json({ erro: 'Desempenho não encontrado para este usuário.' });
    }

    // Calcular o melhor e pior desempenho
    const melhorDesempenho = desempenho[0];  // O primeiro será o melhor desempenho
    const piorDesempenho = desempenho[desempenho.length - 1];  // O último será o pior desempenho

    // Calcular a média diária (baseado no total de acertos e erros)
    const totalRespondidas = desempenho.reduce((acc, item) => acc + item.totalRespondidas, 0);
    const totalAcertos = desempenho.reduce((acc, item) => acc + item.totalAcertos, 0);
    const totalErros = desempenho.reduce((acc, item) => acc + item.totalErros, 0);
    const mediaPorDia = totalRespondidas > 0 ? totalRespondidas / 30 : 0;  // Supondo 30 dias de atividade

    // Enviando a resposta com o desempenho completo
    res.status(200).json({
      melhorDesempenho,
      piorDesempenho,
      totalRespondidas,
      totalAcertos,
      totalErros,
      mediaPorDia
    });

  } catch (error) {
    console.error('Erro ao carregar o desempenho:', error);
    res.status(500).json({ erro: 'Erro interno ao carregar o desempenho.' });
  }
});

 // Exemplo de rota POST que salva desempenho do usuário
router.post('/salvar', autenticarToken, async (req, res) => {
  const usuarioId = req.usuarioId;
  const { assunto, acertou, pergunta, resposta } = req.body;

  if (!assunto || typeof acertou !== 'boolean') {
    return res.status(400).json({ erro: 'Dados incompletos.' });
  }

  try {
    const novoDesempenho = new Desempenho({
      usuarioId,
      assunto,
      acertou,
      pergunta,
      resposta,
      data: new Date()
    });

    await novoDesempenho.save();

    res.status(201).json({ mensagem: 'Desempenho salvo com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar desempenho:', error);
    res.status(500).json({ erro: 'Erro interno ao salvar desempenho.' });
  }
});


export default router;