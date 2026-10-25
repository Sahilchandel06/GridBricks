# Design direction

## Product goal

Make it easy for a day-ahead buyer to see the forecast information available at decision time and judge its historical accuracy.

## Proposed visual direction

This section records design guidance from the supplied implementation prompt; the official PDF specifies the two user needs but does not prescribe visual styling.

- Dark-first analytical workspace with a restrained light theme.
- Use cyan for forecast series, amber for actual generation, and a translucent forecast-colored uncertainty band.
- Use one sans-serif family, tabular numerals for values, and monospace for timestamps.
- Keep navigation compact and devote most space to readable charts and their units.
- Use minimal chart gridlines, visible keyboard focus, reduced-motion support, and responsive layouts.
- Avoid decorative gradients, glass effects, oversized hero sections, and emoji icons.

## Interaction principles

- Make forecast publication time and measurement units visible near the data.
- Keep user controls close to the view they change.
- Provide clear loading, no-data, and error feedback.
- Explain analytic definitions and limits in the product.

## P4 screenshot review

- At 1440px, the navigation rail, status bar, delivery controls, KPI row, and source/period cards fit without overlap. The open workspace leaves room for chart content in the next phase.
- At 390px, navigation becomes a compact top row, date and cutoff controls remain side by side, KPI cards use two columns, and source/period cards stack vertically without horizontal overflow.
- The first capture clipped the forecast-version caption and showed a low-contrast decorative ring. The caption was shortened and the ring removed; the final captures are in `docs/screenshots/`.

## P5 screenshot review

- At 1440px, the KPI summary, 24-hour chart, publication details, and data coverage fit in the analytical workspace. Forecast, actual, and historical error range use the documented cyan, amber, and translucent cyan mapping.
- At 390px, controls stay side by side, KPIs form two columns, the chart and legend remain readable, and publication/coverage details stack with no horizontal overflow.
- Playwright changed both delivery date and D-1 cutoff and confirmed the chart heading and cutoff summary update from the API. Final captures are `docs/screenshots/p5-desktop.png` and `docs/screenshots/p5-mobile.png`.

## P6 screenshot review

- At 1440px, the headline metrics, error histogram, hourly MAE chart, grouped tables, and metric definitions fit the workspace with a clear top-to-bottom reading order.
- At 390px, the visualizations stack, metric cards use two columns, and breakdown tables show sample count, MAE, and P90 while hiding secondary columns. This keeps decision-relevant comparisons visible without sideways scrolling.
- Playwright changed the cutoff and confirmed the displayed summary follows the selected D-1 time. Both viewport captures have no horizontal page overflow and are in `docs/screenshots/`.
