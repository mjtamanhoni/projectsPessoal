# Music Royalties App — Design Spec (Scandinavian Minimalistic)

## Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F5F5F0` | Fundo geral (off-white warm) |
| `bgCard` | `#FFFFFF` | Cards, superfícies |
| `bgMuted` | `#EDEDE8` | Backgrounds secundários |
| `textPrimary` | `#2C2C2C` | Títulos, texto principal |
| `textSecondary` | `#8A8A86` | Labels, subtítulos |
| `textMuted` | `#B8B8B4` | Placeholder, hints |
| `accent` | `#3A4A4A` | Dark slate (primary) |
| `accentWarm` | `#C47A5A` | Terracotta (music/vintage feel) |
| `accentSage` | `#8B9D83` | Sage green (natural accent) |
| `accentLight` | `#E8EBEB` | Background seleção |
| `border` | `#E0E0DC` | Bordas, divisores |
| `success` | `#4A7A5A` | Crescimento positivo |
| `red` | `#B84A4A` | Destrutivo |

## Tipografia

| Role | Font | Weight |
|---|---|---|
| Headings | Inter | Light (300) |
| Subheadings | Inter | Medium (500) |
| Body | Inter | Regular (400) |
| Values | Inter | Light (300) |
| Caption | Inter | Regular (400) |

## Screens

### 1. Dashboard
- Header "Good morning" + Avatar
- Title "Your Royalties" (28px, Light 300)
- **Total Earned card** (dark slate `#3A4A4A`) — $12,458
- **This Month card** (white) — $1,847
- Bar chart "Monthly Revenue" — 6 bars (terracotta `#C47A5A`)
- "Recent Activity" — 3 items (Midnight Dreams +$342, Summer Breeze +$187, Northern Lights +$2,450)
- Bottom nav: 🏠 🎵 📊 👤

### 2. Catalog (Track List)
- Search bar with 🔍 icon
- Filter chips: All | Singles | Albums
- 5 track items: artwork swatch + name + plays + revenue
- Tracks: Midnight Dreams ($3,420), Summer Breeze ($1,870), Northern Lights ($12,450), Fjord ($890), Aurora ($5,670)

### 3. Track Detail
- Back button + "Track Details" title
- Album art placeholder (dark slate, 200x200, 🎵 emoji)
- Track name + artist
- Stat cards: 245K Streams | $12.4K Revenue | $0.051 Per Stream
- "Revenue by Platform" breakdown: Spotify ($5,230), Apple Music ($3,870), YouTube ($1,890)

### 4. Analytics
- Time period chips: 1W | 1M | 3M | 1Y
- Line chart "Revenue Trend" — 8 data dots (terracotta)
- Stat cards: 1.2M Streams | $58.2K Earnings | +12.4% Growth
- "Top Platforms" horizontal bar chart: Spotify 42%, Apple Music 31%, YouTube 18%

## Componentes

- **Cards:** cornerRadius 16, white bg, subtle border/shadow
- **Bottom Nav:** white bg, top border `#E0E0DC`, active tab in `#3A4A4A`, inactive in `#B8B8B4`
- **Search bar:** white bg, cornerRadius 12, border `#E0E0DC`
- **Filter chips:** pill shape (cornerRadius 20), active in `#3A4A4A`, inactive in white with border
- **Track items:** cornerRadius 14, white bg, artwork swatch 48x48
- **Chart bars:** cornerRadius 4, terracotta fill
- **Platform rows:** cornerRadius 12, white bg, clean row layout
