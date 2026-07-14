// Importa tipos express
import { request, response, NextFunction } from 'express';

// Importa biblioteca JWT
import jwt from 'jsonwebtoken';

// Importa configurações
import { config } from '../config';

// =================================================================
// INTERFACE CUSTOMIZADA
// =================================================================

// Extende a inteface Request do Express para incluir usuarioID
// Isso permite que todas as rotas acessem o ID do Usuário logado
export interface AuthRequest extends Request {
  usuarioId?: number;
}


export function authMiddleware(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): void {
  // Passo 1: Extrair o header Autorization
  const authHeader = req.headers.authorization;

  // Passo 2: Verificar se o header existe e está no formato correto
  // Formato esperado: "Bearer eyJh..."
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido ou inválido.' });
    return;
  }

  // Passo 3: Extrair o token (remover "Bearer" do início)
  const token = authHeader.split(' ')[1]; // Remove 'Bearer ' do início

  //Passo 4: Verificar e decodificar o token
  try {
    // jwt.verify() valida a assinatura e decodifica o payload
    // Se o token for inválido ou expirado, lança exceção
    const decoded = jwt.verify(token, config.horseApi.jwtSecret) as { id: number };

    //Passo 5: Adicionar o ID do usário ao request
    // Isso permite que as rotas acessen req.usuarioIf
    req.usuarioId = decoded.id;

    //Passo 6: Chamar o próximo middleware
    next();
  } catch (error) {
    // Token inválido, expirado ou corrmpido
    res.status(401).json({ erro: 'Token inválido.' });
  }
}
