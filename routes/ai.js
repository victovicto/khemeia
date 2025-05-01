import express from 'express';
import togetherAPI from '../config/together.js';

const router = express.Router();

router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido.' });
  }

  const prompt = `Me fale uma curiosidade em relação ao composto que seja interessante ao estudante de ensino médio e uma aplicação do composto químico chamado "${nome}" no cotidiano, e responda em português.`;


  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const resultado = response.data.choices[0].message.content || "Resposta não encontrada";

    res.json({ resposta: resultado });
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar resposta da IA', detalhes: err.message });
  }
});

export default router;
