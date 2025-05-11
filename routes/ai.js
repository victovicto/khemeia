import express from 'express'; 
import togetherAPI from '../config/together.js';
import cors from 'cors';

const router = express.Router();

// Configuração do CORS para permitir requisições do frontend
router.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas (expandida)
    const allowedOrigins = [
      'https://editor-khemeia.onrender.com',
      'https://khemeia.onrender.com',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    
    console.log('Origem da requisição:', origin);
    
    // Em desenvolvimento, aceitar todas as origens
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Em produção, verificar se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Caso seja uma origem não listada, mas que inclua o domínio render.com
      if (origin && (origin.includes('render.com') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        console.log('Permitindo requisição de origem não listada mas confiável:', origin);
        callback(null, true);
      } else {
        console.error('Origem bloqueada pelo CORS:', origin);
        callback(new Error('Não permitido pelo CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization'],
  credentials: true
}));

// Endpoint: Curiosidade + aplicação do composto - PROMPT MELHORADO
router.post('/composto', async (req, res) => {
  const { nome } = req.body;

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Nome do composto não fornecido ou inválido.' });
  }

  console.log(`Recebido nome para curiosidade: ${nome}`);

  // Prompt melhorado para gerar uma resposta mais natural
  const prompt = `Para o composto químico "${nome}", escreva um parágrafo breve e interessante que:
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum ou importante na vida cotidiana
3. Se possível, adicione um fato surpreendente ou pouco conhecido

Escreva em um tom conversacional e informativo, como se estivesse explicando para um estudante curioso do ensino médio. Evite introduções como "Aqui está uma curiosidade" ou estruturas de pergunta e resposta. Mantenha o texto fluido e natural, sem exceder 4-5 frases.

IMPORTANTE: Responda SEMPRE em português brasileiro. Não use inglês ou qualquer outra língua.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const resultado = response.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
    
    // Verificação básica de idioma
    if (containsEnglishPhrases(resultado)) {
      console.warn('Possível resposta em inglês detectada:', resultado.substring(0, 50) + '...');
      
      // Tentar novamente com ênfase maior no português
      const retryPrompt = `Para o composto químico "${nome}", escreva um parágrafo breve e interessante em PORTUGUÊS BRASILEIRO (não em inglês):
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum ou importante na vida cotidiana
3. Se possível, adicione um fato surpreendente ou pouco conhecido

IMPORTANTE: Esta resposta DEVE ser em português do Brasil. NÃO responda em inglês ou qualquer outra língua.`;

      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      const retryResultado = retryResponse.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
      res.json({ resposta: retryResultado });
    } else {
      res.json({ resposta: resultado });
    }
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar resposta da IA', detalhes: err.message });
  }
});

// Endpoint para obter curiosidade para o editor de moléculas
router.post('/curiosidade-molecula', async (req, res) => {
  const { molfile, smiles, nome } = req.body;
  
  // Priorizar o uso de nome se disponível, depois molfile, depois smiles
  let identificador = nome || '';
  let tipo = 'nome';
  
  if (!identificador && molfile) {
    identificador = molfile;
    tipo = 'molfile';
  } else if (!identificador && smiles) {
    identificador = smiles;
    tipo = 'smiles';
  }

  if (!identificador) {
    return res.status(400).json({ erro: 'Dados da molécula não fornecidos.' });
  }

  console.log(`Gerando curiosidade para molécula (${tipo}): ${identificador.substring(0, 30)}...`);

  // Ajustar o prompt dependendo do tipo de entrada
  let prompt;
  if (tipo === 'nome') {
    prompt = `Para o composto químico "${identificador}", escreva um parágrafo breve e interessante que:
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum ou importante na vida cotidiana
3. Se possível, adicione um fato surpreendente ou pouco conhecido

Escreva em um tom conversacional e informativo, como se estivesse explicando para um estudante curioso do ensino médio. Evite introduções como "Aqui está uma curiosidade" ou estruturas de pergunta e resposta. Mantenha o texto fluido e natural, sem exceder 4-5 frases.

IMPORTANTE: Responda SEMPRE em português brasileiro. Não use inglês ou qualquer outra língua.`;
  } else {
    // Para molfile ou smiles
    prompt = `Analise a seguinte representação química (${tipo}):

\`\`\`
${identificador}
\`\`\`

Com base nessa estrutura molecular, escreva um parágrafo breve e interessante que:
1. Identifique o composto (se possível)
2. Contenha uma curiosidade fascinante sobre ele
3. Mencione uma aplicação comum ou importante na vida cotidiana

Escreva em um tom conversacional e informativo, como se estivesse explicando para um estudante curioso do ensino médio. Evite introduções como "Aqui está uma curiosidade" ou estruturas de pergunta e resposta. Mantenha o texto fluido e natural, sem exceder 4-5 frases.

IMPORTANTE: Responda SEMPRE em português brasileiro. Não use inglês ou qualquer outra língua.`;
  }

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const resultado = response.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
    
    // Verificação básica de idioma
    if (containsEnglishPhrases(resultado)) {
      console.warn('Possível resposta em inglês detectada, fazendo nova tentativa com ênfase em português');
      
      // Segundo prompt com ênfase ainda maior no português
      const retryPrompt = prompt + "\n\nREPITO: SUA RESPOSTA DEVE SER APENAS EM PORTUGUÊS BRASILEIRO.";
      
      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });
      
      const retryResultado = retryResponse.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
      res.json({ resposta: retryResultado });
    } else {
      res.json({ resposta: resultado });
    }
  } catch (err) {
    console.error('Erro na requisição Together AI:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar resposta da IA', detalhes: err.message });
  }
});

// Endpoint: Nome IUPAC da molécula
router.post('/nome-molecula', async (req, res) => {
  const { molfile } = req.body;

  if (typeof molfile !== 'string' || !molfile.trim()) {
    return res.status(400).json({ erro: 'Molfile não fornecido ou inválido.' });
  }

  console.log(`Recebido Molfile com ${molfile.length} caracteres.`);

  const prompt = `Analise o seguinte Molfile e forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português brasileiro (não em inglês).

Molfile:
"""${molfile}"""

IMPORTANTE: O nome DEVE ser em português do Brasil.`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 100
    });

    const nome = response.data.choices?.[0]?.message?.content?.trim() || "Nome não identificado";
    
    // Verificação básica de idioma para o nome
    if (containsEnglishWords(nome)) {
      console.warn('Possível nome em inglês detectado, fazendo nova tentativa');
      
      const retryPrompt = `Forneça o nome IUPAC em PORTUGUÊS BRASILEIRO (não em inglês) para a seguinte molécula:

Molfile:
"""${molfile}"""

IMPORTANTE: O nome deve estar em português do Brasil, não em inglês. Por exemplo, use "ácido" em vez de "acid", "etano" em vez de "ethane", etc.`;
      
      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.5,
        max_tokens: 100
      });
      
      const retryNome = retryResponse.data.choices?.[0]?.message?.content?.trim() || "Nome não identificado";
      res.json({ nome: retryNome });
    } else {
      res.json({ nome });
    }
  } catch (err) {
    console.error('Erro ao gerar nome da molécula:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar nome da molécula', detalhes: err.message });
  }
});

// Endpoint: Geração de perguntas de múltipla escolha
router.post('/gerar-perguntas', async (req, res) => {
  await gerarPerguntasHandler(req, res);
});

// Endpoint: Análise completa da molécula (nome + perguntas)
router.post('/analisar-molecula', async (req, res) => {
  // Aceitar tanto "estrutura" quanto "molfile" no corpo da requisição para compatibilidade
  const { estrutura, tipo, molfile } = req.body;
  
  // Use molfile diretamente ou a estrutura fornecida (compatibilidade com versões antigas)
  let moleculeData = molfile || estrutura || "";
  
  if (typeof moleculeData !== 'string' || !moleculeData.trim()) {
    return res.status(400).json({ erro: 'Dados da molécula não fornecidos ou inválidos.' });
  }

  // Verificar se estamos recebendo um formato alternativo (SMILES ou KET)
  let formatoOriginal = 'molfile';
  if (moleculeData.startsWith('SMILES:')) {
    formatoOriginal = 'smiles';
    console.log('Recebendo formato SMILES');
    // Extrair apenas o SMILES sem o prefixo
    moleculeData = moleculeData.replace('SMILES:', '').trim();
  } else if (moleculeData.startsWith('KET:')) {
    formatoOriginal = 'ket';
    console.log('Recebendo formato KET');
    // Extrair apenas o KET sem o prefixo
    moleculeData = moleculeData.replace('KET:', '').trim();
  } else if (moleculeData.startsWith('SVG_CAPTURE:')) {
    formatoOriginal = 'svg';
    console.log('Recebendo captura SVG');
    // Para SVG, usaremos uma molécula de backup, pois não processamos SVG diretamente
    moleculeData = "CC(=O)OC1=CC=CC=C1C(=O)O"; // Aspirina
    formatoOriginal = 'smiles';
  }

  console.log(`Analisando molécula (${formatoOriginal}) com ${moleculeData.length} caracteres...`);

  try {
    // Tratamento seguro dos dados da molécula
    const sanitizedMoleculeData = moleculeData.trim();
    
    // Ajustar prompt com base no formato recebido
    const promptBase = formatoOriginal === 'molfile' 
      ? `Analise o seguinte Molfile e`
      : formatoOriginal === 'smiles'
        ? `Analise a seguinte notação SMILES e`
        : `Analise a seguinte representação química e`;
    
    const promptNome = `${promptBase} forneça apenas o nome oficial da molécula com base na nomenclatura IUPAC, em português brasileiro (não em inglês).
Dados:
"""${sanitizedMoleculeData}"""

IMPORTANTE: O nome DEVE ser em português do Brasil.`;
    
    const promptPerguntas = gerarPromptPerguntas(sanitizedMoleculeData, formatoOriginal);

    // Executar chamadas à API em paralelo para melhor performance
    const [resNome, resPerguntas] = await Promise.all([
      togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: promptNome }],
        temperature: 0.5,
        max_tokens: 100
      }),
      togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: promptPerguntas }],
        temperature: 0.7,
        max_tokens: 1000
      })
    ]);

    // Extrair e validar respostas
    if (!resNome.data || !resNome.data.choices || !resPerguntas.data || !resPerguntas.data.choices) {
      throw new Error('Resposta incompleta da API de IA');
    }

    let nome = resNome.data.choices[0]?.message?.content?.trim() || "Nome não identificado";
    const perguntasTexto = resPerguntas.data.choices[0]?.message?.content || "";
    
    // Verificar se o nome está em inglês e corrigir se necessário
    if (containsEnglishWords(nome)) {
      console.warn('Possível nome em inglês detectado, fazendo nova tentativa');
      
      const retryPrompt = `Forneça o nome IUPAC em PORTUGUÊS BRASILEIRO (não em inglês) para a seguinte molécula:

Dados:
"""${sanitizedMoleculeData}"""

IMPORTANTE: O nome deve estar em português do Brasil, não em inglês. Por exemplo, use "ácido" em vez de "acid", "etano" em vez de "ethane", etc.`;
      
      try {
        const retryResponse = await togetherAPI.post('', {
          model: "mistralai/Mistral-7B-Instruct-v0.1",
          messages: [{ role: "user", content: retryPrompt }],
          temperature: 0.5,
          max_tokens: 100
        });
        
        nome = retryResponse.data.choices?.[0]?.message?.content?.trim() || nome;
      } catch (retryError) {
        console.error('Erro na segunda tentativa de nome:', retryError);
        // Mantém o nome original se a segunda tentativa falhar
      }
    }
    
    // Verificar se as perguntas estão em inglês e corrigir se necessário
    let perguntas = [];
    try {
      perguntas = processarPerguntasComAlternativas(perguntasTexto).filter(p => p);
      
      // Verificar se as perguntas estão em inglês
      if (containsEnglishContent(perguntas)) {
        console.warn('Possíveis perguntas em inglês detectadas, fazendo nova tentativa');
        
        const retryPrompt = `${promptPerguntas}

IMPORTANTE: TODAS as perguntas e respostas devem ser em PORTUGUÊS BRASILEIRO. NÃO use inglês!`;
        
        try {
          const retryResponse = await togetherAPI.post('', {
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [{ role: "user", content: retryPrompt }],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          const retryPerguntasTexto = retryResponse.data.choices[0]?.message?.content || "";
          const retryPerguntas = processarPerguntasComAlternativas(retryPerguntasTexto).filter(p => p);
          
          if (retryPerguntas.length > 0) {
            perguntas = retryPerguntas;
          }
        } catch (retryError) {
          console.error('Erro na segunda tentativa de perguntas:', retryError);
          // Mantém as perguntas originais se a segunda tentativa falhar
        }
      }
    } catch (err) {
      console.error('Erro ao processar perguntas:', err);
      perguntas = [];
    }
    
    // Sempre retornar um JSON válido
    res.json({ nome, perguntas });
  } catch (err) {
    console.error('Erro detalhado ao analisar molécula:', err);
    
    // Garantir uma resposta de erro consistente
    res.status(500).json({ 
      erro: 'Falha ao analisar molécula', 
      detalhes: err.message || 'Erro desconhecido no servidor' 
    });
  }
});

// Função reutilizável para geração de perguntas
async function gerarPerguntasHandler(req, res) {
  // Aceitar tanto "estrutura" quanto "molfile" no corpo da requisição para compatibilidade
  const { estrutura, molfile } = req.body;
  
  // Use molfile diretamente ou a estrutura fornecida (compatibilidade com versões antigas)
  const moleculeData = molfile || estrutura || "";
  
  if (typeof moleculeData !== 'string' || !moleculeData.trim()) {
    return res.status(400).json({ erro: 'Dados da molécula não fornecidos ou inválidos.' });
  }

  console.log(`Gerando perguntas para molécula com ${moleculeData.length} caracteres.`);

  try {
    // Sanitização dos dados da molécula
    const sanitizedMoleculeData = moleculeData.trim();
    const prompt = gerarPromptPerguntas(sanitizedMoleculeData);

    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Validar resposta da API
    if (!response.data || !response.data.choices) {
      throw new Error('Resposta inválida da API de IA');
    }

    const resultado = response.data.choices[0]?.message?.content || "";
    
    // Processar perguntas com tratamento de erro
    let perguntas = [];
    try {
      perguntas = processarPerguntasComAlternativas(resultado).filter(p => p);
      
      // Verificar se as perguntas estão em inglês
      if (containsEnglishContent(perguntas)) {
        console.warn('Possíveis perguntas em inglês detectadas, fazendo nova tentativa');
        
        const retryPrompt = `${prompt}

IMPORTANTE: TODAS as perguntas e respostas devem ser em PORTUGUÊS BRASILEIRO. NÃO use inglês!`;
        
        try {
          const retryResponse = await togetherAPI.post('', {
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [{ role: "user", content: retryPrompt }],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          const retryPerguntasTexto = retryResponse.data.choices[0]?.message?.content || "";
          const retryPerguntas = processarPerguntasComAlternativas(retryPerguntasTexto).filter(p => p);
          
          if (retryPerguntas.length > 0) {
            perguntas = retryPerguntas;
          }
        } catch (retryError) {
          console.error('Erro na segunda tentativa de perguntas:', retryError);
          // Mantém as perguntas originais se a segunda tentativa falhar
        }
      }
    } catch (err) {
      console.error('Erro ao processar texto das perguntas:', err);
      perguntas = [];
    }
    
    res.json({ perguntas });
  } catch (err) {
    console.error('Erro detalhado ao gerar perguntas:', err);
    res.status(500).json({ erro: 'Falha ao gerar perguntas', detalhes: err.message || 'Erro desconhecido' });
  }
}

// Função auxiliar para gerar prompt com validação
function gerarPromptPerguntas(moleculeData, formato = 'molfile') {
  if (!moleculeData || typeof moleculeData !== 'string') {
    console.warn('Dados da molécula inválidos recebidos na função gerarPromptPerguntas');
    return '';
  }
  
  // Ajustar texto do prompt baseado no formato
  const formatoPrompt = formato === 'molfile' 
    ? 'arquivo Molfile' 
    : formato === 'smiles' 
      ? 'código SMILES' 
      : 'representação química';
  
  return `
Analise a seguinte ${formatoPrompt}:

\`\`\`
${moleculeData.trim()}
\`\`\`

Com base na estrutura molecular, gere 5 perguntas de múltipla escolha voltadas para o ensino médio.

Cada pergunta deve conter:
- Enunciado
- Quatro alternativas (A, B, C, D)
- Indicação da resposta correta

As perguntas devem abordar:
- Grupos funcionais presentes
- Propriedades físico-químicas
- Nome IUPAC (em português)
- Aplicações práticas
- Reações típicas

Formato:
Pergunta 1: [enunciado]  
A) [alternativa A]  
B) [alternativa B]  
C) [alternativa C]  
D) [alternativa D]  
Resposta correta: [letra]

IMPORTANTE: TODAS as perguntas e respostas DEVEM ser em PORTUGUÊS BRASILEIRO.
`;
}

// Função auxiliar para estruturar perguntas com melhor tratamento de erros
function processarPerguntasComAlternativas(texto) {
  if (!texto || typeof texto !== 'string') {
    console.warn('Texto vazio ou inválido recebido para processamento de perguntas');
    return [];
  }

  try {
    // Dividir o texto em blocos de perguntas
    const blocos = texto.split(/Pergunta\s*\d+:/i).filter(b => b.trim());
    
    // Processar cada bloco
    return blocos.map(bloco => {
      try {
        // Extrair o enunciado (primeira linha)
        const enunciadoMatch = bloco.match(/^(.*?)(?:\n|$)/);
        if (!enunciadoMatch) {
          console.warn('Enunciado não encontrado em bloco de pergunta');
          return null;
        }
        
        // Extrair alternativas
        const alternativas = {};
        const alternativaRegex = /([A-D])\)\s*(.*?)(?=\s*(?:[A-D]\)|Resposta|$))/gs;
        
        let match;
        while ((match = alternativaRegex.exec(bloco)) !== null) {
          alternativas[match[1]] = match[2].trim();
        }
        
        // Se não encontrou alternativas com a regex acima, tenta outra abordagem
        if (Object.keys(alternativas).length < 4) {
          const linhas = bloco.split('\n');
          for (const linha of linhas) {
            const altMatch = linha.match(/^([A-D])\)\s*(.*)/);
            if (altMatch) {
              alternativas[altMatch[1]] = altMatch[2].trim();
            }
          }
        }

        // Extrair resposta correta
        const respostaMatch = bloco.match(/Resposta\s+correta\s*:\s*([A-D])/i);
        const respostaCorreta = respostaMatch ? respostaMatch[1].toUpperCase() : null;

        // Validar se temos todos os componentes necessários
        if (!enunciadoMatch || Object.keys(alternativas).length < 4 || !respostaCorreta) {
          console.warn("Pergunta mal formatada detectada. Detalhes:", {
            temEnunciado: !!enunciadoMatch,
            numAlternativas: Object.keys(alternativas).length,
            temResposta: !!respostaCorreta
          });
          return null;
        }

        // Objeto de pergunta válida
        return {
          enunciado: enunciadoMatch[1].trim(),
          alternativas: alternativas,
          correta: respostaCorreta
        };
      } catch (err) {
        console.error('Erro ao processar bloco de pergunta:', err);
        return null;
      }
    }).filter(Boolean); // Filtrar possíveis valores null
  } catch (err) {
    console.error('Erro geral no processarPerguntasComAlternativas:', err);
    return [];
  }
}

// Funções auxiliares para detecção de idioma
function containsEnglishPhrases(text) {
  if (!text || typeof text !== 'string') return false;
  
  const englishPhrases = [
    'this compound', 'the compound', 'is used', 'is a', 'it is', 
    'it can', 'is known', 'has been', 'was discovered', 'this molecule'
  ];
  
  return englishPhrases.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

function containsEnglishWords(text) {
  if (!text || typeof text !== 'string') return false;
  
  const englishWords = [
    'acid', 'ether', 'alcohol', 'aldehyde', 'ketone', 'ester', 'amine', 
    'amide', 'benzene', 'hydroxyl', 'compound', 'carbon', 'hydrogen', 
    'oxygen', 'nitrogen', 'sulfur', 'phosphorus', 'methyl', 'ethyl', 
    'propyl', 'butyl', 'phenyl', 'acetate', 'chloride', 'bromide', 'iodide'
  ];
  
  // Verificar se alguma palavra em inglês está presente e não é parte de outra palavra portuguesa
  return englishWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  });
}

function containsEnglishContent(perguntas) {
  if (!perguntas || !Array.isArray(perguntas) || perguntas.length === 0) return false;

  // Verificar enunciados e alternativas
  for (const pergunta of perguntas) {
    if (containsEnglishPhrases(pergunta.enunciado) || containsEnglishWords(pergunta.enunciado)) {
      return true;
    }
    
    for (const letra in pergunta.alternativas) {
      if (containsEnglishPhrases(pergunta.alternativas[letra]) || 
          containsEnglishWords(pergunta.alternativas[letra])) {
        return true;
      }
    }
  }
  
  return false;
}

// Endpoint de health-check
router.get('/ping', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;