# 📊 Guía: Consultar Resultados de Análisis SHAP desde Postman

## ✅ Análisis Completado
Tu análisis se ejecutó correctamente y guardó resultados en `analysis_results`:
- **analysis_id**: 1
- **game_id**: `00a474189fe12b8e90da2f2eaa9ea94a4daccd58291652c4b825a2b83b87b245`  
- **username**: `cmess1315`
- **error_level**: `excellent`
- **total_moves**: 50
- **blunder_count**: 0
- **mistake_count**: 3

## 🔍 Endpoints Disponibles para Consultar Resultados

### 1️⃣ Distribución de Errores
**GET** `{{baseUrl}}/api/stats/error-distribution?days=30`

**Headers**:
```
Authorization: Bearer {{authToken}}
```

**Descripción**: Muestra el conteo de blunders, mistakes, inaccuracies y good moves en los últimos N días.

**Respuesta esperada**:
```json
{
  "distribution": [
    {"error_level": "excellent", "count": 1, "percentage": 100.0}
  ]
}
```

---

### 2️⃣ Tendencia Temporal de Errores
**GET** `{{baseUrl}}/api/stats/error-trend?days=30`

**Headers**:
```
Authorization: Bearer {{authToken}}
```

**Descripción**: Evolución de errores en el tiempo (útil para gráficos de líneas).

**Respuesta esperada**:
```json
[
  {
    "date": "2026-02-24",
    "blunder_rate": 0.0,
    "mistake_rate": 6.0,
    "inaccuracy_rate": 0.0,
    "accuracy": 94.0
  }
]
```

---

### 3️⃣ Importancia Global de Features
**GET** `{{baseUrl}}/api/analysis/global-feature-importance`

**Headers**:
```
Authorization: Bearer {{authToken}}
```

**Descripción**: Ranking de las features más importantes según SHAP.

**⚠️ NOTA**: Este endpoint requiere que se hayan guardado valores SHAP en `player_feature_importance`. Actualmente está vacío porque el modelo ML no está cargado (modo simulación falló).

**Respuesta esperada (cuando haya datos)**:
```json
[
  {
    "feature_name": "material_balance",
    "mean_abs_shap": 0.245,
    "mean_shap": -0.123,
    "total_samples": 150
  },
  ...
]
```

---

### 4️⃣ SHAP por Movimiento Individual
**GET** `{{baseUrl}}/api/analysis/game/{game_id}/shap?move_number=1`

**Parámetros de ruta**:
- `game_id`: ID de la partida analizada

**Query Parameters**:
- `move_number`: Número del movimiento a explicar (1, 2, 3, ...)

**Headers**:
```
Authorization: Bearer {{authToken}}
```

**Ejemplo en Postman**:
```
GET {{baseUrl}}/api/analysis/game/00a474189fe12b8e90da2f2eaa9ea94a4daccd58291652c4b825a2b83b87b245/shap?move_number=1
```

**⚠️ NOTA**: Este endpoint requiere datos en `move_shap_values`. Actualmente vacío por el mismo motivo.

**Respuesta esperada (cuando haya datos)**:
```json
{
  "move_number": 1,
  "predicted_error_level": "good_move",
  "prediction_confidence": 0.87,
  "feature_contributions": {
    "material_balance": 0.12,
    "self_mobility": -0.08,
    "score_diff": 0.24,
    ...
  }
}

```

---

## 🐛 Problema Actual: Valores SHAP No Se Guardan

### Diagnóstico
Los endpoints de stats (#1 y #2) **funcionan correctamente** porque usan `analysis_results`.

Los endpoints de SHAP (#3 y #4) **devuelven listas vacías** porque el servicio SHAP está fallando silenciosamente:

```python
# En analysis_service.py:
try:
    shap_values, base_value = self.shap_service.calculate_shap_values(features_df)
except Exception as e:
    print(f"⚠️  Error calculando SHAP: {e}")
    shap_values = None  # ← Aquí se pierde todo el análisis SHAP
```

### Solución
El modo simulación de SHAP debería funcionar aunque no haya modelo ML real. Necesitarás:

1. **Verificar logs del backend** para ver el error específico del SHAP service
2. **Instalar dependencias faltantes** (si es un ImportError):
   ```bash
   conda activate chess_trainer
   pip install shap scikit-learn
   ```

3. **Ejecutar un análisis de prueba** con logging habilitado para capturar el error exacto.

---

## 📝 Configuración de Postman

### Variables de Colección
En tu colección de Postman, asegúrate de tener estas variables:

| Variable    | Initial Value           | Current Value                               |
| ----------- | ----------------------- | ------------------------------------------- |
| `baseUrl`   | `http://localhost:8000` | `http://localhost:8000`                     |
| `authToken` | (vacío)                 | (se llena automáticamente después de login) |

### Script de Tests para Login
En el request **POST /api/auth/login**, ágrega esto en la pestaña **Tests**:

```javascript
// Guardar token automáticamente después del login
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set("authToken", jsonData.access_token);
    console.log("✅ Token guardado:", jsonData.access_token.substring(0, 20) + "...");
}
```

Así no tendrás que copiar/pegar el token manualmente.

---

## 🎯 Próximos Pasos

1. **Para ver resultados ahora**: Usa endpoints #1 y #2 (funcionan perfectamente)
2. **Para habilitar SHAP completo**: Debugging del SHAP service para que persista valores en DB
3. **Frontend Dashboard**: Los 4 componentes React consumirán estos endpoints cuando estén listos

---

## 📚 Referencia Rápida de URLs

### Autenticación
- `POST /api/auth/login` → Obtener token
- `GET /api/auth/roles/matrix` → Ver permisos

### Stats (funcionando ✅)
- `GET /api/stats/error-distribution?days=30`
- `GET /api/stats/error-trend?days=30`

### SHAP (vacío por ahora ⏳)
- `GET /api/analysis/global-feature-importance`
- `GET /api/analysis/game/{game_id}/shap?move_number=1`

### Ejecutar Análisis
- `POST /api/analysis/run` → Analizar nueva partida

---

**Última actualización**: 2026-02-24  
**Estado Backend**: ✅ Corriendo en `localhost:8000`  
**Estado SHAP**: ⏳ Requiere debugging del servicio de explicabilidad
