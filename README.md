# Just Below the Surface

2026-08-13

For js13k 2026, theme "UNICORNS AND RAINBOWS".

## Design

- Randomly-generated treasure hunt.
- Setting is tiny tropical islands.
- Locate treasures by summoning a rainbow segment.
- Treasures are unicorn bones. You're an archaeologist, assembling the unicorn's skeleton.
- Top-down view.
- Multiple items:
- - Wand. Summon rainbow.
- - Shovel. Dig.
- - Keys. Drive boat. Not equippable.
- - Metal detector. Bonus: Identifies metal things eg gold.
- - Magnifying glass. ''
- - Divining Rod. ''
- - Geiger Counter. ''
- - Compass. ''
- - Map. Automatically reveals areas you've visited, the rest are murky. And marks treasures you've dug up.
- - Machete. Cut thru foliage.
- - Bomb. Open caves.
- At its most basic, we only need Wand and Shovel.
- Helpers that can incrementally mark undiscovered treasures on the map. Maybe only indicating which island?
- How about fishing off the boat? Find bones out in the open water too.
- Deluxe CD-ROM Edition! Just as a gag.
- - Must be larger than 1.44 MB (otherwise it would be the Deluxe Floppy Disk Edition).
- - Ideally larger than 13 MB. But no more than 700 MB, as if that were possible.
- - Build and measure exactly the same way as the js13k edition, no cheating.
- - Spurious data not allowed. Everything we include has to be used and has to be reasonable. Again, no cheating.

## Tech

- Straight JS. No Egg, Wasm, Shovel, just write from scratch in JS.
- Copy Egg's minifier? Or whatever. Start with serving directly only, and ensure it always works that way.
- Sound effects: Assume we'll have a set of enumerated sound effects. Something that translates neatly into WebAudio.
- Music: Start from MIDI and assume we'll pack that into something tighter. No pitch bend. Maybe no FM?
- Control:
- - Dpad to walk. In boat, it moves the same as walking.
- - Action, Inventory, and Pause buttons.
- - Hold Inventory button and you can L/R to change the equipped item. Full inventory visible at all times.
- World map is generated as a huge grid.
- - [x] Should we make one map per island, and not record anything for the vast waters between?
- - - NO. Don't need the extra complication, and memory is cheap.
- - I want caves too. So there's outer world and multiple inner maps.
- [ ] Framebuffer size? Sprite size?
- No persistence. Keep it short enough to play in one sitting. And being randomly generated, scores won't be comparable so don't bother.
- [ ] Configurable complexity?
- [ ] Continuous or discrete motion? Continuous always feels nicer, but it makes grid-quantized digging a little awkward.

## Agenda

- [ ] 1. Write the whole game the way I want it, and don't worry about size. Aim to complete by 30 Aug.
- [ ] 2. Write the build pipeline: minification, compression, and automated optimization.
- [ ] 3. Optimize manually and eliminate features until it fits. That's our js13k release. Aim to complete by 5 Sept.
- [ ] 4. Restore all those features and bulk out further, for the Deluxe CD-ROM edition.

## TODO

- [ ] Phase One.
- - [x] Initial scaffolding. Serve and build.
- - [x] Map generator.
- - [ ] Hero sprite.
- - [ ] Boat.
- - [ ] Inventory.
- - [ ] Treasure detectors.
- - [ ] Digging.
- - [ ] Progress and completion.
- - [ ] Sound effects.
- - [ ] Music.
- - [ ] Machete.
- - [ ] Bomb.
- - [ ] Caves.
- - [ ] Hello and Gameover.
- - [ ] Gamepad.
- [ ] Phase Two.
- - [ ] Minify.
- - [ ] Zip and report size during build.
- - [ ] Optimize PNG.
- [ ] Phase Three.
- - [ ] Record the pre-squeeze commit, so we can return there for the Deluxe CD-ROM Edition.
- - [ ] Squeeze.
- [ ] Phase Four.
- - [ ] Deluxe CD-ROM Edition.
