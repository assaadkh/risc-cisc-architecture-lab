# RISC ↔ CISC Architecture Lab

An interactive, database-free learning simulator that compares simplified RISC and CISC execution side by side.

## Features

- Synchronized instruction stepping and automatic execution
- RISC pipeline and CISC micro-operation visualization
- Single-instruction CPU deep dive with binary decoding and animated datapaths
- Worked RISC examples for `ADD`, `LW`, `SW`, and `BEQ`
- Worked CISC examples for `MOV`, memory-operand `ADD`, `REP MOVSD`, and `PUSH`
- Phase-by-phase buses, control signals, calculations, and before/after state
- Animated side-by-side RISC and CISC execution flowcharts with decision branches
- Rotatable, exploded 3D RISC (`EDU-R32`) and CISC (`EDU-C86`) processor cutaways with IHS lid, silicon die, substrate, copper vias, pin grid array, and drag-to-orbit pitch/yaw controls
- Full-screen 60fps 3D Architecture Journey (`#journeyCanvas`) starting at a hardware test bench with the engineer's 3D hands pressing `EXECUTE` on the controller and holding a logic probe, going inside the controller IC, and physically transporting the visitor (`YOU`) right beside the copper PCB traces, gold contacts, vertical copper vias, and on-die silicon interconnects alongside the moving data packets
- Connected clickable route map, spatial 3D callout pins, checkpoint narration, auto-tour, restart, keyboard controls (`ArrowLeft`, `ArrowRight`, `Space`, `Escape`), and optional synthesized sound
- Live registers, memory, hazards, CPI, cycle count, and code-size metrics
- Four equivalent workload presets (including memory-operand addition)
- Optional L1-cache latency model
- Guided architecture explanations and a knowledge quiz
- Responsive light and dark interfaces

## Run locally

No build step, package manager, server framework, or database is required.

```bash
python -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Deployment

GitHub Pages deploys the static contents of `dist/` automatically whenever `main` is updated.

## Model scope

This is a transparent educational model, not a cycle-accurate replica of a specific ARM, RISC-V, Intel, or AMD processor. Its timing values are illustrative and designed to expose architectural trade-offs.

