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

  console.log('Molfile recebido:', molfile.substring(0, 100) + '...'); // Log para debug (primeiros 100 caracteres)

  // Prompt melhorado para gerar perguntas mais estruturadas sobre a molécula
  const prompt = `
Analise o seguinte arquivo Molfile que representa uma estrutura molecular:

\`\`\`
${molfile}
\`\`\`

Com base nesta estrutura molecular, crie 5 perguntas de química relacionadas a essa molécula. 
As perguntas devem ser adequadas para estudantes do ensino médio e devem abordar conceitos como:
- Grupos funcionais presentes na molécula
- Propriedades físico-químicas esperadas
- Nomenclatura básica
- Aplicações práticas de moléculas similares
- Reações químicas típicas desta classe de compostos

Responda apenas com as perguntas, uma em cada linha, sem numeração ou formatação adicional. 
Não inclua alternativas ou respostas, apenas as perguntas.
`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    const resultado = response.data.choices[0].message.content || "Não foi possível gerar perguntas.";
    console.log('Resposta da IA:', resultado);

    // Processar a resposta para extrair perguntas individuais
    const perguntas = processarPerguntas(resultado);

    res.json({ perguntas });
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message });
  }
});

// Função para processar as perguntas recebidas da IA
function processarPerguntas(texto) {
  // Dividir o texto por quebras de linha e limpar
  let linhas = texto.split('\n').filter(linha => 
    linha.trim() !== '' && 
    !linha.toLowerCase().includes('```') && 
    !linha.toLowerCase().startsWith('pergunta')
  );

  // Remover qualquer numeração no início das linhas (ex: "1. ", "1)", etc.)
  linhas = linhas.map(linha => {
    return linha.replace(/^\d+[\.\)\-]\s*/, '').trim();
  });

  // Filtrar para manter apenas as linhas que parecem perguntas (terminam com "?")
  const perguntas = linhas.filter(linha => 
    linha.trim().endsWith('?') || 
    linha.includes('?')
  );

  // Limitar a 5 perguntas
  return perguntas.slice(0, 5);
}

// Endpoint para gerar o nome da molécula com IA (mantido para compatibilidade)
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

// Novo endpoint combinado para análise completa da molécula
router.post('/analisar-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (!molfile) {
    return res.status(400).json({ erro: 'Molfile não fornecido.' });
  }

  try {
    // Gerar perguntas
    const promptPerguntas = `
Analise o seguinte arquivo Molfile que representa uma estrutura molecular:

\`\`\`
${molfile}
\`\`\`

Com base nesta estrutura molecular, crie 5 perguntas de química relacionadas a essa molécula. 
As perguntas devem ser adequadas para estudantes do ensino médio e devem abordar conceitos como:
- Grupos funcionais presentes na molécula
- Propriedades físico-químicas esperadas
- Nomenclatura básica
- Aplicações práticas de moléculas similares
- Reações químicas típicas desta classe de compostos

Responda apenas com as perguntas, uma em cada linha, sem numeração ou formatação adicional.
`;

    const responsePerguntas = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: promptPerguntas }],
      temperature: 0.7,
      max_tokens: 500
    });

    const resultadoPerguntas = responsePerguntas.data.choices[0].message.content || "";
    const perguntas = processarPerguntas(resultadoPerguntas);

    res.json({
      perguntas: perguntas
    });

  } catch (err) {
    console.error('Erro na análise da molécula:', err.response?.data || err.message);
    res.status(500).json({ 
      erro: 'Falha ao analisar molécula', 
      detalhes: err.message 
    });
  }
});

export default router;