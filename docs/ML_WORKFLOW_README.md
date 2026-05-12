# 🚀 ML Workflow Integrado - ChessInsightAI

## 🎯 Descripción

Este flujo de trabajo ML integrado proporciona un entorno completo para el desarrollo, experimentación y despliegue de modelos de machine learning en VS Code, utilizando las mejores herramientas del ecosistema.

## 🛠️ Stack Tecnológico

### Core ML Tools
- **🧠 AI Toolkit**: Asistencia con IA para desarrollo
- **📊 Data Wrangler**: Exploración visual de datos
- **📓 Jupyter**: Notebooks interactivos
- **🔄 DVC**: Versionado de datos y pipelines
- **📈 MLflow**: Seguimiento de experimentos y modelos
- **🔍 Netron**: Visualización de modelos

### Infraestructura
- **🐳 Docker Compose**: Servicios containerizados
- **🗄️ PostgreSQL**: Base de datos para experimentos
- **📦 Python**: Entorno de desarrollo

## 🚀 Inicio Rápido

### 1. Configuración Inicial

```bash
# Levantar todos los servicios
docker-compose up -d

# Acceder a MLflow UI
http://localhost:5000

# Acceder a Jupyter
http://localhost:8888
```

### 2. Ejecutar desde VS Code

#### Opción A: Tareas Automatizadas (Recomendado)
- Presiona `Ctrl+Shift+P` → "Tasks: Run Task"
- Selecciona: "🚀 ML Workflow: Start All Services"

#### Opción B: Notebook Interactivo
- Abre `notebooks/ml_workflow_integrated.ipynb`
- Ejecuta las celdas secuencialmente
- Los experimentos se registran automáticamente en MLflow

### 3. Comandos Útiles

```bash
# Ejecutar notebook desde terminal
docker-compose exec notebooks jupyter nbconvert --execute /notebooks/ml_workflow_integrated.ipynb

# Ver logs de MLflow
docker-compose logs -f mlflow

# Detener servicios
docker-compose down
```

## 📋 Tareas de VS Code Disponibles

| Tarea                       | Descripción                          | Grupo |
| --------------------------- | ------------------------------------ | ----- |
| 🚀 Start MLflow Server       | Inicia solo MLflow                   | Build |
| 📊 Start All Services        | Inicia todos los servicios           | Build |
| 🔬 Execute Training Notebook | Ejecuta el notebook de entrenamiento | Test  |
| 🌐 Open MLflow UI            | Abre la interfaz web de MLflow       | None  |
| 🔍 View Docker Logs          | Muestra logs de MLflow               | None  |
| 🛑 Stop All Services         | Detiene todos los servicios          | None  |
| 🧹 Clean and Restart         | Limpia y reinicia servicios          | Build |

## 📊 Flujo ML Completo

### 1. Preparación de Datos
```python
# Carga y preparación automática
X, y = generate_chess_sample_data(1000)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
```

### 2. Entrenamiento con MLflow
```python
# Entrenamiento automático con logging
models = {
    "RandomForest": RandomForestClassifier(n_estimators=100),
    "LogisticRegression": LogisticRegression(max_iter=1000)
}

for model_name, model in models.items():
    train_and_log_model(model, model_name, X_train, X_test, y_train, y_test)
```

### 3. Análisis y Comparación
- Métricas automáticas: Accuracy, Precision, Recall, F1-Score
- Visualizaciones comparativas
- Identificación del mejor modelo

### 4. Registro y Despliegue
```python
# Registro automático del mejor modelo
register_best_model("chess_position_evaluation", "chess_position_classifier")

# Promoción a producción
promote_model_to_production("chess_position_classifier")

# Carga del modelo para predicciones
production_model = load_production_model("chess_position_classifier")
```

## 🎯 Características del Notebook

### Estructura Completa
1. **Configuración del entorno** con verificaciones
2. **Carga de datos** y preparación automática
3. **Ejecución de scripts** desde VS Code
4. **Configuración de MLflow** con tracking
5. **Entrenamiento de modelos** con logging automático
6. **Análisis comparativo** con visualizaciones
7. **Registro de modelos** en Model Registry
8. **Mejores prácticas** y automatización

### Métricas Registradas
- **Rendimiento**: Accuracy, Precision, Recall, F1-Score
- **Parámetros**: Hiperparámetros del modelo
- **Metadatos**: Tipo de modelo, tamaño del dataset, características
- **Artefactos**: Modelos serializados, gráficos, logs

## 🔧 Configuración de VS Code

### Extensiones Recomendadas
- AI Toolkit for VS Code
- Data Wrangler
- Python
- Jupyter
- DVC
- Netron Model Viewer
- Remote - Containers
- YAML
- JSON

### Settings Optimizados
- Jupyter integrado con VS Code
- Python interpreter configurado
- Formato automático con Black
- Linting con Flake8
- Testing con Pytest

## 📁 Estructura del Proyecto

```
chessinsightai/
├── .vscode/
│   ├── tasks.json          # Tareas automatizadas
│   ├── settings.json       # Configuración de VS Code
│   └── extensions.json     # Extensiones recomendadas
├── notebooks/
│   └── ml_workflow_integrated.ipynb  # Notebook principal
├── docker-compose.yml      # Servicios Docker
├── mlruns/                 # Experimentos MLflow
└── data/                   # Datasets
```

## 🚀 Próximos Pasos

### Desarrollo
- [ ] Integrar datos reales de partidas de ajedrez
- [ ] Implementar feature engineering especializado
- [ ] Añadir modelos deep learning (CNN, RNN)
- [ ] Configurar hyperparameter tuning automático

### DevOps
- [ ] Configurar DVC para versionado de datos
- [ ] Implementar CI/CD para modelos
- [ ] Añadir tests automáticos para modelos
- [ ] Configurar monitoreo en producción

### Productización
- [ ] API REST para predicciones
- [ ] Integración con Streamlit app
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Alertas automáticas por degradación

## 🆘 Troubleshooting

### Problemas Comunes

**MLflow no arranca:**
```bash
docker-compose logs mlflow
docker-compose restart mlflow
```

**Jupyter no conecta:**
```bash
docker-compose down
docker-compose up -d notebooks
```

**Problemas de permisos:**
```bash
# Windows PowerShell como administrador
docker-compose down
docker system prune -f
docker-compose up -d
```

## 📞 Soporte

- **Documentación MLflow**: https://mlflow.org/docs/
- **VS Code AI Toolkit**: https://code.visualstudio.com/docs/
- **Data Wrangler**: https://marketplace.visualstudio.com/items?itemName=ms-toolsai.datawrangler

---

**✅ ¡Tu flujo ML está listo para producción con seguimiento completo y ejecución desde VS Code!**
