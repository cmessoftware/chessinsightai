# Análisis SHAP - Partida ELO ~2800+ (Motor Stockfish)

Analiza esta partida de ajedrez usando los valores SHAP que explican cómo el modelo ML detectó errores:

## CONTEXTO DEL JUGADOR
- **ELO Aproximado**: ~2800+ (Motor de ajedrez Stockfish)
- **Nivel**: Gran Maestro / Motor
- **Esperado en este nivel**: Perfección táctica casi absoluta, errores posicionales sutiles valorados en centipawns, imprecisiones en finales largos y complejos, decisiones estratégicas de horizon effect

## DATOS DEL ANÁLISIS SHAP
**Game ID**: 5daf60d3cfe938edbe083c9bd584b6a62b27c106...
**Total de movidas**: 461 movimientos (partida larguísima)
**Analysis ID**: 49

### Top 5 Features Más Influyentes (promedio |SHAP|)
1. **opponent_mobility**: 0.2172 (en 461 movidas)
   - Opciones del oponente
   - Motor evalúa precisamente movilidad enemiga

2. **material_balance**: 0.2119 (en 461 movidas)
   - Diferencia de material
   - Incluso motores: material es fundamental

3. **is_center_controlled**: 0.2053 (en 461 movidas)
   - Control del centro
   - Feature ESTRATÉGICA (más importante que en ELO 1400)

4. **branching_factor**: 0.1544 (en 461 movidas)
   - Complejidad posicional
   - Motor sufre en posiciones muy complejas (horizon effect)

5. **score_diff**: 0.1498 (en 461 movidas)
   - Evaluación de Stockfish
   - Auto-referencia del motor

### Distribución de Errores
- **Blunders**: 6 total (2 black, 4 white)
- **Mistakes**: 30 total (15 black, 15 white)
- **Inaccuracies**: 45 total (26 black, 19 white)
- **Good moves**: 378 (186 black, 192 white)
- **Excellent**: 1 (black)
- **Book**: 1 (white)

**Ratio error/total**: ~18% de movidas con errores (¡sorprendentemente alto para un motor! Indica partida extremadamente compleja o limitaciones computacionales)

### Movidas Críticas (Blunders & Mistakes)

1. **Move 387 (black): Bf7 - MISTAKE**
   - **Feature crítica**: `is_center_controlled = 0.0`
   - **SHAP**: -0.6793 (contribución NEGATIVA muy fuerte)
   - **Interpretación**: NO controlar el centro es malo, pero aquí el alfil busca actividad en flanco. SHAP negativo sugiere que el modelo pensó que SÍ debería ser error, pero no lo es tanto

2. **Move 13 (white): Kg2 - MISTAKE**
   - **Feature crítica**: `opponent_mobility = 22.0`
   - **SHAP**: +0.6712 (contribución POSITIVA muy alta)
   - **Interpretación**: Rey activo temprano da movilidad (22 opciones) al oponente - error posicional sutil

3. **Move 109 (white): Kc5 - MISTAKE**
   - **Feature crítica**: `opponent_mobility = 24.0`
   - **SHAP**: -0.6605 (contribución NEGATIVA alta)
   - **Interpretación**: Rey activo en final pero da demasiada movilidad al rival. SHAP negativo sugiere contradicción: el motor calculó bien pero el modelo ML lo marca como error

---

## OBSERVACIONES CLAVE

### Diferencia con ELO 1400
- **Partida 6.9x más larga** (461 vs 67 movidas)
- **Errores más sutiles** (valores SHAP más altos en magnitud absoluta)
- **Más errores absolutos** (81 vs 14) pero **ratio similar** (~18% vs ~21%)
- **Features estratégicas dominan**: `is_center_controlled` y `branching_factor` son más importantes
- **No hay "material_total"** en top 5 (el motor no pierde piezas tontamente)

### Diferencia en SHAP Values
- **ELO 1400**: SHAP values bajos (0.31-0.37) - errores "obvios"
- **ELO 2800+**: SHAP values altos (0.66-0.67) - errores "sutiles" que el modelo detecta con más dificultad

---

## ANÁLISIS SOLICITADO

Por favor proporciona:

1. **Análisis de Patrones según ELO** (¿son errores típicos de un motor en horizonte largo?)
2. **Interpretación de Features SHAP** (¿por qué estas features dominan vs. novato?)
3. **Análisis de Movidas Críticas** (¿qué revela sobre límites computacionales?)
4. **Comparación con ELO 1400** (diferencias clave en features y errores)
5. **Conclusión sobre Modelo ML** (¿el modelo captura bien diferencias de nivel?)
