import express from 'express';
import mongoose from 'mongoose';
import autenticarToken from '../middleware/authid.js';
import Desempenho from '../models/desempenhos.js';
import Usuario from '../models/usuario.js';

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

    // Convertendo o usuarioId para ObjectId corretamente
    const usuarioObjectId = new mongoose.Types.ObjectId(usuarioId);

    // Agregando os dados para calcular o desempenho
    const desempenho = await Desempenho.aggregate([
      { $match: { usuarioId: usuarioObjectId } }, // Usando o objeto ObjectId correto
      { $group: { 
          _id: "$assunto",
          totalRespondidas: { $sum: 1 },
          totalAcertos: { $sum: { $cond: [{ $eq: ["$acertou", true] }, 1, 0] } },
          totalErros: { $sum: { $cond: [{ $eq: ["$acertou", false] }, 1, 0] } },
      }},
      { $project: {
          assunto: "$_id",
          _id: 0, // Remove o campo _id duplicado
          totalRespondidas: 1,
          totalAcertos: 1,
          totalErros: 1,
          percentual: { 
            $cond: [
              { $eq: ["$totalRespondidas", 0] }, 
              0, 
              { $multiply: [{ $divide: ["$totalAcertos", "$totalRespondidas"] }, 100] }
            ]
          },
      }},
      { $sort: { percentual: -1 } }  // Ordena os assuntos pelo percentual de acertos
    ]);

    // Se não há desempenho registrado, retornar dados vazios mas não erro
    if (!desempenho || desempenho.length === 0) {
      return res.status(200).json({
        melhorDesempenho: null,
        piorDesempenho: null,
        totalRespondidas: 0,
        totalAcertos: 0,
        totalErros: 0,
        mediaPorDia: 0
      });
    }

    // Calcular o melhor e pior desempenho
    const melhorDesempenho = desempenho[0];  // O primeiro será o melhor desempenho
    const piorDesempenho = desempenho[desempenho.length - 1];  // O último será o pior desempenho

    // Calcular a média diária (baseado no total de acertos e erros)
    const totalRespondidas = desempenho.reduce((acc, item) => acc + item.totalRespondidas, 0);
    const totalAcertos = desempenho.reduce((acc, item) => acc + item.totalAcertos, 0);
    const totalErros = desempenho.reduce((acc, item) => acc + item.totalErros, 0);
    
    // Calcular a média diária com base na data mais antiga e mais recente
    let mediaPorDia = 0;
    
    // Obter a data mais antiga e mais recente para cálculo mais preciso da média
    const registros = await Desempenho.find({ usuarioId: usuarioObjectId })
      .sort({ data: 1 })
      .limit(1);
    
    const registrosMaisRecentes = await Desempenho.find({ usuarioId: usuarioObjectId })
      .sort({ data: -1 })
      .limit(1);
      
    if (registros.length > 0 && registrosMaisRecentes.length > 0) {
      const dataMaisAntiga = new Date(registros[0].data);
      const dataMaisRecente = new Date(registrosMaisRecentes[0].data);
      
      // Diferença em milissegundos convertida para dias
      const diferencaDias = Math.max(1, Math.ceil((dataMaisRecente - dataMaisAntiga) / (1000 * 60 * 60 * 24)));
      
      mediaPorDia = totalRespondidas / diferencaDias;
    } else if (totalRespondidas > 0) {
      // Fallback: se não conseguir calcular pelas datas, usa um valor padrão
      mediaPorDia = totalRespondidas / 1; // Assumindo que é tudo do mesmo dia
    }

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
  const usuarioId = req.usuarioId; // Extraído do token pelo middleware
  const { assunto, acertou, pergunta, resposta } = req.body;

  if (!assunto || typeof acertou !== 'boolean') {
    return res.status(400).json({ erro: 'Dados incompletos.' });
  }

  try {
    const novoDesempenho = new Desempenho({
      usuarioId,
      questaoId: new mongoose.Types.ObjectId(), // Gera um novo ID para a questão
      assunto,
      acertou,
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