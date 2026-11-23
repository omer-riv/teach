# AI Infrastructure Resources

## Knowledge

- [Book: _How to Scale Your Model_ (Google DeepMind / JAX team)](https://jax-ml.github.io/scaling-book)
  Free systems-level book on how LLMs use memory, compute and bandwidth. TPU-flavoured, but the reasoning carries to GPUs. Use for: memory sizing, KV cache maths, prefill vs decode, rooflines, sharding. Chapters 7 ([inference](https://jax-ml.github.io/scaling-book/inference)) and 8 ([serving LLaMA 3-70B](https://jax-ml.github.io/scaling-book/applied-inference)) are the core of the serving track.
- [Reference: Modal _GPU Glossary_](https://modal.com/gpu-glossary/readme)
  Hyperlinked glossary of GPU hardware, software and performance terms, written by an AI infra company. Use for: any GPU term (SM, HBM, CUDA, tensor core, memory-bound).
- [Paper: "Efficient Memory Management for Large Language Model Serving with PagedAttention" (Kwon et al., SOSP 2023)](https://arxiv.org/abs/2309.06180)
  The vLLM paper. Applies OS paging to the KV cache; 2–4× throughput. Use for: KV cache, continuous batching, why serving engines exist.
- [Guide: _The Ultra-Scale Playbook_ (Hugging Face)](https://huggingface.co/spaces/nanotron/ultrascale-playbook)
  Training LLMs on GPU clusters, from one GPU to thousands, backed by thousands of experiments. Use for: data/tensor/pipeline/context parallelism, ZeRO, activation recomputation.
- [Blog: "Announcing Llama 3.1 Support in vLLM"](https://vllm.ai/blog/llama31)
  Real-world sizing: 405B in FP8 on one 8×H100 node with tensor parallelism. Use for: worked deployment examples.
- [Spec: NVIDIA H200](https://www.nvidia.com/en-us/data-center/h200/)
  141 GB HBM3e, 4.8 TB/s. Use for: GPU memory and bandwidth figures.

## Wisdom (Communities)

- [GPU MODE (Discord + lectures)](https://github.com/gpu-mode/lectures)
  Large, active community around GPU programming and LLM systems, with weekly recorded lectures. Use for: asking practitioners, seeing what infra engineers actually work on. Join: discord.gg/gpumode.

## Gaps
- An authoritative, current map of the AI infra startup landscape (who does serving, GPU cloud, tooling)
- A strong beginner source for the LLM app tooling layer (evals, observability)
- An official NVIDIA source for B200 memory (sources disagree: 180 vs 192 GB)
