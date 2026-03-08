# 刻蚀过程电信号与刻蚀结果关系文献整理

## 1. 结论

针对“刻蚀过程中的电信号是否和最终刻蚀结果有关”这个问题，现有公开文献给出的答案是：

- 有明确关系
- 关系已经被用于终点判断、形貌控制和孔形成监测
- 与本项目最接近的直接证据主要来自金属针尖/探针电化学刻蚀
- 与玻璃纳米孔更接近的证据主要来自纳米孔形成过程中的离子电流监测，以及纳米移液管/玻璃纳米孔的电化学表征文献

对本项目的直接启发是：

- ADC/电流值可以不仅用于“是否接触”的二值判断
- 还可以继续扩展为“接触质量、刻蚀阶段、异常状态、终点控制”的连续信号

## 2. 文献分级

### 2.1 直接相关

这类文献直接讨论“电化学刻蚀过程中的电信号控制”与“最终尖端/形貌结果”的关系。

1. Two-step controllable electrochemical etching of tungsten scanning probe microscopy tips
- 主题：两步电化学刻蚀钨探针尖端
- 相关性：高
- 关键信息：
  - 使用 drop-off 电流截止逻辑控制刻蚀结束时机
  - 截止响应速度会影响尖端曲率半径和长径比
  - 说明刻蚀过程中的电信号终点判据与最终形貌直接相关
- 链接：
  - https://pubmed.ncbi.nlm.nih.gov/22755635/
  - https://www.osti.gov/biblio/22093632-two-step-controllable-electrochemical-etching-tungsten-scanning-probe-microscopy-tips

2. Reproducible Electrochemical Etching of Tungsten Probe Tips
- 主题：可重复的钨探针电化学刻蚀
- 相关性：高
- 关键信息：
  - 讨论探针分离瞬间的电学控制
  - 终止方式会影响后续钝化和尖端质量
  - 适合作为“电信号终点控制影响最终结果”的经典依据
- 链接：
  - https://pubs.acs.org/doi/10.1021/nl010094q

3. Fabrication of Sharp Gold Tips by Three-Electrode Electrochemical Etching with High Controllability and Reproducibility
- 主题：三电极体系高可控高重复性的金尖端刻蚀
- 相关性：高
- 关键信息：
  - 强调施加电位和电化学条件对尖端形貌的影响
  - 适合补充“电信号参数影响最终尖端结果”的工程证据
- 链接：
  - https://pubs.acs.org/doi/10.1021/acs.jpcc.8b04078

### 2.2 间接相关

这类文献不是玻璃纳米孔电刻蚀本体，但已经证明“孔形成/孔增长/结构形成”可以通过实时电信号监测。

1. Optically-Monitored Nanopore Fabrication Using a Focused Laser Beam
- 主题：聚焦激光纳米孔制备中的实时电流监测
- 相关性：中高
- 关键信息：
  - 通过离子电流变化识别纳米孔形成
  - 电流上升和孔形成、孔继续长大有关
  - 虽然不是电化学刻蚀，但方法论上非常接近“用电信号反推结构结果”
- 链接：
  - https://www.nature.com/articles/s41598-018-28136-z
  - https://pubmed.ncbi.nlm.nih.gov/29950607/

2. Influence of etching current density on the morphology of macroporous silicon arrays by photo-electrochemical etching
- 主题：电流密度对多孔硅形貌的影响
- 相关性：中
- 关键信息：
  - 刻蚀电流密度与最终孔形貌直接相关
  - 适合作为“电信号强度影响结构结果”的旁证
- 链接：
  - https://www.jos.ac.cn/article/doi/10.1088/1674-4926/31/7/074011

### 2.3 综述背景

这类文献更适合支撑机理理解、知识库背景知识和后续信号解释。

1. Electrochemistry in conductive nanopipettes
- 主题：导电纳米移液管中的电化学
- 相关性：高
- 关键信息：
  - 系统讨论纳米移液管几何、表面性质和电化学响应的关系
  - 适合用来解释“为什么几何变化会带来电信号变化”
  - 对玻璃纳米孔/纳米移液管体系很有参考价值
- 链接：
  - https://pubs.rsc.org/en/content/articlehtml/2025/cp/d5cp02868j
  - https://pubmed.ncbi.nlm.nih.gov/41031933/

2. Glass Capillary-Based Nanopores for Single Molecule/Single Cell Detection
- 主题：玻璃毛细管纳米孔综述
- 相关性：高
- 关键信息：
  - 综述玻璃毛细管纳米孔的结构、电流响应和应用
  - 适合作为玻璃纳米孔结果信号映射的背景文献
- 链接：
  - https://pubs.acs.org/doi/10.1021/acssensors.2c02102

## 3. 对当前项目的对应关系

结合当前固件逻辑，可以把项目里的 ADC/电信号理解成三个层次。

### 3.1 当前已在做的层次

当前固件里，ADC2 的值已经参与状态判断，不只是显示。

对应代码位置：

```text
D:\AntigravityProject\firmware\etching_controller\Core\Src\adc.c
D:\AntigravityProject\firmware\etching_controller\Callback\ADC\AdcCallback.c
D:\AntigravityProject\firmware\etching_controller\Core\Src\main.c
```

当前逻辑：

- ADC2 为 12 位，范围 `0 ~ 4095`
- 模拟看门狗高阈值为 `4095`
- 低阈值为 `4080`
- 回调中若 `HAL_ADC_GetValue(&hadc2) < 4000`，则认为 `isPowered = 1`

这说明现在的电信号已经在承担：

- 接触判据
- 导通判据
- 阶段状态切换判据

### 3.2 值得继续研究的层次

如果后续把 ADC/电流值从“单个阈值判断”扩展为“时间序列信号”，就可以研究：

- 接触瞬间的下降幅度
- 接触瞬间的下降速度
- 刻蚀前基线
- 刻蚀后基线
- 气泡附着引起的抖动
- 突然断裂引起的跳变
- 不同参数下信号波形与最终锥角/孔径/成功率的关系

### 3.3 最有价值的研究问题

建议优先关注这几个问题：

1. 接触建立时的 ADC 阈值和实验成功率是否相关
2. 刻蚀前后的 ADC 漂移是否和最终锥角、孔径有关
3. 异常波动是否能提前预警气泡、蒸发、机械扰动
4. 是否可以基于电信号做自动终点控制

## 4. 建议纳入知识库的标签

这批文献建议同时挂到以下标签下：

- 核心工艺
- 机理约束
- 异常复盘
- 硬件协议

其中最关键的知识项包括：

- 电信号终点控制
- 电流/电压变化与最终形貌
- 离子电流与孔形成
- 几何变化与电化学响应

## 5. 下一步建议

建议按下面顺序推进：

1. 把上述文献加入知识库核心候选集
2. 为 ADC/电流信号建立实验日志模板
3. 每次实验保存：
   - 参数
   - ADC 序列
   - 刻蚀时间
   - 最终图片
   - 成败标签
4. 做第一轮相关性分析：
   - 阈值
   - 峰值
   - 基线
   - 斜率
   - 波动度
5. 再决定是否把 ADC 信号正式纳入智能体决策特征

## 6. 简短结论

这个方向不是猜想，而是已有文献基础支持的方向。

对本项目来说，最合理的判断是：

- 电信号和刻蚀结果大概率有关
- 当前代码已经在用它做状态判断
- 真正有科研和工程价值的下一步，是把它从“阈值变量”升级为“可记录、可分析、可回放的时序特征”
