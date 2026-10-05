# Roteiro de Ambientes — Gestor (DEV x PROD)

> **Referência:** tag `antes-promocao-2026-10-05` · 05/10/2026
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

### Segurança dos segredos (05/10/2026)
O repositório no GitHub é **público**. Por isso:

| O que | Status |
|---|---|
| Segredo JWT do **PROD** | **ROTACIONADO** — valor novo só nos `.env` locais do PROD (Go `JWT_SECRET` = BFF `HORSE_JWT_SECRET`) |
| Segredo JWT antigo | invalidado (fica no histórico do Git, mas não vale mais) |
| `horseApi.test.ts` | deixou de hardcodar o segredo → lê `process.env.HORSE_JWT_SECRET` |
| `curso/.../config.ts` | fallback trocado por `sua_chave_jwt_aqui` |
| `.env` / keystores | continuam **fora** do Git (cópia manual) |

> **Consequência da rotação:** quem estava logado no PROD precisa logar de novo.

### Estrutura de ambientes
- **Tag** `baseline-superadmin-2026-10-02` — ponto de retorno garantido.
- **Branch `dev`** para testes; **`main`** só muda por promoção.
- **Clone PROD** em `C:\Users\mjtam\developer-prod` (mesmo repositório Git).
- **Banco `gestor_dev`** criado por cópia do `gestor`.

### Separação de configuração (cada pasta tem a sua — não versionada)
| Arquivo | DEV (testes) | PROD (produção) |
|---|---|---|
| Go `src\.env` | porta **9001**, banco **gestor_dev**, JWT próprio | porta **9000**, banco **gestor**, JWT próprio |
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
2. **TESTAR** em `http://localhost:5174` e rodar os testes antes de commitar:
   ```bat
   cd FrontEnd\src\server && npm run lint && npm test
   cd FrontEnd\src\client  && npm run lint && npm test
   ```
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
git tag antes-promocao-AAAA-MM-DD
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
7. **Nunca hardcode segredo em arquivo versionado** (teste, config, doc). O repo é **público** — segredo só em `.env`. Se vazar: **rotacionar**.
8. **Nunca rode `npm install` no PROD** (mexe no `package-lock.json` e suja a árvore). Gere o lock na DEV e promova.

---

## 8. Estado no momento desta documentação

- **DEV** = `dev` · **PROD** = `main` — promoção de 05/10/2026 (tag `antes-promocao-2026-10-05`).
- Árvores Git **limpas** nas duas pastas (`package-lock.json` do PROD realinhado na DEV).
- Segredo JWT do PROD **rotacionado** (ver §1); Go e BFF conferem em cada ambiente.
- GitHub (`origin`): `main` sincronizado; **`dev` e as tags ainda não foram enviadas** — pendência:
  ```bat
  git push origin main dev --tags
  ```
- **Backup** de 05/10/2026: `projects\Gestor_Backup_2026-10-05_200237\` (Gestor + curso, sem `node_modules`).
  Os `.env` do PROD antes da rotação estão em `_env_PROD_antes_rotacao\`.

---

## 9. Se algo falhar

| Sintoma | Causa provável | Solução |
|---|---|---|
| Porta ocupada ao subir | processo antigo ainda rodando | feche a janela antiga ou feche via Task Manager |
| "Há alterações não commitadas" no promoção | trabalho meio pronto na DEV | commite ou `git stash` e rode de novo |
| PROD subiu mas dá erro de JWT | `.env` trocado entre pastas | confira `HORSE_JWT_SECRET` (BFF) = `JWT_SECRET` (Go) **dentro de cada ambiente** |
| Login falha só no DEV | banco `gestor_dev` sem dados | é esperado se você criou por cópia; dados mudam só no seu banco de teste |
| Quer recomeçar o PROD do zero | — | `rollback.bat` → tag desejada |
| Promoção para: "Há alterações não commitadas" | `package-lock.json` mexido no PROD por `npm install` | no PROD: `git checkout -- <arquivo>`; gere o lock na DEV |
| Usuário deslogado depois da promoção | segredo JWT rotacionado (§1) | é esperado — logar de novo |

---

## 10. Backups locais (antes de mexer em algo grande)

Convenção de nome: `Gestor_Backup_AAAA-MM-DD_HHmmss` dentro de `projects\`.

```powershell
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$dest = "C:\Users\mjtam\developer\projects\Gestor_Backup_$stamp"
robocopy "C:\Users\mjtam\developer\projects\Gestor" "$dest\Gestor" /E /XD node_modules dist /NFL /NDL /NJH
```

| Backup | Conteúdo |
|---|---|
| `Gestor_Backup_2026-09-21_195403` | anterior (1.351 arquivos) |
| `Gestor_Backup_2026-10-05_200237` | Gestor + curso (7.852 arquivos, sem `node_modules`) + `_env_PROD_antes_rotacao` |

Backups são **ignorados pelo Git** (`Gestor_Backup_*` no `.gitignore`) — ficam só no disco.
