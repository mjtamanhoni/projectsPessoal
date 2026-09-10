from PIL import Image
import base64, os, io

SRC = r'C:\Users\mjtam\developer\projects\Gestor\Imagens\Logos\Logo_ChegouParceiro.jpeg'
PROJECT = r'C:\Users\mjtam\developer\projects\Gestor\Mobile\Cliente'

img = Image.open(SRC).convert('RGBA')
print(f'Source size: {img.size}')

# 1. Save as PNG to public/img/
png_path = os.path.join(PROJECT, 'public', 'img', 'chegou-parceiro.png')
img.save(png_path, 'PNG')
print(f'Saved: {png_path}')

# 2. Generate Android icons
densities = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

res_dir = os.path.join(PROJECT, 'android', 'app', 'src', 'main', 'res')

for density, size in densities.items():
    folder = os.path.join(res_dir, f'mipmap-{density}')
    resized = img.resize((size, size), Image.LANCZOS)
    for name in ['ic_launcher.png', 'ic_launcher_round.png']:
        path = os.path.join(folder, name)
        resized.save(path, 'PNG')
        print(f'  {density}/{name} ({size}x{size})')

# 3. Foreground icons (72% padding for adaptive)
for density, size in densities.items():
    folder = os.path.join(res_dir, f'mipmap-{density}')
    fg_size = int(size * 0.72)
    fg = img.resize((fg_size, fg_size), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    offset = (size - fg_size) // 2
    canvas.paste(fg, (offset, offset))
    path = os.path.join(folder, 'ic_launcher_foreground.png')
    canvas.save(path, 'PNG')
    print(f'  {density}/ic_launcher_foreground.png (adaptive, {size}x{size})')

# 4. Generate base64 for splash icon (512px)
splash = img.resize((512, 512), Image.LANCZOS)
buf = io.BytesIO()
splash.save(buf, format='PNG')
b64 = base64.b64encode(buf.getvalue()).decode()
splash_ts = "export const SPLASH_ICON = 'data:image/png;base64," + b64 + "';"
ts_path = os.path.join(PROJECT, 'src', 'splash-icon.ts')
with open(ts_path, 'w') as f:
    f.write(splash_ts)
print(f'Updated splash-icon.ts ({len(b64)} chars base64)')

print('DONE')
