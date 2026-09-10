import re

FILE = r'C:\Users\mjtam\developer\projects\Gestor\Mobile\Producao\src\styles.css'

with open(FILE, 'r', encoding='utf-8') as f:
    css = f.read()

# ============================================================
# MAPPING: Produção light theme → Cliente dark theme
# ============================================================

# --- Backgrounds (light → dark) ---
bg_replacements = {
    '#f5f3ee': '#1E1E1E',
    '#efede7': 'rgba(42,42,42,0.6)',
    '#fafaf8': 'rgba(42,42,42,0.4)',
    '#faf9f7': 'rgba(42,42,42,0.6)',
    '#f9f8f6': 'rgba(42,42,42,0.5)',
    '#f6f8f5': 'rgba(42,42,42,0.5)',
    '#e9f0ea': 'rgba(52,199,89,0.15)',
    '#e8efea': 'rgba(255,255,255,0.05)',
}

# --- Text (dark → light) ---
text_replacements = {
    '#1b1f1c': '#FFFFFF',
    '#1b3a28': '#FFB800',
    '#6b706c': '#B0B0B0',
    '#9ca09d': '#707070',
    '#4b5563': '#B0B0B0',
    '#6b7280': '#999999',
    '#9ca3af': '#707070',
}

# --- Borders (light → dark) ---
border_replacements = {
    '#d6ddd0': 'rgba(255,255,255,0.1)',
    '#efeee9': 'rgba(255,255,255,0.05)',
    '#f0f0ec': 'rgba(255,255,255,0.08)',
    '#f0f3f1': 'rgba(255,255,255,0.06)',
    '#e2e8e2': 'rgba(255,255,255,0.1)',
}

# --- Accent (keep green but use Cliente's shade) ---
accent_replacements = {
    '#2d5e3a': '#34C759',
}

# --- Danger/Error (keep) ---
danger_replacements = {
    '#c0392b': '#FF3B30',
    '#dc2626': '#FF453A',
}

# --- Overlays (keep) ---
overlay_replacements = {
    'rgba(0, 0, 0, 0.35)': 'rgba(0, 0, 0, 0.5)',
    'rgba(0, 0, 0, 0.45)': 'rgba(0, 0, 0, 0.6)',
}

# --- Shadows (darken) ---
shadow_replacements = {
    'rgba(27, 58, 40, 0.12)': 'rgba(0, 0, 0, 0.3)',
    'rgba(45, 94, 58, 0.12)': 'rgba(0, 0, 0, 0.3)',
    'rgba(0, 0, 0, 0.15)': 'rgba(0, 0, 0, 0.4)',
}

# --- SVG encoded ---
svg_replacements = {
    '%236b706c': '%23B0B0B0',
}

# Apply all replacements (order matters - do specific before general)
all_replacements = {}
all_replacements.update(svg_replacements)
all_replacements.update(accent_replacements)
all_replacements.update(danger_replacements)
all_replacements.update(shadow_replacements)
all_replacements.update(overlay_replacements)
all_replacements.update(border_replacements)
all_replacements.update(bg_replacements)
all_replacements.update(text_replacements)

for old, new in all_replacements.items():
    css = css.replace(old, new)

# Fix: white backgrounds on cards/buttons should become dark glass
# Only replace #ffffff that are used as background (not text on green buttons)
# We need to be more careful here - replace #ffffff in background contexts
css = css.replace('background: #ffffff', 'background: rgba(42,42,42,0.8)')
css = css.replace('background: #FFFFFF', 'background: rgba(42,42,42,0.8)')

# Fix the body color
css = css.replace('color: #1b1f1c', 'color: #FFFFFF')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(css)

print('Done - Produção styles.css updated with dark theme')
