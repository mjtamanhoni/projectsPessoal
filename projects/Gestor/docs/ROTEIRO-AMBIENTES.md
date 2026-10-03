# Roteiro de Ambientes — Gestor (DEV x PROD)

> **Referência:** commit `b210fa15` · tag `baseline-superadmin-2026-10-02` · 03/10/2026
> **Pasta DEV:** `C:\Users\mjtam\developer` (branch `dev`)
> **Pasta PROD:** `C:\Users\mjtam\developer-prod` (branch `main`)

---

## 1. O que foi feito

### Superadmin (validado)
- Acesso irrestrito a todas as empresas para `mjtamanhoni@gmail.com` (Go, BFF e frontend).
- Correção do bug de login "Usuário não localizado".

### Higiene do Git
| Commit | O que fez |
|---|---|
| `9102d4e2` | Removeu 13.763 arquivos do versionamento (node_modules, dist, .env) e criou regras de ignore |
| `503f859f` | Versionou o que regras gerais bloqueavam por engano: manifests dos mobiles, `gradlew.bat`, `build-apk.bat`, ícones Android, migrações `.sql` |
| `b210fa15` | Parametrizou portas via `.env` (vite, publicar, iniciar_tudo) e criou os scripts de operação |

### Estrutura de ambientes
- **Tag** `baseline-superadmin-2026-10-02` — ponto de retorno garantido.
- **Branch `dev`** para testes; **`main`** só muda por promoção.
- **Clone PROD** em `C:\Users\mjtam\developer-prod` (mesmo repositório Git).
- **Banco `gestor_dev`** criado por cópia do `gestor`.

### Separação de configuração (cada pasta tem a sua — não versionada)
| Arquivo | DEV (testes) | PROD (produção) |
|---|---|---|
| Go `src\.env` | porta **9001**, banco **gestor_dev**, JWT `eddb385f…` | porta **9000**, banco **gestor**, JWT `c7f9a1b2…` |
| BFF `server\.env` | porta **3002** → Go 9001 | porta **3001** → Go 9000 |
| Client `.env.local` | Vite **5174** → BFF 3002 | não existe (produção serve dist) |
| Mobiles `.env` | `localhost:9001` | `localhost:9000` / duckdns |

JWTs diferentes de propósito: token emitido no DEV **não vale** no PROD.

### Cópias manuais para o PROD (não versionadas por segurança)
Keystores de assinatura APK, `local.properties`, `Fotos/`, `apk/`, `data/`.

---

## 2. As duas pastas

```
C:\Users\mjtam\developer        ← TESTES/DEV  (branch dev)   é aqui que você programa
C:\Users\mjtam\developer-prod   ← PRODUÇÃO    (branch main)   NUNCA edite arquivo aqui
```

| | DEV | PROD |
|---|---|---|
| Go | :9001 | :9000 |
| BFF | :3002 | :3001 |
| Frontend | :5174 (Vite, hot reload) | :3001 (dist estático) |
| Banco | `gestor_dev` | `gestor` |
| Como sobe | `iniciar_tudo.bat` | `publicar.bat` |

---

## 3. Fluxo diário

1. **PROGRAMAR** na pasta DEV (sobe sozinho com hot reload).
2. **TESTAR** em `http://localhost:5174`.
3. **COMMITAR** na pasta DEV, branch `dev`:
   ```bat
   git add -A
   git commit -m "descricao do que mudou"
   ```
4. **QUANDO ESTIVER OK**, rodar `aplicar-no-prod.bat` (na pasta DEV).

---

## 4. Promover DEV → PROD (`aplicar-no-prod.bat`)

Rodar na pasta DEV. Ele faz sozinho, com segurança:

1. **Recusa** se houver alteração não commitada (nunca promove meio-trabalho).
2. `git fetch . dev:main` → `main` avança para o `dev` (fast-forward, não bagunça sua pasta).
3. Chama o `atualizar.bat` do PROD → `git pull` + rebuild (client, BFF, Go) + restart.

**Resultado:** o PROD roda exatamente o commit que você testou. As janelas novas abrem automaticamente.

---

## 5. Rollback (`rollback.bat` — pasta PROD)

```
1. rodar rollback.bat
2. escolher a tag/commit  (ex.: baseline-superadmin-2026-10-02)
3. confirmar com "s"
→ git reset --hard + rebuild + restart automáticos
```

**Regra prática:** crie tag antes de cada promoção importante:

```bat
git tag nome-do-teste
```

---

## 6. Comandos Git de bolso

| Quero… | Comando (pasta DEV) |
|---|---|
| Ver o que mudei | `git status` / `git diff` |
| Salvar no histórico | `git add -A` + `git commit -m "..."` |
| Ver histórico | `git log --oneline -10` |
| Promover para PROD | rodar `aplicar-no-prod.bat` |
| Marcar um ponto | `git tag nome-da-tag` |
| Voltar código antigo (PROD) | rodar `rollback.bat` |
| Ver em que commit está o PROD | `git -C C:\Users\mjtam\developer-prod log --oneline -1` |

---

## 7. Regras de ouro

1. **Programar só na pasta DEV.** O PROD só recebe código via `git pull`.
2. **Nunca `git commit` na pasta PROD** — o pull falharia e o histórico bagunça.
3. **`.env` e keystores não estão no Git** — nunca versionar; se clonar de novo, copiar à mão.
4. Commite sempre na `dev`; `main` só muda por promoção (`aplicar-no-prod.bat`).
5. Rollback é `git reset` + rebuild — **nunca edite arquivo no PROD** para "consertar" (será sobrescrito no próximo pull).
6. Antes de promoção grande: **tag**. Depois dela, rollback é imediato.

---

## 8. Estado no momento desta documentação

- DEV = PROD = `b210fa15` (4 commits à frente do GitHub — push opcional, não feito).
- Árvores Git limpas nas duas pastas.
- Pendência opcional: `git push origin main dev` para backup na nuvem.

---

## 9. Se algo falhar

| Sintoma | Causa provável | Solução |
|---|---|---|
| Porta ocupada ao subir | processo antigo ainda rodando | feche a janela antiga ou feche via Task Manager |
| "Há alterações não commitadas" no promoção | trabalho meio pronto na DEV | commite ou `git stash` e rode de novo |
| PROD subiu mas dá erro de JWT | `.env` trocado entre pastas | confira `HORSE_JWT_SECRET` (BFF) = `JWT_SECRET` (Go) **dentro de cada ambiente** |
| Login falha só no DEV | banco `gestor_dev` sem dados | é esperado se você criou por cópia; dados mudam só no seu banco de teste |
| Quer recomeçar o PROD do zero | — | `rollback.bat` → tag desejada |
