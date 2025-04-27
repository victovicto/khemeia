import express from 'express';
import Resposta from '../models/desempenhos.js';
import authMiddleware from '../middleware/authid.js';

const router = express.Router();

// Rota GET /desempenho (Pega desempenho do usuário logado)
router.get('/', authMiddleware, async (req, res) => {
  const usuarioId = req.usuarioId;  // Corrigido para usar req.usuarioId

  try {
    const respostas = await Resposta.find({ usuarioId });

    if (!respostas.length) {
      return res.json({
        usuarioId,
        totalRespondidas: 0,
        totalAcertos: 0,
        totalErros: 0,
        mediaPorDia: 0.0,
        melhorDesempenho: null,
        piorDesempenho: null
      });
    }

    const totalRespondidas = respostas.length;
    const totalAcertos = respostas.filter(r => r.acertou).length;
    const totalErros = totalRespondidas - totalAcertos;

    // Agrupando respostas por dia
    const respostasPorDia = {};
    respostas.forEach(r => {
      const dia = r.data.toISOString().split('T')[0];
      if (!respostasPorDia[dia]) respostasPorDia[dia] = [];
      respostasPorDia[dia].push(r);
    });

    const mediaPorDiaRaw = totalRespondidas / Object.keys(respostasPorDia).length;
    const mediaPorDia = parseFloat(mediaPorDiaRaw.toFixed(2));

    // Analisando desempenho por assunto
    const desempenhoPorAssunto = {};
    respostas.forEach(r => {
      if (!desempenhoPorAssunto[r.assunto]) {
        desempenhoPorAssunto[r.assunto] = { acertos: 0, total: 0 };
      }
      desempenhoPorAssunto[r.assunto].total++;
      if (r.acertou) desempenhoPorAssunto[r.assunto].acertos++;
    });

    const assuntosOrdenados = Object.entries(desempenhoPorAssunto).map(([assunto, dados]) => {
      const percentual = (dados.acertos / dados.total) * 100;
      return { assunto, percentual };
    }).sort((a, b) => b.percentual - a.percentual);

    const melhorDesempenho = assuntosOrdenados[0] || null;
    const piorDesempenho = assuntosOrdenados[assuntosOrdenados.length - 1] || null;

    res.json({
      usuarioId,
      totalRespondidas,
      totalAcertos,
      totalErros,
      mediaPorDia,
      melhorDesempenho,
      piorDesempenho
    });

  } catch (error) {
    console.error('Erro ao calcular desempenho:', error);
    res.status(500).json({ erro: 'Erro ao calcular desempenho do usuário.' });
  }
});

// Rota POST /desempenho (Salvar 5 respostas do round)
router.post('/', authMiddleware, async (req, res) => {
  const usuarioId = req.usuarioId; // Corrigido para usar req.usuarioId
  const respostas = req.body.respostas; // Espera um array de respostas

  if (!Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma resposta fornecida.' });
  }

  // Validação das respostas
  const respostasValidas = respostas.every(r => {
    return (
      typeof r.acertou === 'boolean' &&
      typeof r.assunto === 'string' &&
      r.assunto.trim() !== ''
    );
  });

  if (!respostasValidas) {
    return res.status(400).json({ erro: 'Respostas inválidas fornecidas.' });
  }

  try {
    const respostasParaSalvar = respostas.map(({ assunto, acertou }) => ({
      usuarioId,
      assunto,
      acertou,
      data: new Date()  // Supondo que a data da resposta seja a data atual
    }));

    await Resposta.insertMany(respostasParaSalvar);

    res.status(201).json({ mensagem: 'Respostas salvas com sucesso.' });

  } catch (error) {
    console.error('Erro ao salvar respostas:', error);
    res.status(500).json({ erro: 'Erro ao salvar as respostas.' });
  }
});

export default router;
