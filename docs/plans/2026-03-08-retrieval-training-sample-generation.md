# Retrieval Training Sample Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 从现有 `71` 条知识源生成第一批可扩展检索训练样本，输出到 `D:\LabOSData\knowledge_raw\retrieval_training`。

**Architecture:** 读取 `master_index_cn.csv`，按标签和主题为每条资料构造若干中文查询，给每个查询分配一个正样本和多个负样本，输出统一 JSONL。负样本优先从不同标签和相近标签中抽取，保留难负样本能力。

**Tech Stack:** Python、CSV、JSONL、unittest

---

### Task 1: 定义样本生成规则

**Files:**
- Create: `D:\AntigravityProject\tools\retrieval_training_samples.py`
- Test: `D:\AntigravityProject\tests\test_retrieval_training_samples.py`

**Step 1: 写失败测试**
- 覆盖查询模板、负样本生成、JSONL 输出数量。

**Step 2: 运行测试确认失败**
- Run: `python -m unittest D:\AntigravityProject\tests\test_retrieval_training_samples.py`

**Step 3: 写最小实现**
- 读取 `master_index_cn.csv`
- 为每条记录生成查询
- 生成 `query / positive / negatives[] / tags / difficulty / split`

**Step 4: 运行测试确认通过**
- Run: `python -m unittest D:\AntigravityProject\tests\test_retrieval_training_samples.py`

### Task 2: 生成第一批样本

**Files:**
- Output: `D:\LabOSData\knowledge_raw\retrieval_training\train_candidates.jsonl`
- Output: `D:\LabOSData\knowledge_raw\retrieval_training\train_candidates_summary.md`

**Step 1: 运行生成脚本**
- 从 `master_index_cn.csv` 生成约 `120` 条样本

**Step 2: 校验输出**
- 检查条数、标签分布、样本结构

**Step 3: 写汇总说明**
- 记录样本数、标签占比、后续拆分建议
