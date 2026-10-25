# GridBricks editorial UI specification

## Product goal

Make the day-ahead wind forecast and its historical accuracy easy to read for energy traders. The data, charts, dates, and units are the product; the interface should support them quietly.

## Visual direction

- Use a light-first editorial style: off-white page (`#FAFAF8`), white surface, near-black text (`#111111`), secondary text (`#5C5C57`), and subtle borders (`#E5E4DF`).
- Use one accent only: deep teal (`#0F766E`). In dark mode, use a restrained lighter teal and neutral near-black surfaces.
- Self-host IBM Plex Sans Variable. Use four type sizes only: 12, 14, 20, and 32px. Use tabular numerals for data and monospace only for timestamps.
- Define colors, the shared 6px radius, spacing values (4, 8, 16, 24, 32, 48, 64px), typography, and chart colors as CSS variables and expose them through the Tailwind theme.
- Use a 1px border or divider instead of a shadow. Do not add gradients, glow, blur, glass effects, decorative art, or animation. Color and opacity transitions may last 150ms; reduced-motion preferences must be respected.
- Keep all text left-aligned. Use the shared radius consistently. Keep the mobile layout free of horizontal page overflow; wide tables scroll inside their own container.

## Layout and content

- Keep the three views: Decision, Accuracy, and Method.
- Use a slim left navigation with text links, 16px Lucide icons, and an accent-colored 2px active rule. Collapse it to a compact top bar below 768px.
- Put each page title, one plain explanatory sentence, and its controls in one header row. Keep date and cutoff controls together in a bottom-ruled toolbar above the chart.
- Present decision KPIs as one ruled row of four statistics. Use a 12px uppercase label, 32px value, and 14px unit. Do not put each statistic in its own card.
- Let charts sit directly on the page surface. Forecast uses the accent, actual uses near-black, and the uncertainty band uses the accent at about 12% opacity. Use only light horizontal gridlines, 1.5px series lines, and neutral gray plus the accent for error plots.
- Put one concise insight under each chart. Derive it from the currently displayed API data and state units explicitly.
- Use plain sections, ruled rows, and definition lists. Do not nest cards or add filler copy, fake data, testimonials, avatars, or unnecessary banners.

## Interaction and accessibility

- Keep the existing routes, API calls, analytics, data, and cutoff/date behavior unchanged.
- The Decision chart tooltip is a small white, 1px bordered panel with 12px text. It reports delivery time, forecast, actual, forecast error, and uncertainty band in MW for the inspected hour. Support pointer and keyboard inspection.
- Keep controls labeled, focus rings visible at 2px in the accent, and error and empty states explicit. Skeletons use neutral fills without shimmer.
- Maintain WCAG AA text contrast. Charts must remain readable at 390px, and wide tables must scroll within their own region.
- Use icons only when they help with navigation, theme selection, information, or external links. Do not use emoji.

## Review requirements

- Capture Decision, Accuracy, and Method at 1440px and 390px in light and dark themes.
- Check that all charts and controls work and that no browser console errors or mobile page overflow occur.
- Review for a single accent, the four allowed font sizes, the spacing scale, one radius, no gradients or shadows, and no decorative elements without a user purpose.
