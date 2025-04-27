import express from 'express';
import Resposta from '../models/desempenhos.js';

const router = express.Router();

// Rota GET /desempenho/:usuarioId (para obter o desempenho do usuário)
router.get('/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;

  if (!usuarioId) {
    return res.status(400).json({ erro: 'Usuário não informado.' });
  }

  try {
    const respostas = await Resposta.find({ usuarioId });

    if (!respostas.length) {
      return res.json({
        usuarioId,
        totalRespondidas: 0,
        totalAcertos: 0,
        totalErros: 0,
        mediaPorDia: 0.0, // agora como double mesmo sem respostas
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

    // Calculando média por dia
    const mediaPorDiaRaw = totalRespondidas / Object.keys(respostasPorDia).length;
    const mediaPorDia = parseFloat(mediaPorDiaRaw.toFixed(2)); // sempre envia double

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

// Rota POST /desempenho (para salvar as respostas)
router.post('/', async (req, res) => {
  const { usuarioId, assunto, acertou } = req.body;

  if (!usuarioId || !assunto || acertou === undefined) {
    return res.status(400).json({ erro: 'Dados inválidos ou ausentes.' });
  }

  try {
    // Criando uma nova resposta no banco
    const novaResposta = new Resposta({
      usuarioId,
      assunto,
      acertou,
    });

    // Salvando no banco
    await novaResposta.save();

    res.status(201).json({ message: 'Resposta salva com sucesso.' });

  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    res.status(500).json({ erro: 'Erro ao salvar a resposta.' });
  }
});

export default router;
