import express from 'express';
import Assunto from '../models/assunto.js';

const router = express.Router();

// Rota principal: busca por título e retorna resumo, vídeo e questões
router.get('/:titulo', async (req, res) => {
  try {
    const { titulo } = req.params;

    const assunto = await Assunto.findOne({ titulo, ativo: true });

    if (!assunto) {
      return res.status(404).json({ erro: 'Assunto não encontrado.' });
    }

    const { resumo, videoUrl, questoes } = assunto;

    res.status(200).json({
      resumo,
      videoUrl,
      questoes
    });
  } catch (error) {
    console.error('Erro ao buscar assunto:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar assunto.' });
  }
});

export default router;
