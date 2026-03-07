# Run Entry Standardization Design

**目标：** 为应用层和固件层补齐统一、稳定、可复用的运行/查看入口，降低目录重构后的使用成本，并明确不修改 STM32 源码的边界。

## 设计结论

统一入口只提供 `PowerShell (.ps1)` 脚本，不额外维护 `.bat/.cmd`。

原因：

- 当前项目运行逻辑已经依赖 PowerShell、`conda`、`npm`、`Start-Process`
- 路径和参数处理在 PowerShell 中更稳定
- 后续扩展“同时启动前后端”“只读查看固件结构”“开发自检”时，PowerShell 的可维护性明显更好

## 范围

本次只新增外围入口脚本和说明文档：

- `scripts/dev/run-agent.ps1`
- `scripts/dev/run-frontend.ps1`
- `scripts/dev/run-all.ps1`
- `scripts/firmware/show-firmware-layout.ps1`
- 一份运行说明文档

## 明确不做

- 不修改 `firmware/etching_controller` 下任何 STM32 源码
- 不改 `.ioc`、链接脚本、`Core/`、`Drivers/`、`MDK-ARM/`
- 不做固件烧录脚本
- 不引入新的 Python/Node 依赖

## 脚本行为

### 应用层

- `run-agent.ps1`
  - 工作目录固定到 `apps/glass_nanopore_agent`
  - 默认启动后端 `backend/main.py`
  - 优先支持 `conda run -n lab_agent python ...`
  - 若用户显式要求，可切换为当前窗口运行

- `run-frontend.ps1`
  - 工作目录固定到 `apps/glass_nanopore_agent/frontend`
  - 默认执行 `npm run dev`
  - 支持指定 `host` 和 `port`

- `run-all.ps1`
  - 顺序启动后端和前端
  - 作为统一开发入口

### 固件层

- `show-firmware-layout.ps1`
  - 只读输出固件目录关键结构
  - 显示 `.ioc`、`Core/`、`Drivers/`、`MDK-ARM/`、`CMakeLists.txt`
  - 明确标记“STM32 源码默认不修改”

## 验证标准

- 脚本文件存在且路径稳定
- PowerShell 可解析脚本
- 运行说明文档与当前目录结构一致
- 不触碰 `firmware/etching_controller` 内部源码文件
