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
- [x] 2. Write the build pipeline: minification, compression, and automated optimization.
- [ ] 3. Optimize manually and eliminate features until it fits. That's our js13k release. Aim to complete by 5 Sept.
- [ ] 4. Restore all those features and bulk out further, for the Deluxe CD-ROM edition.

2026-08-14: Second day, and I'm almost done Phase One. But I want a firmer build pipeline before implementing audio, since there will necessarily be some conversion involved.
  So, will finish Phase Two before Phase One.

## TODO

- [x] Minified build is not taking keyboard input.
- - Due to bug in egg's minifier. Workaround: Don't mask variable names with a lambda parameter. Use unique names always.
- [ ] Need to ensure that there's treasure on whichever island you start on, otherwise user will be confused.
- - Make it the Compass. Hard to find the next island without one.
- [ ] Suspend on focus loss.

- [ ] Phase One. Don't stop until we're *over* 13 kB.
- - [ ] Map.
- - [x] Sound effects.
- - [x] Music. Voice mp3 in Logic as I usually do, but do it good: That will go in the CD-ROM Edition. Probly the single biggest driver of bulk.
- - [ ] Machete.
- - [ ] Bomb.
- - [ ] Caves.
- - [ ] Track time and report at gameover.
- - [ ] Also track treasures vs total digs, give an Accuracy score.
- - [ ] Show the skeleton at gameover.
- - [ ] Wand: Make the rejection look different from dig rejection. Thinking a frown face with a rainbow for the mouth?
- - [ ] Wand: When within 2m or so, a toast that just says like "near!"
- - [ ] Don't stop immediately on digging the last treasure. Let its toast and sound play a bit, and fade out.
- [x] Phase Two.
- - [x] Optimize PNG. -- Currently dummy. Ready to play with, once we start The Squeeze.
- - [x] Reencode MIDI.
- - [x] Conditionalize js. Can we pass it thru cpp first? I want at the text level to go like `if js13k ...text... else if cdrom ...text... end`, and have that handled before minification.
- - - Going to treat cdrom edition as a completely independent fork. We'll copy js13k edition once it's stable, then modify from there.
- [ ] Phase Three.
- - [x] Record the pre-squeeze commit, so we can return there for the Deluxe CD-ROM Edition. ...not necessary
- - [ ] Squeeze.
- - - [ ] I bet we can reduce the JS size considerably by preferring globals over class members.
- - - [ ] For that matter, don't use classes.
- - [ ] js13k submission.
- [ ] Phase Four.
- - [ ] Deluxe CD-ROM Edition.
- - [ ] Rich tiles. Neighbor joining etc.
- - [ ] mp3 music instead of synth.

## BinarySong ".bs", Song Format For js13k Edition

It's sourced from MIDI and shouldn't look too different from MIDI.
But I want a single track, pretty sure we won't need velocity, and we can encode note durations in their On event.
No header. Tempo, instruments, channel levels, and all else are hard-coded in the synth.
Well actually, tempo is irrelevant. We'll record time in milliseconds, like EAU.
Our song has a range of 58 notes, so we can use a 6-bit noteid instead of 7.

The file is a straight stream of events, no header, first byte of the event tells you all about it:
```
  0ttttttt            Fine Delay. (t+1) ms
  10tttttt            Coarse Delay. ((t+1)*128) ms
  11nnnnnn ccdddddd   Note. (n+0x27) noteid, (c) chid, (d*16) ms. Longest hold is 1008 ms.
```
