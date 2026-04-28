export const translations = {
  en: {
    // Header
    'header.processing': 'Applying palette...',
    'header.export': 'Export PNG',
    'header.remove': 'Remove',
    'header.removeTitle': 'Remove image',

    // Remove dialog
    'remove.title': 'Remove image?',
    'remove.description': 'All current edits will be lost. This cannot be undone.',
    'remove.cancel': 'Cancel',
    'remove.confirm': 'Remove',

    // Reset dialog
    'reset.title': 'Reset all settings?',
    'reset.description': 'Every slider returns to default. You can undo afterwards.',
    'reset.cancel': 'Cancel',
    'reset.confirm': 'Reset',

    // Replace image dialog
    'replace.title': 'Replace image?',
    'replace.description': 'Undo history will be cleared. Your settings are kept.',
    'replace.cancel': 'Cancel',
    'replace.confirm': 'Replace',
    'replace.paletteQuestion': 'A custom palette is active. What should happen with it?',
    'replace.paletteKeep': 'Keep current palette',
    'replace.paletteRegen': 'Regenerate from new image',

    // Dropzone loading
    'dropzone.loading': 'Loading image...',
    'dropzone.loadError': 'Could not read the file',
    'dropzone.exampleError': 'Could not load example',

    // Bottom bar
    'view.compare': 'Compare',
    'view.sideBySide': 'Side by Side',
    'preview.bgLabel': 'Background',
    'preview.bg.checkerboard': 'Checkerboard',
    'preview.bg.black': 'Black',
    'preview.bg.white': 'White',
    'preview.bg.custom': 'Custom color',
    'preview.bg.image': 'Image as background',
    'preview.bg.imageUpload': 'Replace background image',
    'preview.bg.imageClear': 'Remove background image',

    // Sidebar
    'sidebar.reset': 'Reset',
    'sidebar.undoTitle': 'Undo (Ctrl+Z)',
    'sidebar.redoTitle': 'Redo (Ctrl+Y)',

    // Tabs
    'tab.resize': 'Resize',
    'tab.dither': 'Dither',
    'tab.palette': 'Palette',
    'tab.colors': 'Colors',
    'tab.effects': 'Effects',

    // Tab Sample
    'sample.absolute': 'Absolute (px)',
    'sample.relative': 'Relative (%)',
    'sample.width': 'Width',
    'sample.height': 'Height',
    'sample.sampleMode': 'Sample Mode',
    'sample.nearest': 'Nearest Neighbor',
    'sample.bilinear': 'Bilinear',
    'sample.bicubic': 'Bicubic',
    'sample.targetPreset': 'Target size',
    'sample.targetPresetTip': 'Common power-of-two sizes for game textures (PSX 64-256, GameBoy 160). The longest side gets clamped to the chosen value, and the other side keeps the source aspect ratio.',
    'sample.targetCustom': 'Custom',
    'sample.snapPow2': 'Snap to 2ⁿ',
    'sample.snapPow2Tip': 'Round width and height to the nearest power of 2 (16, 32, 64, …). Common for game-engine textures.',
    'sample.blur': 'Blur Amount',
    'sample.sharpen': 'Sharpen Amount',
    'sample.lockAspect': 'Lock aspect ratio',
    'sample.unlockAspect': 'Unlock aspect ratio',
    'sample.sampleModeTip': 'Nearest: sharp pixels, no blending (PSX authentic). Bilinear: smooth interpolation. Bicubic: highest quality smooth.',

    // Tab Dither
    'dither.alphaThreshold': 'Alpha Threshold',
    'dither.distanceMetric': 'Distance Metric',
    'dither.distanceMetricTip': 'How color similarity is calculated. Euclidean: fast, basic. Manhattan: sharper transitions. CIEDE2000: perceptually accurate (slower). RGB Redmean: good balance of speed and accuracy.',
    'dither.mode': 'Dither Mode',
    'dither.modeTip': 'None: solid colors only. Floyd-Steinberg: classic error diffusion, smooth gradients. Jarvis: wider diffusion, less banding. Bayer: ordered pattern, retro look.',
    'dither.amount': 'Dither Amount',

    // Tab Palette
    'palette.colors': 'Palette Colors',
    'palette.clear': 'Clear',
    'palette.colorCount': 'Color Count',
    'palette.colorCountTip': 'Number of colors to extract from the image. Lower = more PSX authentic. Typical PSX textures use 16-32 colors.',
    'palette.kmeans': 'k-means++',
    'palette.kmeansTip': 'Uses the WuQuant algorithm for smarter color selection. Produces more perceptually uniform palettes but is slightly slower. Recommended for photographic images.',
    'palette.autoGenerate': 'Auto-generate instead',
    'palette.importFile': 'Import File',
    'palette.pick': 'Pick',
    'palette.pickReplace': 'Pick color to replace selected',
    'palette.pickAdd': 'Pick color to add to palette',
    'palette.lospec': 'Import from Lospec',
    'palette.lospecTip': 'Paste a Lospec palette URL or slug. Browse palettes at lospec.com/palette-list',
    'palette.lospecPlaceholder': 'slug or lospec URL',
    'palette.import': 'Import',
    'palette.builtin': 'Builtin Palettes',
    'palette.builtinPlaceholder': 'Select palette...',
    'palette.hardware': 'Hardware (PS1)',
    'palette.psx555': 'PSX 555 (5-bit)',
    'palette.psx555Tip': 'PS1 hardware stored colors at 5 bits per channel: only 32 RGB levels (0, 8, 16, …, 248) instead of 256. Snapping every pixel to that grid produces the banding seen in Silent Hill or Tomb Raider 1. Use for hardware authenticity. No clustering, no dither, no color-count limit — for a small palette use \'generated\' mode.',
    'palette.psx555Hint': '32 levels per channel · no dither · no clustering',
    'palette.psx555Disable': 'Disable PSX 555',
    'palette.addColor': 'Add color',
    'palette.pickScreen': 'Pick color from screen',
    'palette.removeColor': 'Remove color',

    // Tab Colors
    'colors.brightness': 'Brightness',
    'colors.contrast': 'Contrast',
    'colors.saturation': 'Saturation',
    'colors.hue': 'Hue',
    'colors.gamma': 'Gamma',
    'colors.tint': 'Tint',
    'colors.red': 'Red',
    'colors.green': 'Green',
    'colors.blue': 'Blue',
    'colors.crt': 'CRT Effect',
    'colors.scanlines': 'Scanlines',
    'colors.rgbShift': 'RGB Shift',
    'colors.vignette': 'Vignette',

    // Preview
    'preview.original': 'Original',
    'preview.result': 'Result',
    'preview.converted': 'Converted',
    'preview.processing': 'Processing...',
    'preview.waiting': 'Waiting for result...',
    'preview.swapPanels': 'Swap panels',
    'preview.inspectorTitle': 'Pixel inspector',

    // Dropzone
    'dropzone.drop': 'Drop image here',
    'dropzone.dropActive': 'Drop to convert',
    'dropzone.browse': 'or click to browse',

    // Presets
    'preset.load': 'Load',
    'preset.save': 'Save',
    'preset.saveTitle': 'Save Preset',
    'preset.loadTitle': 'Load Preset',
    'preset.namePlaceholder': 'Preset name...',
    'preset.noPresets': 'No saved presets',
    'preset.delete': 'Delete',
    'preset.factory': 'Built-in',
    'preset.userPresets': 'Your Presets',

    // Toasts
    'toast.exported': 'PNG exported',
    'toast.noResult': 'No result to export',
    'toast.imageLoaded': 'Image loaded',
    'toast.invalidFile': 'Not a valid image file',
    'toast.settingsReset': 'Settings reset',
    'toast.imageRemoved': 'Image removed',
    'toast.processingFailed': 'Processing failed',
    'toast.exportTooLarge': 'Output too large. Lower scale or source size.',
    'toast.colorPicked': 'Color picked: {hex}',
    'toast.colorAdded': 'Added {hex} to palette',
    'toast.noColors': 'No colors found in file',
    'toast.copied': 'Copied to clipboard',
    'toast.copyFailed': 'Failed to copy',
    'toast.presetSaved': 'Preset "{name}" saved',
    'toast.presetLoaded': 'Loaded "{name}"',
    'toast.presetDeleted': 'Deleted "{name}"',
    'toast.lospecImported': 'Imported {count} colors from Lospec',
    'toast.fileImported': 'Imported {count} colors from file',

    // Clipboard & smart export
    'header.copy': 'Copy',
    'header.copyTitle': 'Copy to clipboard (Ctrl+C)',

    // Drop replace
    'dropzone.dropReplace': 'Drop to replace image',

    // Shortcuts modal
    'shortcuts.title': 'Keyboard Shortcuts',
    'shortcuts.undo': 'Undo',
    'shortcuts.redo': 'Redo',
    'shortcuts.copy': 'Copy to clipboard',
    'shortcuts.paste': 'Paste image',
    'shortcuts.export': 'Export PNG',
    'shortcuts.preset': 'Load factory preset 1…9',
    'shortcuts.help': 'Show shortcuts',

    // History
    'sidebar.history': 'History',
    'sidebar.clearHistory': 'Clear history',
    'sidebar.toggle': 'Toggle sidebar',

    // Lospec errors
    'lospec.error.empty': 'Enter a palette name or Lospec URL',
    'lospec.error.notFound': 'Palette not found on Lospec',
    'lospec.error.server': 'Lospec server error, try again later',
    'lospec.error.network': 'Network error — check your connection',
    'lospec.error.format': 'Invalid palette data from Lospec',
    'lospec.error.unknown': 'Could not load palette',

    // Batch export
    'export.batch': 'Batch Export',
    'export.batchTitle': 'Export Multiple Sizes',
    'export.download': 'Download All',
    // Export scale (nearest-neighbor upscale on export)
    'export.scale': 'Export scale',
    'export.scaleCustom': 'Custom…',
    'export.scaleCustomLabel': 'Multiplier (1–32)',
    'export.indexed': 'PNG-8 (indexed)',
    'export.indexedTip': 'Smaller file size, palette intact. Falls back to PNG-24 if encoding fails.',
    'export.indexedDisabled': 'Generate a palette first to enable indexed PNG.',
    'toast.zipExported': 'ZIP exported',
    'toast.zipFailed': 'ZIP export failed',
    'toast.zipSkipped': 'skipped sizes',
    'toast.workerCrashed': 'Background worker failed — falling back to main thread (may be slower)',
    'toast.storageFull': 'Browser storage full — some settings may not persist. Delete old presets to free space.',

    // Posterize
    'colors.posterize': 'Posterize',
    'colors.posterizeTip': 'Reduces the number of tones per channel. 0 = off. Lower values create a more graphic, retro look.',

    // Transparency
    'dither.transparencyMode': 'Transparency Mode',
    'dither.transparencyNone': 'None',
    'dither.transparencyThreshold': 'Alpha Threshold',
    'dither.transparencyColorKey': 'Color Key',
    'dither.colorKey': 'Key Color',
    'dither.colorKeyTip': 'Pixels matching the selected color will become transparent before processing. Default: magenta (#FF00FF).',

    // Grid / Tile overlay
    'preview.showGrid': 'Show pixel grid',
    'preview.hideGrid': 'Hide pixel grid',
    'preview.showTile': 'Show tiled (3×3)',
    'preview.hideTile': 'Hide tiled',

    // Palette export
    'palette.exportTitle': 'Export Palette',
    'palette.exportFormat': 'Choose a format:',
    'palette.generatedColors': 'Generated Colors',
    'toast.paletteExported': 'Palette exported',
    'toast.bgImageError': 'Could not load background image',
    'toast.linkCopied': 'Share link copied to clipboard',
    'toast.linkLoaded': 'Settings loaded from link',
    'toast.linkTooLong': 'Link copied — but it is unusually long. Consider sharing the JSON preset instead.',
    'share.copy': 'Copy share link',
    'share.button': 'Share',
    'restore.title': 'Continue with your last image?',
    'restore.continue': 'Continue',
    'restore.discard': 'Discard',
    'tour.welcomeTitle': 'Welcome to PSX Converter',
    'tour.welcomeBody': 'Convert any image into PlayStation 1-style pixel art textures. A 5-step tour to get you started — should take a minute.',
    'tour.loadTitle': 'Load an image',
    'tour.loadBody': 'Drag & drop, click to browse, paste with Ctrl+V, or pick an example from the gallery below.',
    'tour.loadBodyLoaded': 'Image already loaded. You can replace it any time by dropping another image onto the preview.',
    'tour.settingsTitle': 'Tweak the look',
    'tour.settingsBody': 'Five tabs: Resize, Dither, Palette, Colors, Effects. Every change previews in real time.',
    'tour.exportTitle': 'Export your texture',
    'tour.exportBody': 'PNG with smart filename. Ctrl+S works too. Batch export gives you a ZIP at multiple sizes.',
    'tour.shortcutsTitle': 'Keyboard shortcuts',
    'tour.shortcutsBody': 'This `?` button opens the full list. Highlights: Ctrl+Z undo, Ctrl+1…9 load preset, Ctrl+V paste image.',
    'tour.next': 'Next',
    'tour.back': 'Back',
    'tour.skip': 'Skip',
    'tour.done': 'Got it',
    'tour.dontShow': "Don't show again",
    'tour.replay': 'Replay onboarding tour',

    // Examples gallery
    'dropzone.examples': 'Or try an example',
    'dropzone.exampleLoaded': 'Example loaded',

    // Compare presets
    'preset.compare': 'Compare',
    'preset.compareTitle': 'Compare Preset',
    'preset.currentSettings': 'Current',
    'preset.processing': 'Processing...',

    // Film Grain
    'effects.grain': 'Film Grain',
    'effects.grainTip': 'Adds analog noise to the image. Simulates film or CRT sensor grain.',
    'effects.grainSeedLock': 'Lock grain seed for reproducible exports',
    'effects.grainSeedUnlock': 'Unlock grain seed (random each render)',
    'effects.grainSeedLocked': 'Locked',
    'effects.grainSeedRandom': 'Random',
    'effects.grainSeedRegenerate': 'Click to generate a new seed',

    // Levels
    'colors.levels': 'Levels',
    'colors.levelsInLow': 'Input Black',
    'colors.levelsInHigh': 'Input White',
    'colors.levelsOutLow': 'Output Black',
    'colors.levelsOutHigh': 'Output White',
  },
  es: {
    'header.processing': 'Aplicando paleta...',
    'header.export': 'Exportar PNG',
    'header.remove': 'Eliminar',
    'header.removeTitle': 'Eliminar imagen',

    'remove.title': '¿Eliminar imagen?',
    'remove.description': 'Se perderán todos los cambios actuales. Esta acción no se puede deshacer.',
    'remove.cancel': 'Cancelar',
    'remove.confirm': 'Eliminar',

    // Reset dialog
    'reset.title': '¿Restablecer todos los ajustes?',
    'reset.description': 'Todos los sliders vuelven al valor por defecto. Podés deshacerlo después.',
    'reset.cancel': 'Cancelar',
    'reset.confirm': 'Restablecer',

    // Replace image dialog
    'replace.title': '¿Reemplazar imagen?',
    'replace.description': 'Se limpiará el historial de deshacer. Tus ajustes se mantienen.',
    'replace.cancel': 'Cancelar',
    'replace.confirm': 'Reemplazar',
    'replace.paletteQuestion': 'Hay una paleta personalizada activa. ¿Qué hacemos con ella?',
    'replace.paletteKeep': 'Mantener paleta actual',
    'replace.paletteRegen': 'Regenerar desde la nueva imagen',

    // Dropzone loading
    'dropzone.loading': 'Cargando imagen...',
    'dropzone.loadError': 'No se pudo leer el archivo',
    'dropzone.exampleError': 'No se pudo cargar el ejemplo',

    'view.compare': 'Comparar',
    'view.sideBySide': 'Lado a Lado',
    'preview.bgLabel': 'Fondo',
    'preview.bg.checkerboard': 'Ajedrez',
    'preview.bg.black': 'Negro',
    'preview.bg.white': 'Blanco',
    'preview.bg.custom': 'Color personalizado',
    'preview.bg.image': 'Imagen como fondo',
    'preview.bg.imageUpload': 'Reemplazar imagen de fondo',
    'preview.bg.imageClear': 'Quitar imagen de fondo',

    'sidebar.reset': 'Reiniciar',
    'sidebar.undoTitle': 'Deshacer (Ctrl+Z)',
    'sidebar.redoTitle': 'Rehacer (Ctrl+Y)',

    'tab.resize': 'Tamaño',
    'tab.dither': 'Dither',
    'tab.palette': 'Paleta',
    'tab.colors': 'Colores',
    'tab.effects': 'Efectos',

    'sample.absolute': 'Absoluto (px)',
    'sample.relative': 'Relativo (%)',
    'sample.width': 'Ancho',
    'sample.height': 'Alto',
    'sample.sampleMode': 'Modo de Muestreo',
    'sample.nearest': 'Nearest',
    'sample.bilinear': 'Bilinear',
    'sample.bicubic': 'Bicubic',
    'sample.targetPreset': 'Tamaño objetivo',
    'sample.targetPresetTip': 'Tamaños potencia-de-dos típicos para texturas de juego (PSX 64-256, GameBoy 160). El lado más largo se ajusta al elegido y el otro respeta el aspect del source.',
    'sample.targetCustom': 'Personalizado',
    'sample.snapPow2': 'Ajustar a 2ⁿ',
    'sample.snapPow2Tip': 'Redondear ancho y alto a la potencia de 2 más cercana (16, 32, 64, …). Útil para texturas de motores de juego.',
    'sample.blur': 'Desenfoque',
    'sample.sharpen': 'Nitidez',
    'sample.lockAspect': 'Bloquear proporción',
    'sample.unlockAspect': 'Desbloquear proporción',
    'sample.sampleModeTip': 'Nearest: píxeles nítidos, sin mezcla (auténtico PSX). Bilinear: interpolación suave. Bicubic: mayor calidad suave.',

    'dither.alphaThreshold': 'Umbral Alfa',
    'dither.distanceMetric': 'Métrica de Distancia',
    'dither.distanceMetricTip': 'Cómo se calcula la similitud de colores. Euclidean: rápido, básico. Manhattan: transiciones más marcadas. CIEDE2000: perceptualmente preciso (más lento). RGB Redmean: buen balance de velocidad y precisión.',
    'dither.modeTip': 'None: colores sólidos. Floyd-Steinberg: difusión de error clásica, gradientes suaves. Jarvis: difusión más amplia, menos bandas. Bayer: patrón ordenado, look retro.',
    'dither.mode': 'Modo de Dither',
    'dither.amount': 'Intensidad de Dither',

    'palette.colors': 'Colores de Paleta',
    'palette.clear': 'Limpiar',
    'palette.colorCount': 'Cantidad de Colores',
    'palette.colorCountTip': 'Cantidad de colores a extraer de la imagen. Menor = más auténtico PSX. Texturas PSX típicas usan 16-32 colores.',
    'palette.kmeans': 'k-means++',
    'palette.kmeansTip': 'Usa el algoritmo WuQuant para selección de colores más inteligente. Produce paletas más uniformes perceptualmente pero es un poco más lento. Recomendado para imágenes fotográficas.',
    'palette.autoGenerate': 'Auto-generar',
    'palette.importFile': 'Importar Archivo',
    'palette.pick': 'Tomar',
    'palette.pickReplace': 'Tomar color para reemplazar',
    'palette.pickAdd': 'Tomar color para agregar a la paleta',
    'palette.lospec': 'Importar de Lospec',
    'palette.lospecTip': 'Pegá una URL de Lospec o el slug. Explorá paletas en lospec.com/palette-list',
    'palette.lospecPlaceholder': 'slug o URL de Lospec',
    'palette.import': 'Importar',
    'palette.builtin': 'Paletas Incluidas',
    'palette.builtinPlaceholder': 'Elegir paleta...',
    'palette.hardware': 'Hardware (PS1)',
    'palette.psx555': 'PSX 555 (5 bits)',
    'palette.psx555Tip': 'El hardware de PS1 guardaba colores a 5 bits por canal: solo 32 niveles RGB (0, 8, 16, …, 248) en vez de 256. Snappear cada pixel a ese grid produce el banding característico de juegos como Silent Hill o Tomb Raider 1. Útil para autenticidad de hardware. Sin clusterizado, sin dither, sin límite de colores — para paleta chica usá el modo \'generated\'.',
    'palette.psx555Hint': '32 niveles por canal · sin dither · sin clusters',
    'palette.psx555Disable': 'Desactivar PSX 555',
    'palette.addColor': 'Agregar color',
    'palette.pickScreen': 'Tomar color de pantalla',
    'palette.removeColor': 'Quitar color',

    'colors.brightness': 'Brillo',
    'colors.contrast': 'Contraste',
    'colors.saturation': 'Saturación',
    'colors.hue': 'Matiz',
    'colors.gamma': 'Gamma',
    'colors.tint': 'Tinte',
    'colors.red': 'Rojo',
    'colors.green': 'Verde',
    'colors.blue': 'Azul',
    'colors.crt': 'Efecto CRT',
    'colors.scanlines': 'Líneas de Escaneo',
    'colors.rgbShift': 'Desplazamiento RGB',
    'colors.vignette': 'Viñeta',

    'preview.original': 'Original',
    'preview.result': 'Resultado',
    'preview.converted': 'Convertido',
    'preview.processing': 'Procesando...',
    'preview.waiting': 'Esperando resultado...',
    'preview.swapPanels': 'Invertir paneles',
    'preview.inspectorTitle': 'Inspector de píxeles',

    'dropzone.drop': 'Arrastrá una imagen acá',
    'dropzone.dropActive': 'Soltá para convertir',
    'dropzone.browse': 'o hacé clic para buscar',

    'preset.load': 'Cargar',
    'preset.save': 'Guardar',
    'preset.saveTitle': 'Guardar Preset',
    'preset.loadTitle': 'Cargar Preset',
    'preset.namePlaceholder': 'Nombre del preset...',
    'preset.noPresets': 'No hay presets guardados',
    'preset.delete': 'Eliminar',
    'preset.factory': 'Incluidos',
    'preset.userPresets': 'Tus Presets',

    'toast.exported': 'PNG exportado',
    'toast.noResult': 'No hay resultado para exportar',
    'toast.imageLoaded': 'Imagen cargada',
    'toast.invalidFile': 'Archivo de imagen no válido',
    'toast.settingsReset': 'Configuración reiniciada',
    'toast.imageRemoved': 'Imagen eliminada',
    'toast.processingFailed': 'Error al procesar',
    'toast.exportTooLarge': 'Salida demasiado grande. Bajá la escala o el tamaño.',
    'toast.colorPicked': 'Color seleccionado: {hex}',
    'toast.colorAdded': '{hex} agregado a la paleta',
    'toast.noColors': 'No se encontraron colores en el archivo',
    'toast.copied': 'Copiado al portapapeles',
    'toast.copyFailed': 'Error al copiar',
    'toast.presetSaved': 'Preset "{name}" guardado',
    'toast.presetLoaded': '"{name}" cargado',
    'toast.presetDeleted': '"{name}" eliminado',
    'toast.lospecImported': 'Importados {count} colores de Lospec',
    'toast.fileImported': 'Importados {count} colores del archivo',

    'header.copy': 'Copiar',
    'header.copyTitle': 'Copiar al portapapeles (Ctrl+C)',

    'dropzone.dropReplace': 'Soltar para reemplazar imagen',

    'shortcuts.title': 'Atajos de Teclado',
    'shortcuts.undo': 'Deshacer',
    'shortcuts.redo': 'Rehacer',
    'shortcuts.copy': 'Copiar al portapapeles',
    'shortcuts.paste': 'Pegar imagen',
    'shortcuts.export': 'Exportar PNG',
    'shortcuts.preset': 'Cargar preset factory 1…9',
    'shortcuts.help': 'Mostrar atajos',

    'sidebar.history': 'Historial',
    'sidebar.clearHistory': 'Limpiar historial',
    'sidebar.toggle': 'Alternar panel',

    'lospec.error.empty': 'Ingresa un nombre o URL de Lospec',
    'lospec.error.notFound': 'Paleta no encontrada en Lospec',
    'lospec.error.server': 'Error del servidor de Lospec, reintenta luego',
    'lospec.error.network': 'Error de red — revisa tu conexión',
    'lospec.error.format': 'Datos de paleta inválidos desde Lospec',
    'lospec.error.unknown': 'No se pudo cargar la paleta',

    'export.scale': 'Escala de exportación',
    'export.scaleCustom': 'Personalizado…',
    'export.scaleCustomLabel': 'Multiplicador (1–32)',
    'export.indexed': 'PNG-8 (indexado)',
    'export.indexedTip': 'Archivo más liviano, paleta intacta. Si falla, exporta PNG-24 igual.',
    'export.indexedDisabled': 'Generá una paleta primero para habilitar PNG indexado.',

    'export.batch': 'Exportar en lote',
    'export.batchTitle': 'Exportar Múltiples Tamaños',
    'export.download': 'Descargar Todo',
    'toast.zipExported': 'ZIP exportado',
    'toast.zipFailed': 'Falló la exportación del ZIP',
    'toast.zipSkipped': 'tamaños omitidos',
    'toast.workerCrashed': 'Worker en segundo plano falló — usando hilo principal (puede ser más lento)',
    'toast.storageFull': 'Almacenamiento del navegador lleno — algunos ajustes no se guardarán. Elimina presets viejos para liberar espacio.',

    'colors.posterize': 'Posterizar',
    'colors.posterizeTip': 'Reduce la cantidad de tonos por canal. 0 = desactivado. Valores menores crean un look más gráfico y retro.',

    'dither.transparencyMode': 'Modo de Transparencia',
    'dither.transparencyNone': 'Ninguno',
    'dither.transparencyThreshold': 'Umbral Alpha',
    'dither.transparencyColorKey': 'Color Clave',
    'dither.colorKey': 'Color Clave',
    'dither.colorKeyTip': 'Los píxeles que coincidan con el color seleccionado se volverán transparentes antes de procesar. Por defecto: magenta (#FF00FF).',

    'preview.showGrid': 'Mostrar grilla de píxeles',
    'preview.hideGrid': 'Ocultar grilla de píxeles',
    'preview.showTile': 'Ver tileado (3×3)',
    'preview.hideTile': 'Ocultar tileado',

    'palette.exportTitle': 'Exportar Paleta',
    'palette.exportFormat': 'Elegir formato:',
    'palette.generatedColors': 'Colores Generados',
    'toast.paletteExported': 'Paleta exportada',
    'toast.bgImageError': 'No se pudo cargar la imagen de fondo',
    'toast.linkCopied': 'Link copiado al portapapeles',
    'toast.linkLoaded': 'Ajustes cargados desde link',
    'toast.linkTooLong': 'Link copiado — pero quedó muy largo. Considerá compartir el preset JSON.',
    'share.copy': 'Copiar link para compartir',
    'share.button': 'Compartir',
    'restore.title': '¿Continuar con tu última imagen?',
    'restore.continue': 'Continuar',
    'restore.discard': 'Descartar',
    'tour.welcomeTitle': 'Bienvenido a PSX Converter',
    'tour.welcomeBody': 'Convertí cualquier imagen en una textura pixel art estilo PlayStation 1. Tour de 5 pasos — un minuto y listo.',
    'tour.loadTitle': 'Cargá una imagen',
    'tour.loadBody': 'Arrastrá, hacé click, pegá con Ctrl+V, o probá un ejemplo de la galería de abajo.',
    'tour.loadBodyLoaded': 'Ya tenés una imagen cargada. Podés reemplazarla arrastrando otra encima del preview.',
    'tour.settingsTitle': 'Ajustá el look',
    'tour.settingsBody': 'Cinco pestañas: Resize, Dither, Paleta, Colores, Efectos. Cada cambio se previsualiza en tiempo real.',
    'tour.exportTitle': 'Exportá tu textura',
    'tour.exportBody': 'PNG con nombre inteligente. Ctrl+S también funciona. El batch export te da un ZIP con varios tamaños.',
    'tour.shortcutsTitle': 'Atajos de teclado',
    'tour.shortcutsBody': 'Este botón `?` abre la lista completa. Destacados: Ctrl+Z deshacer, Ctrl+1…9 cargar preset, Ctrl+V pegar.',
    'tour.next': 'Siguiente',
    'tour.back': 'Atrás',
    'tour.skip': 'Saltar',
    'tour.done': 'Listo',
    'tour.dontShow': 'No mostrar más',
    'tour.replay': 'Repetir tour de bienvenida',

    'dropzone.examples': 'O probá un ejemplo',
    'dropzone.exampleLoaded': 'Ejemplo cargado',

    'preset.compare': 'Comparar',
    'preset.compareTitle': 'Comparar Preset',
    'preset.currentSettings': 'Actual',
    'preset.processing': 'Procesando...',

    // Film Grain
    'effects.grain': 'Grano de Película',
    'effects.grainTip': 'Agrega ruido analógico a la imagen. Simula grano de película o sensor CRT.',
    'effects.grainSeedLock': 'Bloquear semilla de grano (export reproducible)',
    'effects.grainSeedUnlock': 'Desbloquear semilla (aleatoria cada render)',
    'effects.grainSeedLocked': 'Bloqueada',
    'effects.grainSeedRandom': 'Aleatoria',
    'effects.grainSeedRegenerate': 'Click para generar nueva semilla',

    // Levels
    'colors.levels': 'Niveles',
    'colors.levelsInLow': 'Negro de entrada',
    'colors.levelsInHigh': 'Blanco de entrada',
    'colors.levelsOutLow': 'Negro de salida',
    'colors.levelsOutHigh': 'Blanco de salida',
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('psx-locale');
    if (saved === 'en' || saved === 'es') return saved;
  } catch { /* localStorage may throw in privacy modes */ }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() ?? '';
    if (lang.startsWith('es')) return 'es';
  }
  return 'en';
}

let _locale: Locale = detectInitialLocale();
let _listeners: Array<() => void> = [];

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(locale: Locale) {
  _locale = locale;
  localStorage.setItem('psx-locale', locale);
  for (const fn of _listeners) fn();
}

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const raw = translations[_locale][key] ?? translations.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export function subscribeLocale(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
