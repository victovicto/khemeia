import express from 'express';
import openai from '../config/openai.js'; // Essa importação deve ser compatível com a nova configuração

const router = express.Router();

router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido.' });
  }

  const prompt = `Me fale uma curiosidade e uma aplicação do composto químico chamado "${nome}" no cotidiano.`;

  try {
    const resposta = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const resultado = resposta?.choices[0]?.message?.content || "Resposta não encontrada.";

    console.log("Resposta da IA:", resultado);

    res.json({ resposta: resultado });

  } catch (err) {
    console.error('Erro na requisição OpenAI:', err.response?.data || err.message);
    res.status(500).json({
      erro: 'Falha ao gerar resposta da IA',
      detalhes: err.message,
    });
  }
});

export default router;
