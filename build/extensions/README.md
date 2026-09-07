# Custom Extension Images

Replace the images in each board folder to customize how they appear in the editor.

## Folder structure:
```
extensions/
├── arduino_uno/
│   ├── arduino_uno.svg       ← Main display image (600x372px)
│   └── arduino_uno-small.svg ← Small icon (40x40px)
├── arduino_nano/
│   ├── arduino_nano.svg
│   └── arduino_nano-small.svg
├── arduino_mega/
│   ├── arduino_mega.svg
│   └── arduino_mega-small.svg
└── esp32/
    ├── esp32.svg
    └── esp32-small.svg
```

## How to customize:
1. Replace any `.svg` file with your own image (SVG or PNG)
2. Keep the same filename
3. No rebuild needed — just refresh the browser

## Image sizes:
- Main image: ~600x372px (shown in extension library popup)
- Small icon: ~40x40px (shown in block palette sidebar)
- Format: SVG preferred, PNG also works
