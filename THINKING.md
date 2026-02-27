# THINKING.md

## 基础概念

**这个文件 > 所有其他文件。**

逻辑链：底层逻辑对 → Journey 描述对 → 开发对 → Demo 有意义。

任何一环出错，根因一定在这个文件里——回来改这里，不要去改下游。

**这个文件必须不断 refine。** 做错了、卡住了、想通了——先更新这里，再继续干。文件保持简洁，每次只加真正想明白的东西。

**相信流程。** 每一步做对了，下一步一定是对的。不要跳步，不要怀疑，按顺序走。

**所有文档方向一致。** THINKING.md 是根，其他文档（PLAN.md、demo 脚本、任务列表）都是它的延伸。方向不一致 = 回这里对齐，不是去改其他文件。

> 文件结构见 `PROJECT.md`，流程图见 `diagrams/`。每次开始前先读这两个。

---

## Journey Loop（每圈 = Demo 一段）

```
1. 痛点 → 2. 场景 → 3. 价值验证 → 4. 规格(DoD+场景) → 5. 执行
                                                              ↓
                                                       6. Critic 验收
                                                        ↙         ↘
                                                   PASS           FAIL
                                                     ↓               ↓
                                             ✅ Checkpoint    Reflexion 反思
                                                     ↓          (最多3次)
                                             下一个 Journey    → 回 Step 5
```

**规则：一次只做一个 Journey。J1 没过 Checkpoint，不开始 J2。**

---

## ⛔ 强制禁止（违反 = 重来）

- **必须真实开发**：每行代码生产级别，不是 demo 壳
- **禁止 Hacky**：问题必须真正解决，不能绕
- **禁止跳步**：没想清楚规格（Step 4）不写代码，没验收（Step 6）不进下一步
- **验收标准**：curl/命令跑出真实输出，不接受"应该可以"

---

## 谁干什么

**核心原则：主 agent 只看摘要，不看原始数据。共享状态只通过 `TASKS.md` 传递。**

| 任务 | 谁干 | 权限 |
|------|------|------|
| 规格、拆任务、最终决策 | **主 agent（我）** | 只读结论 |
| 写代码 | **Claude Code** (`exec pty:true`) | 限定项目目录 |
| DoD 验收（Critic） | **Verifier agent** (`sessions_send`) | 只读代码+DoD |
| 研究、竞品 | **Kimi** (`sessions_spawn`) | 只读 |
| 写文章 | **Content agent** (`sessions_send`) | 只写文章文件 |

**委派最多 2 层**：主 agent → 执行 agent。执行 agent 不再往下派。

**共享状态**：所有 agent 只通过 `TASKS.md` 交接，不依赖彼此的 memory。

---

## 当前 Journeys

| Journey | 功能 | 状态 | Demo |
|---------|------|------|------|
| **J1** | AI 对账找异常 | ⚠️ Step 6 待验收 | 分钟 3-6 |
| J2 | 自然语言解释报告 | 🔒 等 J1 | 分钟 6-10 |
| J3 | 上传 UI + 结果展示 | 🔒 等 J2 | 分钟 10-13 |

**现在**：J1 Step 6 — 跑真实对账，AI 找到 Harbourside 5 个错误才算过。

---

## 拆任务给 Claude Code

每个 task 必须包含三样东西，缺一不给 Claude Code：

```
任务描述：做什么
Definition of Done：我怎么知道完成了？（一条 curl/命令，看到具体输出）
Acceptance Scenarios：哪些场景必须 work？
  - 正常场景：输入正确时应该输出什么
  - 边界场景：输入为空/格式错/金额为零时不能崩
  - 错误场景：文件不存在时应该报什么错
```

**测试不用写代码，用描述。** 模型的编码能力不是瓶颈——瓶颈是场景有没有想全。场景描述越具体，输出越可靠。

- 一次一个文件，< 50 行
- Claude Code 超时 → 任务太大，继续拆
- Sub-agent 完成 → 写 handoff notes 到 `TASKS.md`，发 EXIT_SIGNAL，不用解释细节
- **Critic Agent 验收**（不是主 agent 自己验收）：对照 DoD 逐条检查，输出 PASS/FAIL + 原因
- **FAIL → Reflexion**：Critic 的反馈存入记忆，Implementer 读反馈重试，最多 3 次，3 次还不过 → 人工介入
