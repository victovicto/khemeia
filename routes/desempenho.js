const express = require('express');
const router = express.Router();
const Resposta = require('../models/desempenho.js');

// GET /desempenho/:usuarioId
router.get('/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;

  // Verificar se o usuarioId foi fornecido
  if (!usuarioId) {
    return res.status(400).json({ erro: 'Usuário não informado.' });
  }

  try {
    // Buscar respostas apenas do usuário específico
    const respostas = await Resposta.find({ usuarioId: usuarioId });

    // Se não houver respostas para o usuário
    if (!respostas.length) {
      return res.json({
        usuarioId: usuarioId,
        totalRespondidas: 0,
        totalAcertos: 0,
        totalErros: 0,
        mediaPorDia: 0,
        melhorDesempenho: null,
        piorDesempenho: null
      });
    }

    const totalRespondidas = respostas.length;
    const totalAcertos = respostas.filter(r => r.acertou).length;
    const totalErros = totalRespondidas - totalAcertos;

    // Agrupar por dia (formato YYYY-MM-DD)
    const respostasPorDia = {};
    respostas.forEach(r => {
      const dia = r.data.toISOString().split('T')[0];
      if (!respostasPorDia[dia]) respostasPorDia[dia] = [];
      respostasPorDia[dia].push(r);
    });
    const mediaPorDia = (totalRespondidas / Object.keys(respostasPorDia).length).toFixed(2);

    // Agrupar por assunto
    const desempenhoPorAssunto = {};
    respostas.forEach(r => {
      if (!desempenhoPorAssunto[r.assunto]) {
        desempenhoPorAssunto[r.assunto] = { acertos: 0, total: 0 };
      }
      desempenhoPorAssunto[r.assunto].total++;
      if (r.acertou) desempenhoPorAssunto[r.assunto].acertos++;
    });

    // Ordenar os assuntos pelo desempenho (maior percentual de acertos)
    const assuntosOrdenados = Object.entries(desempenhoPorAssunto).map(([assunto, dados]) => {
      const percentual = (dados.acertos / dados.total) * 100;
      return { assunto, percentual };
    }).sort((a, b) => b.percentual - a.percentual);

    const melhorDesempenho = assuntosOrdenados[0] || null;
    const piorDesempenho = assuntosOrdenados[assuntosOrdenados.length - 1] || null;

    res.json({
      usuarioId: usuarioId,
      totalRespondidas,
      totalAcertos,
      totalErros,
      mediaPorDia: parseFloat(mediaPorDia),
      melhorDesempenho,
      piorDesempenho
    });

  } catch (error) {
    console.error('Erro ao calcular desempenho:', error);
    res.status(500).json({ erro: 'Erro ao calcular desempenho do usuário.' });
  }
});

module.exports = router;
