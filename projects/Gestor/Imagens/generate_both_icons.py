from PIL import Image
import base64, os, io

CLIENTE_SRC = r'C:\Users\mjtam\developer\projects\Gestor\Imagens\Logos\Icone_Cliente_002.jpeg'
PRODUCAO_SRC = r'C:\Users\mjtam\developer\projects\Gestor\Imagens\Logos\Logo_ChegouParceiro.jpeg'

CLIENTE_PROJECT = r'C:\Users\mjtam\developer\projects\Gestor\Mobile\Cliente'
PRODUCAO_PROJECT = r'C:\Users\mjtam\developer\projects\Gestor\Mobile\Producao'

densities = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

def generate_icons(src_path, project_path, app_name):
    img = Image.open(src_path).convert('RGBA')
    print(f'\n=== {app_name} ===')
    print(f'Source: {src_path} ({img.size})')

    # Save as PNG to public/img/
    public_dir = os.path.join(project_path, 'public', 'img')
    os.makedirs(public_dir, exist_ok=True)
    png_path = os.path.join(public_dir, f'{app_name.lower()}.png')
    img.save(png_path, 'PNG')
    print(f'Saved PNG: {png_path}')

    res_dir = os.path.join(project_path, 'android', 'app', 'src', 'main', 'res')

    for density, size in densities.items():
        folder = os.path.join(res_dir, f'mipmap-{density}')
        os.makedirs(folder, exist_ok=True)
        resized = img.resize((size, size), Image.LANCZOS)
        for name in ['ic_launcher.png', 'ic_launcher_round.png']:
            path = os.path.join(folder, name)
            resized.save(path, 'PNG')
        # Foreground (72% for adaptive)
        fg_size = int(size * 0.72)
        fg = img.resize((fg_size, fg_size), Image.LANCZOS)
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        offset = (size - fg_size) // 2
        canvas.paste(fg, (offset, offset))
        canvas.save(os.path.join(folder, 'ic_launcher_foreground.png'), 'PNG')
        print(f'  {density} icons generated ({size}x{size})')

    # Generate base64 for splash (512px)
    splash = img.resize((512, 512), Image.LANCZOS)
    buf = io.BytesIO()
    splash.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode()
    splash_ts = "export const SPLASH_ICON = 'data:image/png;base64," + b64 + "';"
    ts_path = os.path.join(project_path, 'src', 'splash-icon.ts')
    with open(ts_path, 'w') as f:
        f.write(splash_ts)
    print(f'Updated splash-icon.ts ({len(b64)} chars)')

# Generate for Client app
generate_icons(CLIENTE_SRC, CLIENTE_PROJECT, 'Cliente')

# Generate for Production app
generate_icons(PRODUCAO_SRC, PRODUCAO_PROJECT, 'Producao')

print('\nDONE - Both apps updated')
