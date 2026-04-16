const translations = {
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

    // Dropzone loading
    'dropzone.loading': 'Loading image...',
    'dropzone.loadError': 'Could not read the file',
    'dropzone.exampleError': 'Could not load example',

    // Bottom bar
    'view.compare': 'Compare',
    'view.sideBySide': 'Side by Side',

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
    'sample.offsetX': 'Sample X Offset',
    'sample.offsetY': 'Sample Y Offset',
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
    'palette.addColor': 'Add color',
    'palette.pickScreen': 'Pick color from screen',

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
    'toast.colorPicked': 'Color picked',
    'toast.colorAdded': 'Added to palette',
    'toast.noColors': 'No colors found in file',
    'toast.copied': 'Copied to clipboard',
    'toast.copyFailed': 'Failed to copy',

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
    'shortcuts.export': 'Export PNG',
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

    // Dropzone loading
    'dropzone.loading': 'Cargando imagen...',
    'dropzone.loadError': 'No se pudo leer el archivo',
    'dropzone.exampleError': 'No se pudo cargar el ejemplo',

    'view.compare': 'Comparar',
    'view.sideBySide': 'Lado a Lado',

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
    'sample.offsetX': 'Offset X',
    'sample.offsetY': 'Offset Y',
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
    'palette.addColor': 'Agregar color',
    'palette.pickScreen': 'Tomar color de pantalla',

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
    'toast.colorPicked': 'Color seleccionado',
    'toast.colorAdded': 'Agregado a la paleta',
    'toast.noColors': 'No se encontraron colores en el archivo',
    'toast.copied': 'Copiado al portapapeles',
    'toast.copyFailed': 'Error al copiar',

    'header.copy': 'Copiar',
    'header.copyTitle': 'Copiar al portapapeles (Ctrl+C)',

    'dropzone.dropReplace': 'Soltar para reemplazar imagen',

    'shortcuts.title': 'Atajos de Teclado',
    'shortcuts.undo': 'Deshacer',
    'shortcuts.redo': 'Rehacer',
    'shortcuts.copy': 'Copiar al portapapeles',
    'shortcuts.export': 'Exportar PNG',
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

    'dropzone.examples': 'O probá un ejemplo',
    'dropzone.exampleLoaded': 'Ejemplo cargado',

    'preset.compare': 'Comparar',
    'preset.compareTitle': 'Comparar Preset',
    'preset.currentSettings': 'Actual',
    'preset.processing': 'Procesando...',

    // Film Grain
    'effects.grain': 'Grano de Película',
    'effects.grainTip': 'Agrega ruido analógico a la imagen. Simula grano de película o sensor CRT.',

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

let _locale: Locale = (localStorage.getItem('psx-locale') as Locale) || 'en';
let _listeners: Array<() => void> = [];

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(locale: Locale) {
  _locale = locale;
  localStorage.setItem('psx-locale', locale);
  for (const fn of _listeners) fn();
}

export function t(key: TranslationKey): string {
  return translations[_locale][key] ?? translations.en[key] ?? key;
}

export function subscribeLocale(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
