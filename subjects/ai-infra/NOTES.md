# Notes

## About the learner
- Strong software engineer (code, systems, cloud); little ML. Don't re-teach general CS.
- Wants systems-level intuition, not math derivations.
- Interested in all three infra segments: inference/serving, GPU cloud/training, LLM app tooling.
- Studies on a phone in 5–10 minute bites. Keep every lesson to one skill + a short drill.

## Plan (tentative order)
1. Will it fit? Weight memory = params × bytes/param  ← lesson 0001
2. KV cache: memory per token, why context length and concurrency cost memory
3. Prefill vs decode: compute-bound vs memory-bandwidth-bound; tokens/sec ceiling from bandwidth
4. Batching and continuous batching; what vLLM/PagedAttention fixes
5. Map of the AI infra landscape (needs a good source; see RESOURCES gaps)
6. Multi-GPU: tensor parallelism for serving, then the training parallelisms
7. Quantization trade-offs
Interleave sizing questions from earlier lessons into later drills (spacing).

## Session log
- 2026-11-23: Mission interview done. Lesson 0001 published. Ask how it went next session.
- 2026-11-24: Asked why a GPU has its own memory (expected one shared memory). Explained host/device, HBM, PCIe. See LR 0002. Open lesson 2 with a quick retrieval check on this.
