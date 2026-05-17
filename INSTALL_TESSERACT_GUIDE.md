# Guía de Instalación de Tesseract OCR para Chess Trainer

**Fecha:** 14 de marzo, 2026  
**Propósito:** Procesar 13 PDFs escaneados de libros de ajedrez con OCR

---

## Estado Actual

✅ **Poppler:** Instalado (v23.13.0)  
✅ **Python packages:** pytesseract, pdf2image, pillow instalados en `chess_trainer`  
❌ **Tesseract binary:** NO instalado (necesario)

---

## Instalación Manual de Tesseract (Windows)

### Paso 1: Descargar Instalador

1. Abre tu navegador
2. Ve a: **https://github.com/UB-Mannheim/tesseract/wiki**
3. Descarga la versión más reciente (recomendado 5.x):
   - `tesseract-ocr-w64-setup-5.x.x.exe` (~80-100 MB)

### Paso 2: Ejecutar Instalador

1. Ejecuta el archivo descargado
2. Durante la instalación:
   - ✅ Ruta de instalación: `C:\Program Files\Tesseract-OCR` (por defecto)
   - ✅ **IMPORTANTE:** Marca "Additional language data"
   - ✅ Selecciona idiomas: **Spanish (spa)** y **English (eng)**
   - ✅ Acepta agregar al PATH del sistema

### Paso 3: Verificar Instalación

Abre una **nueva** ventana de PowerShell y ejecuta:

```powershell
tesseract --version
```

**Salida esperada:**
```
tesseract 5.x.x
 leptonica-1.x.x
  ...
```

### Paso 4: Verificar Idiomas

```powershell
tesseract --list-langs
```

**Salida esperada:**
```
List of available languages (3):
eng
osd
spa
```

---

## Instalación Alternativa (Si el instalador falla)

### Descarga Manual de Archivos

1. **Tesseract Binary:**
   - https://digi.bib.uni-mannheim.de/tesseract/
   - Descargar `tesseract-ocr-w64-setup-5.x.x.exe`

2. **Archivos de idioma (si no se instalaron):**
   - https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata
   - https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata
   - Copiar a: `C:\Program Files\Tesseract-OCR\tessdata\`

### Agregar al PATH manualmente

```powershell
# Agregar Tesseract al PATH del sistema
[System.Environment]::SetEnvironmentVariable(
    "Path",
    "$env:Path;C:\Program Files\Tesseract-OCR",
    "Machine"
)

# Refrescar PATH en la sesión actual
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

---

## Verificación Completa

Ejecuta este script para verificar toda la configuración OCR:

```powershell
C:/Users/sergiosal/miniforge3/envs/chess_trainer/python.exe -c "
import sys
print('=== VERIFICACIÓN OCR ===\n')

# 1. Tesseract
try:
    import pytesseract
    version = pytesseract.get_tesseract_version()
    print(f'✅ Tesseract: {version}')
except Exception as e:
    print(f'❌ Tesseract: {e}')

# 2. pdf2image
try:
    from pdf2image import convert_from_path
    print('✅ pdf2image: Instalado')
except Exception as e:
    print(f'❌ pdf2image: {e}')

# 3. Pillow
try:
    from PIL import Image
    print('✅ Pillow: Instalado')
except Exception as e:
    print(f'❌ Pillow: {e}')

print('\n✅ Todo listo para procesar PDFs con OCR')
"
```

---

## Procesar PDFs Escaneados

Una vez Tesseract instalado, ejecuta:

```powershell
C:/Users/sergiosal/miniforge3/envs/chess_trainer/python.exe src/scripts/init_chess_rag.py
```

**Resultado esperado:**
- ✅ Detectará automáticamente los 13 PDFs escaneados
- ✅ Aplicará OCR con idiomas español + inglés
- ✅ Procesará ~2-5 minutos por libro
- ✅ Agregará ~2,000-4,000 chunks más a ChromaDB
- ✅ Total final: ~10,000-12,000 documentos

---

## Libros Pendientes de Procesamiento

**13 PDFs escaneados que requieren OCR:**

1. kupdf.net_modern-chess-openings-15th-edition.pdf (MCO-15) ⭐
2. fundamental-chess-endings_compress.pdf
3. my-system-21st-century-edition-aaron-nimzowitsch.pdf
4. the-art-of-attack-in-chess.pdf
5. como-jugar-finales-de-torres.pdf
6. finales-de-peones.pdf
7. finales-tacticos.pdf
8. entrenamiento-sistematico-en-ajedrez.pdf
9. hellsten-mastering-chess-strategy.pdf
10-13. (Otros libros de finales y estrategia)

**Nota:** MCO-15 es particularmente importante - es la referencia autoritativa de aperturas.

---

## Solución de Problemas

### Error: "tesseract is not installed or it's not in your PATH"

**Solución:**
1. Verifica que Tesseract esté en: `C:\Program Files\Tesseract-OCR\tesseract.exe`
2. Reinicia PowerShell
3. Ejecuta el comando de agregar al PATH
4. Reinicia PowerShell nuevamente

### Error: "Unable to get page count. Is poppler installed?"

**Solución:**
- Poppler ya está instalado en tu sistema (MiKTeX)
- Si el error persiste, descarga Poppler standalone:
  - https://github.com/oschwartz10612/poppler-windows/releases/
  - Agrega `bin/` al PATH

### OCR muy lento

**Esperado:**
- Primera página: ~30-60 segundos (carga del modelo)
- Páginas siguientes: ~5-15 segundos cada una
- Libro completo (200 páginas): ~20-40 minutos

**Optimización:**
- El código ya usa DPI=300 (balance calidad/velocidad)
- Se procesa en modo batch con checkpoint

---

## Próximos Pasos

1. **Instalar Tesseract** (sigue Paso 1-4 arriba)
2. **Verificar instalación** con `tesseract --version`
3. **Ejecutar procesamiento:**
   ```powershell
   C:/Users/sergiosal/miniforge3/envs/chess_trainer/python.exe src/scripts/init_chess_rag.py
   ```
4. **Monitorear progreso** (verás logs por cada página procesada)
5. **Verificar resultado:**
   ```powershell
   C:/Users/sergiosal/miniforge3/envs/chess_trainer/python.exe checkpoint_status.py
   ```

---

## Contacto / Referencias

- **Tesseract GitHub:** https://github.com/tesseract-ocr/tesseract
- **Instaladores Windows:** https://github.com/UB-Mannheim/tesseract/wiki
- **Documentación pytesseract:** https://pypi.org/project/pytesseract/
- **Configuración del proyecto:** `requirements_ai_coach.txt`

---

**TL;DR:** Descarga e instala `tesseract-ocr-w64-setup-5.x.x.exe` desde GitHub, marca idiomas Spanish+English, y ejecuta `init_chess_rag.py`. El resto es automático.
