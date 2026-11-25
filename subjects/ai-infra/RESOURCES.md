# Training AI Models Resources

## Knowledge

### How models learn
- [Video: 3Blue1Brown, "Gradient descent, how neural networks learn" (Deep Learning ch. 2)](https://www.3blue1brown.com/lessons/gradient-descent)
  The clearest visual explanation of loss and gradient descent; the series continues into backpropagation. Phone-friendly. Use for: Part A.
- [Course: Google Machine Learning Crash Course, "Gradient descent"](https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent) and ["Hyperparameters"](https://developers.google.com/machine-learning/crash-course/linear-regression/hyperparameters)
  Short, authoritative pages with interactive exercises. Use for: learning rate, convergence, batch size.
- [Course: Andrej Karpathy, _Neural Networks: Zero to Hero_](https://karpathy.ai/zero-to-hero.html)
  Code-along videos from backprop (micrograd) to reproducing GPT-2. Needs a laptop. Use for: hands-on Part D, deep understanding of backprop.

### Ways to train
- [Paper: "Training Compute-Optimal Large Language Models" (Hoffmann et al., 2022, "Chinchilla")](https://arxiv.org/abs/2203.15556)
  Scale model size and training tokens together; 70B on 1.4T tokens beat 280B Gopher. Use for: pretraining budgets, scaling laws.
- [Book: Nathan Lambert, _Reinforcement Learning from Human Feedback_](https://rlhfbook.com/)
  Free online book on post-training (SFT, reward models, RLHF, DPO). Use for: Part B4.
- [Docs: Unsloth fine-tuning guide](https://docs.unsloth.ai/get-started/fine-tuning-guide) and [notebooks](https://unsloth.ai/docs/get-started/unsloth-notebooks)
  Free Colab notebooks for LoRA/QLoRA fine-tuning of open models. Use for: hands-on D2.

### Infrastructure

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
- A trusted, readable overview of the full "life of a model" (pretraining → post-training → fine-tuning) for lesson B1
- An authoritative, current map of the AI infra startup landscape (who does serving, GPU cloud, tooling)
- A strong beginner source for the LLM app tooling layer (evals, observability)
- An official NVIDIA source for B200 memory (sources disagree: 180 vs 192 GB)
