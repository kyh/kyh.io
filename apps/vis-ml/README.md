# Visual ML

> A visual introduction to machine learning topics.

Scroll-driven interactive lessons. The original linear regression story remains the first lesson.

- Prediction and linear regression
- Gradient descent
- Classification boundaries
- Decision trees
- Generalization, bias, and variance
- Ensembles and real-world evaluation

## Stack

- React
- TypeScript
- Responsive SVG
- Vite

## Development

```bash
pnpm install
pnpm dev:vis-ml
```

## Structure

- `src/curriculum.ts` — course sequence and availability
- `src/components/scrolly-story.tsx` — reusable story controller
- `src/lessons/<slug>` — lesson-local copy, model, scenes, and visualization
