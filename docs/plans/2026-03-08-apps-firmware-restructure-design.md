# Apps And Firmware Restructure Design

**目标：** 将应用层和固件层纳入统一的顶层工程结构，使项目根目录只保留明确职责的主入口，并为后续知识库、工具链、测试和交付建立稳定路径。

## 设计结论

采用分批直迁：

1. 先将 `glass_nanopore_agent` 迁移到 `apps/glass_nanopore_agent`
2. 修正应用层相关路径、文档和启动入口
3. 完成验证后，再将固件主目录迁移到 `firmware/etching_controller`
4. 修正固件相关路径、文档和知识资产引用

## 目标目录结构

```text
D:\AntigravityProject
├─ apps
│  └─ glass_nanopore_agent
├─ firmware
│  └─ etching_controller
├─ knowledge
├─ data
├─ archive
├─ docs
├─ tools
├─ tests
└─ libraries
```

## 路径规则

- 应用主代码统一位于 `apps/glass_nanopore_agent`
- 固件主代码统一位于 `firmware/etching_controller`
- 代码、文档、测试中的绝对路径统一改为新位置
- 能由项目根推导的路径，优先改为相对根或相对文件位置推导，减少后续再次迁移成本
- `knowledge` 中的代码副本只作为知识资产，不作为运行主入口

## 风险与控制

- 风险最高的是启动命令、脚本工作目录和文档路径漂移
- 第一批先迁应用层，因为它的运行验证更直接，问题更容易暴露
- 第二批再迁固件层，避免一次性同时打断前后端与嵌入式路径

## 验证标准

应用层迁移完成后，至少满足：

- `apps/glass_nanopore_agent` 存在且根目录不再保留旧目录
- 后端入口可通过 `py_compile`
- 相关数据库/导入测试仍通过
- 文档中的主路径说明已切到 `apps/glass_nanopore_agent`

固件层迁移完成后，至少满足：

- `firmware/etching_controller` 存在且根目录不再保留旧目录
- 文档和知识资产中的固件路径说明已切到新位置
- 全局搜索不再命中旧的顶层运行路径
