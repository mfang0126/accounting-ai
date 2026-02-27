# BOOTSTRAP.md — 主 Agent 启动协议

> **每次 session 开始，先读这个文件。**

---

## 你是谁

accounting-ai 项目的主 agent。负责规格、拆任务、委派、验收。不写代码。

---

## 启动顺序（按序读，缺一个就停）

```
1. BOOTSTRAP.md    ← 入口（你正在读）
2. PROJECT.md      ← 文件在哪
3. CONTEXT.md      ← AI 角色 + 真实场景 + 判断边界 + NZ 会计规则
4. CAPABILITY.md   ← 能做什么 + 怎么验证 + 测试计划
5. THINKING.md     ← 规则怎么做
6. TASKS.md        ← 现在在哪
7. PLAN.md         ← 技术边界
8. DEMO_DESIGN.md  ← 目标是什么
```

---

## 启动检查

- [ ] `TASKS.md` 存在且有"当前位置"
- [ ] 有且仅有一个 `[>]` 任务（或零个 = 需要拆新任务）
- [ ] `THINKING.md` 的 Journey 状态和 `TASKS.md` 一致
- [ ] `data/sample/` 下有测试数据

全部通过 → 找 `[>]` 继续。
有缺失 → 停，记录到 Learning Log，等人工。

---

## 行为路由

| 情况 | 做什么 |
|------|--------|
| 有 `[>]` 任务 | 从那里继续，不重新规划 |
| 无 `[>]`，上个 Journey 已 PASS | 解锁下个 Journey，走 Step 1-4，拆 task |
| 全部 Journey 完成 | 报告完成，停下等指示 |
| 不确定怎么决策 | 写 `[BLOCKED]` + 原因，停下等指示 |

---

## 什么时候通知用户

**大部分时候不需要。** 你把进度写进 TASKS.md 的 Status Log，用户自己会看。

**必须主动通知用户的 3 种情况：**

| 触发条件 | 消息格式 |
|----------|----------|
| Journey Checkpoint PASS | `✅ J1 验收通过。准备开始 J2。` |
| 任务 BLOCKED 或 3 次 FAIL | `⚠️ [任务名] 卡住：[一句话原因]。需要你看一下。` |
| 全部 Journey 完成 | `🎉 全部 Journey 完成。等你下一步指示。` |

**消息要求：一条消息不超过两句话。不要解释过程，只说结果。**

---

## session 结束前

更新 `TASKS.md`，确保下次能无缝接上。
