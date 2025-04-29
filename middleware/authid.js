import jwt from 'jsonwebtoken';

export default function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ erro: 'Authorization header não fornecido' });
  }

  // Se o header começa com 'Bearer ', extraímos só o token. Senão, usamos o valor todo como token.
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  console.log('Token recebido:', token); // Log para debug

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      console.error('Erro na verificação do token:', err);
      return res.status(403).json({ erro: 'Token inválido' });
    }
    req.usuarioId = usuario.id; // O ID extraído do token
    next();
  });
}