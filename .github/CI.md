# CI / PR 自动化文档

## 概述

基于《CI-PR自动化复现指南》实现的自动化流程，包含 CI 与 PR Review 两个工作流。

## 工作流

| 工作流 | 触发 | 功能 |
|--------|------|------|
| CI | PR 创建/更新 | 代码检查（语法、Flake8 严重错误、模块导入）、Docker 构建 |
| PR Review | PR 创建/更新 | 安全检查、静态检查、AI 代码审查、自动标签、审查报告 |

## 触发条件

两个工作流均仅在以下路径变更时触发：

- `backend/**/*.py`
- `backend/requirements.txt`
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/**`

## CI 流程

1. **代码检查**：Python 语法（py_compile）、Flake8（E9,F63,F7,F82）、`from main import app` 模块导入
2. **Docker 构建**：构建镜像并执行冒烟测试 `python -c "print('✅ Docker OK')"`

## PR Review 流程

```
security-check（检查 .github/workflows、.github/scripts 是否被修改）
    ↓
auto-check（对变更的 .py 做语法 + Flake8）
    ↓
ai-review（Gemini/OpenAI 语义审查，需 has_py_changes）
    ↓
comment（汇总报告，发表/更新 PR 评论）
```

`labeler` 独立运行，按文件路径和变更量打标签。

## 安全检查

若 PR 修改了 `.github/workflows/*.yml` 或 `.github/scripts/*.py`，则 `safe_to_run=false`，后续 AI 审查及报告跳过，避免恶意 PR 操控审查逻辑。

## GitHub 配置

### Secrets（必须）

- `OPENAI_API_KEY`：OpenAI 兼容 API Key（推荐，支持 DeepSeek / OpenAI / 国产模型）
- `GEMINI_API_KEY`：Gemini API Key（备用）

### Variables（可选）

- `OPENAI_BASE_URL`：API 地址。**DeepSeek** 填 `https://api.deepseek.com/v1`
- `OPENAI_MODEL`：模型名。**DeepSeek** 填 `deepseek-chat` 或 `deepseek-coder`
- `GEMINI_MODEL_FALLBACK`：Gemini 模型，默认 `gemini-2.5-flash`

### Labels（需预先创建）

业务：`backend`、`plugins`、`frontend`、`documentation`、`ci/cd`、`scripts`  
规模：`size/S`、`size/M`、`size/L`、`size/XL`

## 本地检查

```bash
# Python 检查
cd backend
python -m py_compile main.py
flake8 --select=E9,F63,F7,F82 main.py
python -c "from main import app"

# Docker
docker build -t chatraw:test .
docker run --rm chatraw:test python -c "print('✅ Docker OK')"
```

## 配置

- `.flake8`：Python 代码风格（CI 仅用严重错误 E9,F63,F7,F82）
- `backend/requirements.txt`：Python 依赖
