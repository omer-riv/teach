# Notes

## About the learner
- Strong software engineer (code, systems, cloud); little ML. Don't re-teach general CS. Memoization-style analogies land well.
- Hardware basics were shakier than assumed (LR 0002): don't assume GPU architecture knowledge.
- Light maths with small worked numbers is fine; no derivations.
- Studies on a phone in 5–10 minute bites. Occasional laptop sessions for Colab (flag these in advance).
- Wants to actually do training, not just understand it.

## Curriculum (mirrors index.html; update both together)
Part A: How a model learns
- A1 Function with knobs: loss, gradient descent, learning rate  ← lesson 0003
- A2 The training loop: forward, loss, backward (backprop), step; batches, epochs
- A3 How an LLM learns language: next-token prediction, tokens, training data
Part B: The ways to train
- B1 The life of a model: pretraining → post-training → fine-tuning; costs
- B2 Pretraining: data, compute budget, scaling laws (Chinchilla, ~20 tokens/param)
- B3 Fine-tuning: full vs LoRA/QLoRA; fine-tune vs prompt vs RAG
- B4 Post-training: SFT, RLHF, DPO, RL with verifiable rewards
Part C: What to take into account
- C1 Data: quality, dedup, contamination, chat templates
- C2 Hyperparameters and failure modes: overfitting, loss spikes, forgetting
- C3 Evals
Part D: Hands-on (laptop)
- D1 Train a tiny GPT in Colab (nanoGPT / Karpathy)
- D2 LoRA fine-tune a small open model (Unsloth notebooks)
Infra alongside
- I1 Weights memory ← lesson 0001 (done, 6/6)
- I2 KV cache (serving) ← lesson 0002
- I3 Training memory: gradients + optimizer state
- I4 Multi-GPU training: data/tensor/pipeline parallel, FSDP/ZeRO
- I5 Compute and cost of a run (FLOPs ≈ 6 × params × tokens; verify before teaching)
Interleave earlier material into warm-ups and the mixed drill.

## Session log
- 2026-11-23: Mission interview done. Lesson 0001 published.
- 2026-11-24: Asked why a GPU has its own memory (expected one shared memory). Explained host/device, HBM, PCIe. See LR 0002.
- 2026-11-24: Lesson 1 finished: quiz 6/6, drill easy and fast (LR 0003). Published lesson 0002 (KV cache). Outcome not yet reported.
- 2026-11-25: Mission shifted to training (LR 0004). Added curriculum home page (index.html) and lesson 0003. Ask how lessons 2 and 3 went.
