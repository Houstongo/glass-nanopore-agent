# 项目运行入口

## 约束

- `firmware/etching_controller` 下的 STM32 代码默认不修改
- 本文档提供的是外围运行入口，不是固件源码改造方案
- 应用层统一从 `apps/glass_nanopore_agent` 启动

## 应用层入口

### 1. 启动后端

脚本：

- `D:\AntigravityProject\scripts\dev\run-agent.ps1`

示例：

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-agent.ps1
```

可选参数：

- `-CondaEnv lab_agent`
- `-BindHost 127.0.0.1`
- `-Port 8000`
- `-CurrentWindow`

### 2. 启动前端

脚本：

- `D:\AntigravityProject\scripts\dev\run-frontend.ps1`

示例：

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-frontend.ps1
```

可选参数：

- `-BindHost 127.0.0.1`
- `-BindPort 5173`
- `-CurrentWindow`

### 3. 同时启动前后端

脚本：

- `D:\AntigravityProject\scripts\dev\run-all.ps1`

示例：

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-all.ps1 -OpenBrowser
```

### 4. 开发环境自检

脚本：

- `D:\AntigravityProject\scripts\dev\check-dev-env.ps1`

用途：

- 检查应用主目录、后端入口、前端 `package.json`
- 检查数据库文件和外部 `cvdata` 路径
- 检查固件 `.ioc` 是否存在
- 检查 `python`、`powershell`、`npm`、`conda` 是否可用
- 检查 `node spawn(pipe)` 运行能力（Vite/esbuild 依赖）

示例：

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\check-dev-env.ps1
```

如果输出 `node spawn(pipe): BLOCKED`：

- 当前终端环境会阻断 Vite/esbuild 子进程
- 前端可能报 `spawn EPERM`
- 需要在普通系统 PowerShell/Terminal 中运行前端启动脚本

## 固件层只读入口

脚本：

- `D:\AntigravityProject\scripts\firmware\show-firmware-layout.ps1`

用途：

- 查看 `firmware/etching_controller` 的关键结构
- 确认 `.ioc`、`Core/`、`Drivers/`、`MDK-ARM/` 等关键项是否存在
- 明确提醒当前流程不修改 STM32 源码

示例：

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\firmware\show-firmware-layout.ps1
```

## 当前关键目录

- 应用主目录：`D:\AntigravityProject\apps\glass_nanopore_agent`
- 固件主目录：`D:\AntigravityProject\firmware\etching_controller`
- 知识资产：`D:\AntigravityProject\knowledge`
- 结构化数据库：`D:\AntigravityProject\data`
