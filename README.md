
# About

An "improved" web client.  This mostly means it includes some extra features that make it nicer for more serious use, including a clever system to filter page conversations and text from puppets into their own streams.

# Configuration

Edit `Config.js` to match your needs.

# Possible fixes/improvements

There are some things that would be nice to have that I never got around to doing.

- Stop the client from jumping back to the bottom on new input if the user's scrolled up more than a little bit.
- Turn off the filter for whispered messages, which tend to be context dependent and are more annoying than helpful to differentiate from their context a lot of the time.
- Make it so the text in the input line is unique to each filter/view.  This would probably prevent a lot of accidental sending to the wrong place.

# Credits

As well as the work of clever and knowledgeable people who made the websocket backend this UI connects to and the original client it's based on, the following libraries are used:

* [Mousetrap](https://craig.is/killing/mice) for keyboard bindings
* [ansi\_up](https://github.com/drudru/ansi_up) to process ANSI escape sequences into HTML

The 'chime' sound included to notify users of new activity is ['wind chime crunch' by GnoteSoundz on freesound](https://freesound.org/people/GnoteSoundz/sounds/169854/).  It was released under the CC0 license, effectively dedicating it to the public domain.  If you want to use a different sound you can change the filename in `Config.js`.
