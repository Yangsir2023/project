# Phase 2 Test Report: Full Regression & Stability Verification

## Test Case Log

| # | Feature | Result | Issues |
|---|---|---|---|
| 1 | Basic code generation | - | - |
| 2 | Incremental live update | - | - |
| 3 | Loading / error feedback | - | - |
| 4 | API timeout & retry | - | - |
| 5 | Secure sandbox blocking | - | - |
| 6 | Dual-pane fixed layout | - | - |
| 7 | Long-run stability | - | - |

## Test Details

1. **Basic code generation**: Generate a red button that shows a "Hello World" alert on click.
2. **Incremental live update**: Generate a styled login form, then modify the button colour.
3. **Loading / error feedback**: Submit an invalid or gibberish prompt.
4. **API timeout & retry**: Click generate while offline / network disconnected.
5. **Secure sandbox blocking**: Input malicious code that attempts to read local files.
6. **Dual-pane fixed layout**: Minimise the window and resize it to various dimensions.
7. **Stress & stability**: Rapidly click generate 10 times in succession; keep the app running for 30 minutes.

## Bug Fix Log

- **BUG 1**: Continuous generation caused WebView to freeze.
  - **Fix**: Optimised the generation flow to avoid frequent reloads and properly clean up stale resources.
- **BUG 2**: Dual-pane layout misaligned after window resize.
  - **Fix**: Enforced fixed CSS layout with `height: 100%` and `overflow: hidden` constraints.
