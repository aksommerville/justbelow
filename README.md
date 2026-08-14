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
- - If it tops 5 MB (4816896 exactly), it will be my largest game ever. I'd get a kick out of that.
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
- [x] Framebuffer size? Sprite size? ...240x135 and 16x16. Can freely adjust the framebuffer size in index.html.
- No persistence. Keep it short enough to play in one sitting. And being randomly generated, scores won't be comparable so don't bother.
- [x] Configurable complexity? ...hard no for js13k. Yes for CD-ROM Edition.
- [x] Continuous or discrete motion? Continuous always feels nicer, but it makes grid-quantized digging a little awkward. ...continuous
- [x] Does anything else in the world behave? Thinking, do we need a concept of sprite controllers, or can we just treat the hero as a one-off kind of thing?
- - Bomb and the unoccupied Boat are sprites.
- - Generalize.

## Agenda

- [ ] 1. Write the whole game the way I want it, and don't worry about size. Aim to complete by 30 Aug.
- [ ] 2. Write the build pipeline: minification, compression, and automated optimization.
- [ ] 3. Optimize manually and eliminate features until it fits. That's our js13k release. Aim to complete by 5 Sept.
- [ ] 4. Restore all those features and bulk out further, for the Deluxe CD-ROM edition.

2026-08-14: Second day, and I'm almost done Phase One. But I want a firmer build pipeline before implementing audio, since there will necessarily be some conversion involved.
  So, will finish Phase Two before Phase One.

## TODO

- [x] Minified build is not taking keyboard input.
- - Due to bug in egg's minifier. Workaround: Don't mask variable names with a lambda parameter. Use unique names always.
- [ ] Need to ensure that there's treasure on whichever island you start on, otherwise user will be confused.
- [x] Is it possible to unboat in such a way that you can't get back on? Test the edges.
- - YES. I'm not able to repro on demand but it did happen by accident. Calculate the exact edges and fuzz boat's radius beyond them.
- - Boat at 141.833,135.481. Diagonalish to land at 142,134.
- - [x] How did we even get off this boat? When checking for land, it should have checked 141,134 and 142,135, which are both water.
- - - I bet it's because we have two calls to `bump()`, one per axis. ...wrong. The first bump comes before the second motion. Both see valid positions.
- - - It's because we update Boat's position after the bump handling -- it doesn't get the final update.
- - [x] Confirm I can repro before changing anything. Attack the shore diagonally.
- - - Takes a few tries but yes seems pretty reliable.
- - Widen the boat's test radius anyway, to be on the safe side.
- [ ] Compass is too powerful; it makes the wand useless. And the wand is important, otherwise we got no rainbows. What if Compass only works on the boat? Or blacks out within some minimum distance?
- - Make it only work in the Boat.
- - Also, make a second set of non-selectable inventory. Compass should just always be on, once you get it.

- [ ] Phase One. Don't stop until we're *over* 13 kB.
- - [x] Initial scaffolding. Serve and build.
- - [x] Map generator.
- - [x] Hero sprite.
- - [x] Boat.
- - [x] Inventory.
- - [x] Treasure detectors. Just Wand and Compass, I think that's all we need for js13k.
- - [x] Compass.
- - [ ] Map.
- - [x] Digging.
- - [x] Progress and completion.
- - [ ] Sound effects.
- - [ ] Music. Voice mp3 in Logic as I usually do, but do it good: That will go in the CD-ROM Edition. Probly the single biggest driver of bulk.
- - [ ] Machete.
- - [ ] Bomb.
- - [ ] Caves.
- - [x] Hello and Gameover. Actually for js13k, we might skip Hello.
- - [x] Gamepad.
- - [ ] `generateMap.js`: Eliminate interior water. See notes.
- [ ] Phase Two.
- - [x] Minify.
- - [x] Zip and report size during build.
- - [ ] Optimize PNG.
- - [ ] Conditionalize js. Can we pass it thru cpp first? I want at the text level to go like `if js13k ...text... else if cdrom ...text... end`, and have that handled before minification.
- [ ] Phase Three.
- - [ ] Record the pre-squeeze commit, so we can return there for the Deluxe CD-ROM Edition.
- - [ ] Squeeze.
- - [ ] js13k submission.
- [ ] Phase Four.
- - [ ] Deluxe CD-ROM Edition.
- - [ ] Rich tiles. Neighbor joining etc.
- - [ ] mp3 music instead of synth.
