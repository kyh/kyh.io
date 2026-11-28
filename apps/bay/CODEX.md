# Painting the map: a brief for a coding agent with image generation

You're repainting the tiles of an isometric map of San Francisco, one image edit per tile, in the
style the brief describes. The pipeline does everything else: what to paint, in what order, and
how the paintings are stitched together. Your job is to run one command, paint the images it
asks for, and repeat.

Work from the repository root. Change nothing under `apps/bay/` except the `output.png` files
you're asked for.

## Once, before you start

```sh
pnpm install
pnpm -F @repo/bay render --area ferry     # draws the tiles to paint from (no keys; ~5 s a tile)
```

Use the area you were told to paint (`ferry`, `downtown`, `sf`, or `--tiles=i,j:i,j`) everywhere
this brief says `ferry`, and the same one on every run.

## The loop

1. Run `pnpm -F @repo/bay jobs --area ferry`.
   - It folds in every `output.png` you've saved, then lays out the next wave of jobs, one folder
     each under `apps/bay/data/jobs/`. `apps/bay/data/jobs/JOBS.md` lists them.
   - If it says **all tiles painted**, go to "When it's done".
2. For each folder listed in `JOBS.md`, read its `job.md` and do what it says:
   - Edit `input.png` with your image tool, following the brief in `job.md`.
   - If there's a `mask.png`: white is already painted and must stay as it is; black is yours to
     paint. Carry the white part's look across seamlessly.
   - If `apps/bay/data/jobs/reference.png` exists, give it to the tool as a style reference.
   - Save the result as `output.png` in the same folder: a 1024×1024 PNG with the same framing as
     `input.png`.
   - The jobs in one wave never touch each other, so you can paint them in any order or at once.
3. Look at each `output.png` before going on, and paint it again if any of these is wrong:
   - buildings, streets, piers or the shoreline have moved, appeared or gone;
   - the white part of the mask has changed;
   - there's text, a border or a watermark;
   - it isn't 1024×1024.
     Once the next run folds a painting in, it's in the map.
4. Go back to 1.

The first job has no mask. It sets the style every later tile carries on, so take the most care
with it.

## When it's done

```sh
pnpm -F @repo/bay pyramid --from=paint    # cuts the painted map for the viewer
pnpm dev:bay                              # → http://localhost:3017
```

## If something goes wrong

- **A painting came out wrong after it was folded in.** Redo that tile from its render: run
  `pnpm -F @repo/bay jobs --tiles=i,j:i,j --force` once (`i,j` is the folder's name, for example
  `--tiles=1,0:1,0`). Paint the new job, then go back to the plain loop, without `--force`.
- **The brief changed, or waiting jobs went stale.** `pnpm -F @repo/bay jobs --area ferry --discard`
  drops the waiting jobs and lays them out afresh.
- **A job is refused** ("not rendered yet"). Run `render` for the area, then `jobs` again.
- `jobs` won't lay out a new wave while any job is still waiting. Finish the wave first.
