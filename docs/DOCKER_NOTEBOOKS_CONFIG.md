# 🐳 Docker Configuration for ChessInsightAI

## 📋 Container Architecture Update

### **🔧 Changes Made:**

#### **dockerfile.notebooks** ✅ UPDATED
- **WORKDIR**: Changed from `/notebooks` to `/chessinsightai`
- **PYTHONPATH**: Updated to include full repository structure
- **Git LFS**: Pre-configured with global git settings
- **JupyterLab**: Now serves from repository root

#### **docker-compose.yml** ✅ UPDATED
- **Volume Mounting**: Full repository mounted as `.:/chess_trainer`
- **Dataset Access**: Shared volume `chess_datasets:/chess_trainer/datasets`
- **Data Directory**: Local data mounted as `./data:/chess_trainer/data`
- **Environment**: Added `GIT_LFS_SKIP_SMUDGE=1` option

### **🚀 How to Use:**

#### **Start the Notebooks Container:**
```bash
# Build and start
docker-compose up notebooks --build

# Access JupyterLab
# http://localhost:8888
```

#### **Git LFS Configuration:**
```bash
# Inside container - configure Git LFS
./configure_git_lfs.sh

# Download LFS files (if needed)
git lfs pull

# Check LFS status
git lfs ls-files
```

### **📁 Directory Structure in Container:**

```
/chess_trainer/                 # Repository root (WORKDIR)
├── notebooks/                  # Jupyter notebooks
│   ├── eda_analysis.ipynb     # Main EDA notebook
│   ├── chess_evaluation.ipynb
│   └── ...
├── datasets/                   # Dataset files (shared volume)
│   ├── export/
│   ├── games/
│   └── ...
├── data/                      # Local data directory
├── src/                       # Source code
└── configure_git_lfs.sh       # LFS configuration script
```

### **🔍 Benefits of New Configuration:**

1. **Full Git Integration**: Complete repository access with Git LFS
2. **Proper Path Resolution**: PYTHONPATH includes both `/chess_trainer/src` and root
3. **Dataset Sharing**: Shared volumes between main app and notebooks
4. **LFS Ready**: Pre-configured for large file management
5. **Development Friendly**: Direct mounting of repository for live editing

### **⚠️ Important Notes:**

- **Git LFS**: Run `./configure_git_lfs.sh` on first container start
- **Large Files**: Datasets are automatically handled by Git LFS
- **Performance**: `GIT_LFS_SKIP_SMUDGE=1` skips automatic LFS download
- **Data Persistence**: Use shared volumes for dataset consistency

---

*Updated: July 1, 2025*  
*Configuration: Docker + Git LFS + JupyterLab + ChessInsightAI*
