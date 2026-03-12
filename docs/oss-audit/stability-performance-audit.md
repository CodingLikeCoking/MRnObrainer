# Stability and Performance Audit

Date: 2026-03-10

Scope: long-running processes, async lifecycle, RAM/storage/CPU efficiency, and measurement gaps.

## Runtime-Sensitive Repo Map

- `apps/mrnobrainer-app/src-tauri/src`: desktop lifecycle, sidecar/server management, updates, analytics, tray, and permissions.
- `crates/screenpipe-server`: capture server, video pipeline, paired capture, persistence, and API routes.
- `crates/screenpipe-core/src/pipes`: automation runtime, scheduling, pipe logs, execution registry, and permission plumbing.
- `crates/screenpipe-core/src/agents/pi.rs`: agent subprocess lifecycle and output collection.
- `crates/screenpipe-audio`: audio capture helpers and FFmpeg subprocess wrappers.
- `crates/screenpipe-db`: SQLite persistence and existing benchmarks/tests.

## Confirmed Hotspots From Code Inspection

### P1

- Path: `crates/screenpipe-core/src/pipes/mod.rs:502-548`
- Issue: `PipeManager` keeps execution state in multiple `Arc<Mutex<HashMap<...>>>` structures and applies a global `Semaphore::new(1)` to all pipe execution.
- Why it matters: the automation runtime is effectively single-lane. This is simple, but it caps throughput, can amplify head-of-line blocking, and makes one slow pipe stall the rest of the system.
- Recommended action: keep the single-lane default for safety if needed, but instrument queue wait time and define a path to per-pipe or bounded parallelism.
- Before release: yes, at least measure and document.

- Path: `crates/screenpipe-core/src/agents/pi.rs:517-535`
- Issue: the non-streaming Pi execution path waits on `child.wait_with_output().await?` with no timeout.
- Why it matters: a stuck child process can hang a scheduled automation run and complicate shutdown/recovery.
- Recommended action: add an execution timeout, capture timeout metrics, and ensure orphaned subprocess trees are terminated consistently.
- Before release: yes.

- Path: `crates/screenpipe-audio/src/utils/ffmpeg.rs:61-87`
- Issue: FFmpeg helper code blocks on `wait_with_output().unwrap()`.
- Why it matters: an FFmpeg hang or spawn failure can panic or stall the caller instead of producing a controlled failure path.
- Recommended action: convert `unwrap()` to structured error handling and add a timeout/kill path around long-running subprocesses.
- Before release: yes.

### P2

- Path: `crates/screenpipe-server/src/paired_capture.rs:26-30`
- Issue: paired-capture OCR work is globally serialized by `Semaphore::new(1)`.
- Why it matters: this is a defensible guardrail against CPU spikes, but it can become a visible latency bottleneck on multi-monitor or bursty event-driven capture workloads.
- Recommended action: benchmark backlog behavior before changing concurrency. Track queue delay and capture-to-index latency first.
- Before release: measure first; implementation can follow.

- Path: `crates/screenpipe-core/src/pipes/mod.rs:598-612`
- Issue: the pipe runtime does have cleanup for old executions (keep newest 50 per pipe), but the rest of the storage-growth story is not clearly surfaced in operator-facing docs.
- Why it matters: strangers cloning the repo will ask how fast capture data grows, how to prune it, and what the steady-state footprint looks like.
- Recommended action: pair the existing cleanup with public retention guidance and disk-growth benchmarks.
- Before release: documentation yes, deeper optimization maybe later.

## Existing Strengths To Preserve

- `TESTING.md` already provides a strong manual regression checklist for lifecycle, capture, and deep-link behavior.
- `crates/screenpipe-db/benches` and multiple performance-oriented tests already exist, which gives the repo a foundation for repeatable resource measurements.
- The pipe runtime already includes startup recovery and execution pruning, which is better than shipping an unbounded scheduler without recovery hooks.

## Benchmark and Instrumentation Plan

### Must Add Before Release

- Pipe runtime soak test:
  - measure queue wait time, run duration, timeout rate, and stuck-child recovery.
- Capture latency benchmark:
  - record screenshot-to-frame-write latency and OCR queue delay under 1-monitor and 2-monitor load.
- Disk growth smoke benchmark:
  - measure daily storage growth for a representative 8-hour workload and publish retention guidance.
- Timeline load telemetry:
  - record time to first frame, frame batch size, and memory growth while scrolling large histories.

### Low-Risk Instrumentation

- Log pipe queue depth and semaphore wait duration in the scheduler.
- Emit capture backlog counters around paired capture and OCR.
- Add timeout/error counters for FFmpeg and Pi subprocesses.
- Keep the existing DB benchmarks, but add one release-ready benchmark that simulates a realistic user timeline instead of only synthetic micro-benchmarks.

## Low-Risk Optimization Candidates

- Keep a conservative default concurrency model, but make it observable before trying to parallelize pipes.
- Prefer streaming subprocess output paths over `wait_with_output()` where possible.
- Bound or rotate any in-memory/log collections that currently only rely on process lifetime.
- Document retention and cleanup behavior in the public docs so storage complaints do not become support surprises.

## Summary Table

| Severity | Path | Issue | Why it matters | Recommended action | Before release |
| --- | --- | --- | --- | --- | --- |
| P1 | `crates/screenpipe-core/src/pipes/mod.rs` | Global one-at-a-time pipe execution | Slow/stuck runs block the automation lane | Instrument queueing and define bounded concurrency plan | Yes |
| P1 | `crates/screenpipe-core/src/agents/pi.rs` | No timeout on Pi subprocess completion | Can hang pipe runs and shutdown | Add timeout and recovery metrics | Yes |
| P1 | `crates/screenpipe-audio/src/utils/ffmpeg.rs` | Blocking `wait_with_output().unwrap()` | Panic/stall risk in subprocess wrapper | Add timeout and structured error handling | Yes |
| P2 | `crates/screenpipe-server/src/paired_capture.rs` | Global OCR semaphore of 1 | Potential capture backlog on bursty workloads | Benchmark before changing concurrency | Measure before release |
| P2 | docs + runtime | Storage/retention story is under-documented | Public users need predictable disk behavior | Publish retention and footprint guidance | Yes |
