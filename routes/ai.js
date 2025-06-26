import express from 'express'; 
import togetherAPI from '../config/together.js';
import cors from 'cors';

const router = express.Router();

// Configuração do CORS para permitir requisições do frontend
router.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'https://khemeia-osra.onrender.com',
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

// Endpoint principal: Análise da molécula com nome - gera curiosidade + quiz
router.post('/analisar-molecula', async (req, res) => {
  const { moleculeName, additionalInfo, source, method } = req.body;

  if (typeof moleculeName !== 'string' || !moleculeName.trim()) {
    return res.status(400).json({ erro: 'Nome da molécula não fornecido ou inválido.' });
  }

  console.log(`Analisando molécula: ${moleculeName}`);
  console.log(`Informações adicionais: ${additionalInfo || 'N/A'}`);
  console.log(`Fonte: ${source || 'N/A'}, Método: ${method || 'N/A'}`);

  try {
    // Executar análise da curiosidade e quiz em paralelo
    const [curiosidadeResult, quizResult] = await Promise.all([
      gerarCuriosidade(moleculeName),
      gerarQuiz(moleculeName)
    ]);

    const response = {
      nome: moleculeName,
      curiosidade: curiosidadeResult,
      perguntas: quizResult,
      metadata: {
        source: source || 'Desconhecido',
        method: method || 'Desconhecido',
        additionalInfo: additionalInfo || null,
        processedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Erro ao analisar molécula:', err);
    res.status(500).json({ 
      erro: 'Falha ao analisar molécula', 
      detalhes: err.message || 'Erro desconhecido no servidor' 
    });
  }
});

// Endpoint alternativo: Apenas curiosidade da molécula
router.post('/curiosidade-molecula', async (req, res) => {
  const { moleculeName, nome } = req.body;
  
  // Aceitar tanto 'moleculeName' quanto 'nome' para compatibilidade
  const nomeComposto = moleculeName || nome;

  if (typeof nomeComposto !== 'string' || !nomeComposto.trim()) {
    return res.status(400).json({ erro: 'Nome da molécula não fornecido ou inválido.' });
  }

  console.log(`Gerando curiosidade para: ${nomeComposto}`);

  try {
    const curiosidade = await gerarCuriosidade(nomeComposto);
    res.json({ resposta: curiosidade });
  } catch (err) {
    console.error('Erro ao gerar curiosidade:', err);
    res.status(500).json({ 
      erro: 'Falha ao gerar curiosidade da molécula', 
      detalhes: err.message 
    });
  }
});

// Função para gerar curiosidade da molécula
async function gerarCuriosidade(nomeComposto) {
  const prompt = `Para o composto químico "${nomeComposto}", escreva um parágrafo breve e interessante que:
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

    let resultado = response.data.choices?.[0]?.message?.content || "Resposta não encontrada.";
    
    // Verificação básica de idioma e correção se necessário
    if (containsEnglishPhrases(resultado)) {
      console.warn('Resposta em inglês detectada, fazendo nova tentativa...');
      
      const retryPrompt = `Para o composto químico "${nomeComposto}", escreva um parágrafo breve e interessante em PORTUGUÊS BRASILEIRO (não em inglês):
1. Contenha uma curiosidade fascinante sobre o composto
2. Mencione uma aplicação comum na vida cotidiana
3. Adicione um fato surpreendente

IMPORTANTE: Esta resposta DEVE ser em português do Brasil. NÃO responda em inglês.`;

      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      resultado = retryResponse.data.choices?.[0]?.message?.content || resultado;
    }

    return resultado;
  } catch (error) {
    console.error('Erro na API Together AI (curiosidade):', error);
    throw new Error('Falha ao gerar curiosidade: ' + error.message);
  }
}

async function gerarQuiz(nomeComposto) {
  const prompt = `Gere exatamente 5 questões de múltipla escolha no estilo ENEM, em português brasileiro, sobre o composto "${nomeComposto}".

FORMATO OBRIGATÓRIO para cada questão:

QUESTÃO 1:
[Enunciado da questão aqui]

A) [alternativa A]
B) [alternativa B] 
C) [alternativa C]
D) [alternativa D]

RESPOSTA: [A, B, C ou D]

---

QUESTÃO 2:
[Enunciado da questão aqui]

A) [alternativa A]
B) [alternativa B]
C) [alternativa C] 
D) [alternativa D]

RESPOSTA: [A, B, C ou D]

---

[Continue este padrão para as 5 questões]

IMPORTANTE:
- Use APENAS português brasileiro
- Aborde química orgânica (funções, polaridade, ligações, propriedades, isomeria)
- Use nomenclatura IUPAC em português
- Separe cada questão com "---"
- Seja preciso cientificamente`;

  try {
    const response = await togetherAPI.post('', {
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000 // Aumentado para comportar 5 questões
    });

    let perguntasTexto = response.data.choices?.[0]?.message?.content || "";
    
    // Verificar se as perguntas estão em inglês
    if (containsEnglishPhrases(perguntasTexto)) {
      console.warn('Perguntas em inglês detectadas, fazendo nova tentativa...');
      
      const retryPrompt = `${prompt}

ATENÇÃO CRÍTICA: TODAS as questões devem ser em PORTUGUÊS BRASILEIRO! Não use uma palavra sequer em inglês!`;
      
      const retryResponse = await togetherAPI.post('', {
        model: "mistralai/Mistral-7B-Instruct-v0.1", 
        messages: [{ role: "user", content: retryPrompt }],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      perguntasTexto = retryResponse.data.choices?.[0]?.message?.content || perguntasTexto;
    }
    
    console.log('Texto completo recebido da IA:', perguntasTexto); // Debug
    
    const questoesProcessadas = processarPerguntas(perguntasTexto);
    console.log(`Questões processadas: ${questoesProcessadas.length}`); // Debug
    
    return questoesProcessadas;
  } catch (error) {
    console.error('Erro na API Together AI (quiz):', error);
    throw new Error('Falha ao gerar quiz: ' + error.message);
  }
}

// Função COMPLETAMENTE reescrita para processar as perguntas
function processarPerguntas(texto) {
  if (!texto || typeof texto !== 'string') {
    console.warn('Texto vazio ou inválido para processamento de perguntas');
    return [];
  }

  try {
    console.log('Processando texto:', texto.substring(0, 200) + '...'); // Debug

    // Dividir por "QUESTÃO" ou "---" ou números seguidos de ":"
    let blocos = texto.split(/(?:QUESTÃO\s*\d+\s*:|---|\d+\s*\.|\d+\s*\))/i)
                     .filter(bloco => bloco.trim().length > 20); // Filtrar blocos muito pequenos

    // Se não encontrou divisões claras, tentar por padrões de resposta
    if (blocos.length < 2) {
      blocos = texto.split(/RESPOSTA\s*:\s*[A-D]/i)
                   .filter(bloco => bloco.trim().length > 20);
      
      // Reagrupar com as respostas
      if (blocos.length > 1) {
        const respostasMatch = [...texto.matchAll(/RESPOSTA\s*:\s*([A-D])/gi)];
        blocos = blocos.slice(0, -1).map((bloco, index) => {
          const resposta = respostasMatch[index] ? respostasMatch[index][0] : '';
          return bloco + '\n' + resposta;
        });
      }
    }

    console.log(`Encontrados ${blocos.length} blocos`); // Debug

    const questoesProcessadas = blocos.map((bloco, index) => {
      try {
        console.log(`Processando bloco ${index + 1}:`, bloco.substring(0, 100) + '...'); // Debug

        // Extrair enunciado (primeira parte até as alternativas)
        const enunciadoMatch = bloco.match(/^(.*?)(?=\s*A\))/s);
        if (!enunciadoMatch) {
          console.warn(`Bloco ${index + 1}: Enunciado não encontrado`);
          return null;
        }

        const enunciado = enunciadoMatch[1].trim()
                                         .replace(/^(QUESTÃO\s*\d+\s*:?)/i, '')
                                         .trim();

        // Extrair alternativas com regex mais robusta
        const alternativas = {};
        const alternativaMatches = [...bloco.matchAll(/([A-D])\)\s*([^\n\r]+(?:\s*[^\nA-D][^\n\r]*)*)/g)];
        
        alternativaMatches.forEach(match => {
          const letra = match[1];
          const texto = match[2].trim();
          if (texto.length > 0) {
            alternativas[letra] = texto;
          }
        });

        console.log(`Bloco ${index + 1}: Alternativas encontradas:`, Object.keys(alternativas)); // Debug

        // Extrair resposta correta
        const respostaMatch = bloco.match(/RESPOSTA\s*:\s*([A-D])/i);
        const respostaCorreta = respostaMatch ? respostaMatch[1].toUpperCase() : null;

        console.log(`Bloco ${index + 1}: Resposta correta:`, respostaCorreta); // Debug

        // Validações
        if (!enunciado || enunciado.length < 10) {
          console.warn(`Bloco ${index + 1}: Enunciado inválido`);
          return null;
        }

        if (Object.keys(alternativas).length < 4) {
          console.warn(`Bloco ${index + 1}: Alternativas insuficientes (${Object.keys(alternativas).length})`);
          return null;
        }

        if (!respostaCorreta || !alternativas[respostaCorreta]) {
          console.warn(`Bloco ${index + 1}: Resposta correta inválida`);
          return null;
        }

        return {
          enunciado: enunciado,
          alternativas: alternativas,
          correta: respostaCorreta
        };

      } catch (err) {
        console.error(`Erro ao processar bloco ${index + 1}:`, err);
        return null;
      }
    }).filter(Boolean); // Remover valores null

    console.log(`Total de questões válidas processadas: ${questoesProcessadas.length}`); // Debug
    
    return questoesProcessadas;

  } catch (err) {
    console.error('Erro geral no processamento de perguntas:', err);
    return [];
  }
}

// Função auxiliar para detectar frases em inglês (mantida igual)
function containsEnglishPhrases(text) {
  if (!text || typeof text !== 'string') return false;
  
  const englishPhrases = [
    'this compound', 'the compound', 'is used', 'is a', 'it is', 
    'it can', 'is known', 'has been', 'was discovered', 'this molecule',
    'which is', 'that is', 'commonly used', 'important for', 'question',
    'answer', 'correct', 'option', 'choice'
  ];
  
  return englishPhrases.some(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  );
}

// Endpoint de health-check (mantido igual)
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'IA Backend - Análise de Moléculas'
  });
});

export default router;