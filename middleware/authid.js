import jwt from 'jsonwebtoken';

export default function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  console.log('Token recebido:', token); // Adicionando log para verificar o token recebido.

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ erro: 'Token inválido' });
    }
    req.usuarioId = usuario.id;
    next();
  });
}
