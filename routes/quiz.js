import express from 'express';
import Question from '../models/questoes.js';

const router = express.Router();

// Retorna 5 questões aleatórias por assunto
router.get('/:assunto', async (req, res) => {
  const assunto = req.params.assunto;

  try {
    const questions = await Question.aggregate([
      { $match: { assunto } },
      { $sample: { size: 5 } }
    ]);

    res.json(questions);
  } catch (error) {
    console.error('Erro ao buscar questões:', error);
    res.status(500).json({ message: 'Erro ao buscar questões' });
  }
});

export default router;
