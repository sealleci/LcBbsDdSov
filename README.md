# Puzzle Solver for Dungeons&Diagram from Last Call BBS

## Introduction

Dungeons&Diagram is the game about discrete tomography. This program can solve the puzzle in a relatively short time, but since solving this type of puzzles is NP problem, it will costs a lot of time to find a solution in some cases.

## Execution

Use command `npm run exec -- ${file_name}` to execute the program in the root directory, `${file_name}` should be replaced with a file name (such as `text.txt`) which is located in the `/input` directory.

## Input file

Each input file represent a level, which should be located in the `/input` directory and contain 10 non-empty lines.

- Each line contains 8 numbers.
- The first line is the projections of rows, which are the numbers arranged vertically in the game.
- The second line is the projections of columns, which are the numbers arranged horizontally in the game.
- The next 8 lines represent the map for this level.
  - `0` is for empty space.
  - `1` is for treasure.
  - `2` is for monster.
  - `3` is for wall.

## Author

- Sealleci

## Technologies supported

- Node.js
- TypeScript
