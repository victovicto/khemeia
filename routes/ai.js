import express from 'express';
import togetherAPI from '../config/together.js';

const router = express.Router();

// Endpoint para fornecer curiosidades sobre o composto
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

// Endpoint para gerar perguntas sobre a molécula
router.post('/gerar-perguntas', async (req, res) => {
  const { molfile } = req.body; // Molfile ou outro formato da molécula (como SMILES)

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  // Prompt para gerar perguntas sobre a molécula
  const prompt = `Considerando a molécula representada pelo arquivo Molfile abaixo, crie 5 perguntas básicas de química sobre ela, incluindo perguntas sobre sua nomenclatura, propriedades e estrutura. Formate as perguntas como um quiz de múltipla escolha, fornecendo as alternativas e indicando a resposta correta. O arquivo Molfile é: "${molfile}". Responda em português.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500 // Ajuste conforme necessário
    });

    const resultado = response.data.choices[0].message.content || "Não foi possível gerar perguntas.";

    // Formatar a resposta para uma estrutura amigável para o Flutter
    const perguntas = formatQuizResponse(resultado);

    res.json({ perguntas });
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message });
  }
});

// Função para formatar as perguntas do quiz
function formatQuizResponse(response) {
  // Exemplo de como você pode estruturar as perguntas retornadas
  const perguntas = response.split('\n').map((linha, index) => {
    // Exemplo: linha pode ser algo como "Pergunta: O que é ... | A. Opção 1 | B. Opção 2 | C. Opção 3"
    const partes = linha.split('|');
    if (partes.length < 4) return null; // Certifique-se de que há alternativas e resposta
    return {
      pergunta: partes[0].replace('Pergunta:', '').trim(),
      alternativas: partes.slice(1, 4).map(opcao => opcao.trim()),
      respostaCorreta: partes[4]?.trim()
    };
  }).filter(p => p); // Filtra as perguntas inválidas

  return perguntas;
}
 
// Endpoint para gerar o nome da molécula com IA
router.post('/nome-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  const prompt = `Analise o seguinte Molfile e forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português. Molfile: """${molfile}""".`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 100
    });

    const nome = response.data.choices[0].message.content.trim();

    res.json({ nome });
  } catch (err) {
    console.error('Erro ao gerar nome da molécula:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar nome da molécula', detalhes: err.message });
  }
});

export default router;

