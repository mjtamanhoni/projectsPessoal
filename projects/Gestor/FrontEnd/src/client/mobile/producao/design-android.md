# App Android Produção — Design Especificação

## 1. Paleta de Cores (mantida do Gestor)

| Token | Hex | Uso |
|---|---|---|
| `bg_primary` | `#FAFAF8` | Fundo geral |
| `bg_card` | `#FFFFFF` | Cards, listas, superfícies |
| `bg_muted` | `#F3F4F3` | Background hover/secundário |
| `accent_primary` | `#2D5E3A` | Primary color, botões, links |
| `accent_light` | `#E8EFEA` | Background seleção, highlights |
| `accent_red` | `#B84A4A` | Destructive actions, erros |
| `text_primary` | `#1B1F1C` | Títulos, texto principal |
| `text_secondary` | `#6B706C` | Labels, subtítulos |
| `text_muted` | `#9CA09D` | Placeholder, hints |
| `text_inverse` | `#FFFFFF` | Texto sobre primary |
| `border_subtle` | `#D6DDD0` | Bordas, divisores |

## 2. Tipografia

| Role | Font | Weight |
|---|---|---|
| Headings | Playfair Display | Bold (700) |
| Body | Inter / Geist | Regular (400) |
| Labels/Caption | Inter | Medium (500) |
| Monetary values | IBM Plex Mono | Regular (400) |

## 3. Navegação — Bottom Navigation + Drawer

```
┌──────────────────────────┐
│      [Status Bar]        │
├──────────────────────────┤
│ ← Insumos         [⋯]  │  ← Top App Bar
│                          │
│ [Card list items...]     │
│                          │
│                          │
├──────────────────────────┤
│ 🏠  📦  📊  ⚙️         │  ← Bottom Nav
└──────────────────────────┘
```

### Bottom Navigation (4 tabs)
1. **Dashboard** — ícone: grid/home
2. **Produção** — ícone: package/box (abre sub-lista: Insumos, Marcas, Produtos, Fabricacoes)
3. **Movimento** — ícone: trending-up (Compras, Vendas, Estoque, Perdas)
4. **Mais** — ícone: more-horiz (Relatórios, Config, Ajuda)

### Drawer (acessado via hamburger no TopAppBar)
- Dados da empresa e usuário no topo
- Lista completa de módulos (mesmo layout do Sidebar web)
- Overlay sem empurrar o conteúdo

## 4. Estrutura de Telas

```
Login
 └→ Dashboard
     ├→ Insumos (CRUD)
     ├→ Marcas (CRUD)
     ├→ Produtos Fabricados (CRUD)
     ├→ Receitas Ingredientes (CRUD)
     ├→ Custos Adicionais (CRUD)
     ├→ Compras Insumo (CRUD)
     ├→ Fabricacoes (CRUD)
     ├→ Vendas Produto (CRUD)
     ├→ Estoque Insumo
     ├→ Estoque Produto
     ├→ Perdas Insumo (CRUD)
     ├→ Perdas Produto (CRUD)
     ├→ Uso Consumo (CRUD)
     └→ Relatórios (sub-lista)
         ├→ Relatório Insumos
         ├→ Relatório Produtos Fabricados
         ├→ Relatório Fabricacoes
         └→ Relatório Vendas Produto
```

## 5. Wireframes das Telas Principais

### 5.1 Login

```
┌──────────────────────────────┐
│                              │
│         [Logo Gestor]        │
│       Gestor Financeiro      │
│     ───────────────────      │
│                              │
│  ┌────────────────────────┐  │
│  │  Email                 │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Senha             👁  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │      ENTRAR            │  │ ← bg: #2D5E3A, text: white
│  └────────────────────────┘  │
│                              │
│  Configurar servidor ⋮      │
└──────────────────────────────┘
```

### 5.2 Dashboard

```
┌──────────────────────────────┐
│ ≡  Dashboard          [🔔]  │
├──────────────────────────────┤
│ ┌──────┐ ┌──────┐           │
│ │A Receber│ │A Pagar│       │
│ │ R$ 5.230│ │R$ 2.100│      │
│ └──────┘ └──────┘           │
│ ┌──────┐ ┌──────┐           │
│ │ Saldo │ │Movim.│          │
│ │R$3.130│ │R$7.330│         │
│ └──────┘ └──────┘           │
│                              │
│ [Gráfico Receita/Despesa]    │
│  ██████░░░░░░░░             │
│  ████████░░░░░░             │
│  ██████████░░░░             │
│  ────┬───┬───┬───           │
│      Jan Fev Mar             │
│                              │
│ Últimos Registros            │
│ ┌────────────────────────┐  │
│ │ Venda #123 - R$ 150,00 │  │
│ │ Compra #45 - R$ 890,00 │  │
│ └────────────────────────┘  │
├──────────────────────────────┤
│ 🏠  📦  📊  ⚙️            │
└──────────────────────────────┘
```

### 5.3 Lista de Insumos (padrão para todas as listas CRUD)

```
┌──────────────────────────────┐
│ ≡  Insumos           [+ add]│ ← FAB ou botão no topo
├──────────────────────────────┤
│ 🔍 Buscar insumos...        │ ← Search bar (filtro local)
├──────────────────────────────┤
│ ┌────────────────────────┐  │
│ │ #1234                  │  │ ← card item
│ │ Farinha de Trigo       │  │
│ │ Un: KG  •  Custo: 2.50 │  │ ← 2 linhas
│ │ Marca: Dona Benta      │  │
│ │                ✎  🗑   │  │ ← actions (edit/delete)
│ └────────────────────────┘  │
│ ┌────────────────────────┐  │
│ │ #1235                  │  │
│ │ Açúcar Refinado        │  │
│ │ Un: KG  •  Custo: 3.20 │  │
│ │ Marca: União           │  │
│ │                ✎  🗑   │  │
│ └────────────────────────┘  │
│ ┌────────────────────────┐  │
│ │ #1236                  │  │
│ │ Ovos                   │  │
│ │ Un: DZ  •  Custo: 8.00 │  │
│ │ Fornec: Granja XYZ     │  │
│ │                ✎  🗑   │  │
│ └────────────────────────┘  │
│                              │
│   ↻ Carregando mais...      │ ← infinite scroll loader
├──────────────────────────────┤
│ 🏠  📦  📊  ⚙️            │
└──────────────────────────────┘
```

**Comportamento:**
- Scroll infinito: busca 50 itens, gatilho com 3 itens do fim
- Cada card ocupa largura total
- Múltiplas linhas por item (dados relevantes)
- Ações (editar/deletar) no canto inferior direito
- Swipe-to-delete (Android nativo) como alternativa

### 5.4 Formulário (Insumo — padrão para todos os formulários)

```
┌──────────────────────────────┐
│ ←  Novo Insumo        [✓]  │ ← salvar no topo
├──────────────────────────────┤
│                              │
│ Nome *                      │
│ ┌────────────────────────┐  │
│ │ Farinha de Trigo       │  │
│ └────────────────────────┘  │
│                              │
│ Unidade de Medida *          │
│ ┌────────────────────────┐  │
│ │ KG                     │  │ → (dropdown: KG, G, L, DZ, UN)
│ └────────────────────────┘  │
│                              │
│ Fornecedor                   │
│ ┌────────────────────────┐  │
│ │ Selecione...       ▾   │  │ → dropdown picker
│ └────────────────────────┘  │
│                              │
│ Marca                        │
│ ┌────────────────────────┐  │
│ │ Selecione...       ▾   │  │ → dropdown picker
│ └────────────────────────┘  │
│                              │
│ Custo Médio                  │
│ ┌────────────────────────┐  │
│ │ 2,500000               │  │
│ └────────────────────────┘  │
│                              │
│ ┌────────────────────────┐  │
│ │        SALVAR          │  │ ← botão primary full width
│ └────────────────────────┘  │
└──────────────────────────────┘
```

**Comportamento:**
- Modal full-screen (Activity dedicada ou BottomSheet)
- Scroll se formulário for longo
- Validação inline (campo vermelho se erro)
- Snackbar para feedback (sucesso/erro)

### 5.5 Detalhe / Expand (Fabricação — com sub-itens)

```
┌──────────────────────────────┐
│ ←  Fabricação #456   [✎]   │
├──────────────────────────────┤
│                              │
│ Produto: Bolo de Chocolate   │
│ Quantidade: 50 un            │
│ Data: 15/07/2026             │
│                              │
│ ─── CUSTOS ───               │
│ Insumos:        R$ 123,50   │
│ Adicionais:     R$ 45,00    │
│ Total:          R$ 168,50   │
│ Unitário:       R$ 3,37     │
│                              │
│ ─── CUSTOS ADICIONAIS ───   │
│ ┌────────────────────────┐  │
│ │ Embalagem     R$ 25,00 │  │
│ │ Rótulo        R$ 20,00 │  │
│ │                    [+ add]│
│ └────────────────────────┘  │
│                              │
│ Observação:                  │
│ Produção para festa junina   │
│                              │
├──────────────────────────────┤
│ 🏠  📦  📊  ⚙️            │
└──────────────────────────────┘
```

### 5.6 Vendas — Ações de Cupom

```
┌──────────────────────────────┐
│ ≡  Vendas Produto    [+ add]│
├──────────────────────────────┤
│ ┌────────────────────────┐  │
│ │ #789                   │  │
│ │ Bolo de Chocolate      │  │
│ │ Cliente: Maria         │  │
│ │ R$ 150,00  •  20/07    │  │
│ │            🖨 📄 ✎ 🗑  │  │ ← print/pdf/edit/delete
│ └────────────────────────┘  │
├──────────────────────────────┤
│ 🏠  📦  📊  ⚙️            │
└──────────────────────────────┘
```

## 6. Componentes Android (Material 3 / Jetpack Compose)

### 6.1 AppBar
- TopAppBar com hamburger (abre drawer) e título
- Ações contextuais no final (add, filter, search)
- Cor: bg_card com bottom border subtle

### 6.2 BottomNavigation
- 4 itens com ícone + label
- Cor ativa: accent_primary
- Cor inativa: text_muted
- Badge count para notificações

### 6.3 CardItem (Lista)
- Corner radius: 12dp
- Elevation: 1dp
- Padding: 16dp
- Divisor sutil entre linhas
- Ícone/avatar à esquerda (opcional)
- Actions à direita (ícones)

### 6.4 FAB (Floating Action Button)
- Cor: accent_primary (2D5E3A)
- Ícone: plus (+)
- Posição: bottom-end, acima da BottomNav
- Ancoragem: 16dp da borda, 80dp do bottom

### 6.5 SearchBar
- Barra de pesquisa expansível no TopAppBar
- Placeholder: "Buscar..."
- Debounce 300ms para filtro local
- Ícone de lupa

### 6.6 Modal / BottomSheet
- Formulários em BottomSheet ou full-screen dialog
- Corners arredondados (16dp top)
- Botão primário full-width no fundo

### 6.7 Snackbar
- Feedback de operações (sucesso verde, erro vermelho)
- 4s de duração
- Swipe para descartar

## 7. Infinite Scroll Pagination

```
                   Offset 0
Lista vazia ──────────→ [GET /api/insumos?limit=50&offset=0]
                              ↓
                    Renderiza itens 0..49
                              ↓
Usuário faz scroll ──────→ [IntersectionObserver]
                              ↓
                    Faltam 3 itens para o fim?
                              ↓ Sim
                    [GET /api/insumos?limit=50&offset=50]
                              ↓
                    Append itens 50..99 à lista
                              ↓
                    Repete até hasMore = false
```

- **Page size:** 50
- **Gatilho:** IntersectionObserver com rootMargin de 400px
- **Estado:** `hasMore` = true enquanto servidor retornar == 50 itens
- **Loading:** Loader circular no fim da lista durante carregamento
- **Refresh:** Pull-to-refresh recarrega do offset 0

## 8. Menu Drawer (Overlay)

```
┌──────────────────────────────────┐
│ (escurece bg)                    │
│  ┌───────────────────────────┐   │
│  │ ≡ Gestor Financeiro   ✕  │   │ ← header com logo + user
│  │ Maria Silva                │   │
│  │ Empresa XYZ                │   │
│  ├───────────────────────────┤   │
│  │ ← Módulos                 │   │ ← back (se em sub-módulo)
│  │                           │   │
│  │ 🏭 Producao              │   │ ← módulo ativo
│  │  ▸ Cadastro               │   │
│  │    Insumos                │   │
│  │    Marcas                 │   │
│  │    Produtos Fabricados    │   │
│  │    ...                    │   │
│  │  ▸ Movimento              │   │
│  │    Compras Insumo         │   │
│  │    Fabricacoes            │   │
│  │    ...                    │   │
│  ├───────────────────────────┤   │
│  │ 🏠 Módulos               │   │
│  │ 📖 Ajuda                  │   │
│  │ ⚙️ Configurações         │   │
│  ├───────────────────────────┤   │
│  │ 🚪 Sair                  │   │
│  └───────────────────────────┘   │
└──────────────────────────────────┘
```

- Overlay com background escuro (50% opacity)
- Drawer width: 288dp (72% da tela)
- Slide animado da esquerda (300ms ease-in-out)

## 9. Stack Tecnológico Sugerido

| Camada | Tecnologia |
|---|---|
| Linguagem | Kotlin |
| UI | Jetpack Compose + Material 3 |
| Navegação | Navigation Compose |
| Networking | Retrofit + OkHttp |
| Serialização | Kotlinx Serialization ou Moshi |
| Imagens | Coil |
| DI | Hilt / Koin |
| Armazenamento | DataStore (prefs) + Room (offline) |
| Scroll infinito | Paging 3 + Flow |
| Gráficos | Vico ou MPAndroidChart |

## 10. API Endpoints (mantidos do backend atual)

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/auth/login` | Login |
| GET | `/auth/menu` | Menu do usuário |
| GET | `/insumos?offset=&limit=` | Lista insumos (paginada) |
| GET | `/insumos?id=` | Busca um insumo |
| POST | `/insumos` | Criar/atualizar insumo |
| DELETE | `/insumos?id=` | Excluir insumo |
| GET | `/marcas?offset=&limit=` | Marcas |
| POST | `/marcas` | Criar/atualizar marca |
| DELETE | `/marcas?id=` | Excluir marca |
| GET | `/produtos-fabricados?offset=&limit=` | Produtos fabricados |
| POST | `/produtos-fabricados` | CRUD |
| GET | `/fabricacoes?offset=&limit=` | Fabricações |
| POST | `/fabricacoes` | CRUD |
| GET | `/vendas-produto?offset=&limit=` | Vendas |
| POST | `/vendas-produto` | CRUD |
| GET | `/compras-insumo?offset=&limit=` | Compras |
| POST | `/compras-insumo` | CRUD |
| ... | (demais endpoints seguem mesmo padrão) |

---

Este documento serve como blueprint para implementação do app Android nativo, mantendo fidelidade visual ao Gestor web e otimizado para experiência mobile.
