from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "logo.png"
PUBLIC = ROOT / "public"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

EMBLEM_BOX = (260, 60, 1040, 590)
WHITE = (255, 255, 255, 255)
DARK = (15, 17, 21, 255)


def open_logo() -> Image.Image:
    img = Image.open(SRC).convert("RGBA")
    return img


def emblem() -> Image.Image:
    return open_logo().crop(EMBLEM_BOX)


def fit(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    return ImageOps.contain(img, box, Image.Resampling.LANCZOS)


def centered(canvas: Image.Image, img: Image.Image) -> Image.Image:
    x = (canvas.width - img.width) // 2
    y = (canvas.height - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    return canvas


def square_icon(size: int, emblem_ratio: float = 0.86) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), WHITE)
    logo = fit(emblem(), (int(size * emblem_ratio), int(size * emblem_ratio)))
    return centered(canvas, logo)


def round_icon(size: int, emblem_ratio: float = 0.78) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)

    white = Image.new("RGBA", (size, size), WHITE)
    logo = fit(emblem(), (int(size * emblem_ratio), int(size * emblem_ratio)))
    white = centered(white, logo)
    canvas.paste(white, (0, 0), mask)
    return canvas


def foreground(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), WHITE)
    logo = fit(emblem(), (int(size * 0.74), int(size * 0.74)))
    return centered(canvas, logo)


def splash(width: int, height: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), DARK)
    card_size = int(min(width, height) * 0.70)
    card_size = max(card_size, 160)
    x = (width - card_size) // 2
    y = (height - card_size) // 2

    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    pad = max(8, card_size // 30)
    shadow_draw.rounded_rectangle(
        (x - pad, y - pad + card_size // 26, x + card_size + pad, y + card_size + pad + card_size // 26),
        radius=card_size // 8,
        fill=(0, 0, 0, 150),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(card_size // 18))
    canvas.alpha_composite(shadow)

    card = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle(
        (0, 0, card_size - 1, card_size - 1),
        radius=card_size // 8,
        fill=WHITE,
    )
    logo = fit(open_logo(), (int(card_size * 0.88), int(card_size * 0.88)))
    card = centered(card, logo)
    canvas.alpha_composite(card, (x, y))
    return canvas.convert("RGB")


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print(f"{path.relative_to(ROOT)} ({img.width}x{img.height})")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Logo não encontrado: {SRC}")

    full = open_logo()
    save(full.resize((1024, 1024), Image.Resampling.LANCZOS), PUBLIC / "logo.png")
    icon512 = square_icon(512)
    save(icon512, PUBLIC / "logo-icon.png")
    save(icon512, PUBLIC / "splash-logo.png")
    save(square_icon(64), PUBLIC / "favicon.png")

    legacy = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }
    foreground_sizes = {
        "mdpi": 108,
        "hdpi": 162,
        "xhdpi": 216,
        "xxhdpi": 324,
        "xxxhdpi": 432,
    }
    for density, size in legacy.items():
        save(square_icon(size), RES / f"mipmap-{density}" / "ic_launcher.png")
        save(round_icon(size), RES / f"mipmap-{density}" / "ic_launcher_round.png")
    for density, size in foreground_sizes.items():
        save(foreground(size), RES / f"mipmap-{density}" / "ic_launcher_foreground.png")

    splashes = {
        "drawable": (480, 320),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }
    for folder, (width, height) in splashes.items():
        save(splash(width, height), RES / folder / "splash.png")


if __name__ == "__main__":
    main()
