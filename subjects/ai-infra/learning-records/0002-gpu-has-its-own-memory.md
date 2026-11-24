# Mental model gap: assumed one shared memory for CPU and GPU

The learner's model was "one processor, one memory": the CPU reads and writes RAM, and a GPU would too. They had not met the host/device split, where the GPU is a separate device with its own HBM, the CPU has its own RAM, and data crosses a comparatively slow PCIe link. Explained on 2026-11-24; understanding not yet demonstrated.

**Implications:** Before teaching decode speed (memory-bandwidth-bound) or multi-GPU work, check this model with a retrieval question: why weights are copied to the GPU once and kept there, and why bandwidth to HBM, not to CPU RAM, sets tokens per second. Hardware basics are not as solid as the general "strong SWE" record implies; don't assume GPU architecture knowledge.
