
var MuckInterface = new (function() {

    var self = this;

    /* This thing governs both the user-interface used for interacting with the MUCK and the
       client's interaction with the MUCK server / websocket gateway / whatever. Which is to
       say, it's mostly just the scripting that was originally in index.html, though one of
       the first things I did was to take that out into its own file.

       Speaking of user-interface, this thing controls the input-field and deals with displaying
       lines from the MUCK, etc. */

    /* Public-facing things. */

    this.setInputHint               = function(mesg) {
        if(mesg && mesg != "") {
            document.getElementById("input-field").placeholder = mesg;
        } else{
            document.getElementById("input-field").placeholder = "Input Line";
        }
    };

    this.grabInputFocus             = function() {
        document.getElementById("input-field").focus();
    };

    this.pushToHistory              = function(txt) {
        /* We might as well avoid adding runs of duplicate lines to the command history. */
        if(lastLines[lastLines.length - 1] != txt) {
            lastLines.push(txt);
            return true;
        }
        return false;
    };

    /* 'Echo' some text;
       i.e., put a message for the user into the output window; it might be an idea to make the
       "--- " configurable sometime... */
    this.echo                       = function(txt) {
        addText("--- " + txt, true);
    };

    /* Iterate over all lines;
       will call the given function on each line received from the MUCK -- regardless of filteredness.
       Gives two parameters, the document-element of said line and the text of the line. */
    this.eachLine                   = function(fn, filtered) {
        filtered = filtered || false;

        var i;
        if(filtered) {
            var recvTextList = CurrentFilter.lineContainerElement.childNodes;
        } else {
            var recvTextList = FilterManager.EverythingFilter.lineContainerElement.childNodes;
        }

        for(i = 0; i < recvTextList.length; i++) {
            fn(recvTextList[i], textOf(recvTextList[i]));
        }
    };

    /* Add a filter's "body" element;
       for performance reasons, each filter saves a copy of all the lines it matches in its own
       unique <div>...</div> element; there's no "master" element. This is used by filters to
       append their container in the correct place in the page while they are being set up. */
    this.addFilterBody = function(el) {
        document.getElementById("filters").appendChild(el);
    };

    /* Public-facing events: hooked by index.html.

       I'm not sure if this is the best way to do this, again.  But I didn't want to scatter
       'this.<blah> = ...' through the file, it seemed messy. */

    this.lostFocus                 = function() {
        lostFocus();
    };

    this.gotFocus                  = function() {
        gotFocus();
    };

    this.submitEnter               = function(e, ev) {
        submitEnter(e, ev);
    };

    this.upArrow                   = function() {
        upArrow();
    };

    /* Maybe should be changed to something that takes 'the text' as a parameter? */
    this.submitText                = function() {
        submitText();
    };

    this.sendLine                  = function(txt) {
        sendToSocket(txt);
    };

    /* Send a 'block' of text, i.e., a string with newlines in it, as multiple sends, adding
       a small (configurable) delay between them so as not to make anyone on the other end
       Unhappy. */
    this.sendBlock                 = function(txt) {
        lines = txt.split("\n");

        lines.reverse();
        var intervalID;

        function sendOneLine() {
            var txt = lines.pop();

            if(txt === "" || txt === "\n") {
                txt += "   ";
            }

            MuckInterface.sendLine(txt);

            if(lines.length < 1) {
                window.clearInterval(intervalID);
            }
        }

        intervalID = window.setInterval(sendOneLine, Config.sendLineDelayMs);
    };

    /* Scroll down to the bottom of the window.
       Chrome broke our use of `body.scrollHeight` somewhere around v61. So we use
       the current filter's lineContainerElement instead. */
    this.scrollToEnd               = function() {
        window.scrollTo(0, CurrentFilter.lineContainerElement.scrollHeight);
    };

    // Starts the connection when the page has loaded.
    //
    this.startConnection = function() {
        connection = new TextgameProtocolClient();

        connection.onConnectionEstablished = function() {
            addText('--- CONNECTED', true);
        };

        connection.onDisconnection = function() {
            addText('--- DISCONNECTED', true);
        };

        connection.onLostConnection = function() {
            addText('--- Temporarily lost connection.  Attempting to reconnect...', true);
        };

        connection.onError = function(error) {
            addText('--- ERROR: ' + error, true);
        }

        connection.onReceivedTextLine = function(e) {
            if (e.indexOf(editPrefix) === 0) {
                // Found an edit line to put in the input line.  If they somehow
                // had something entered, save it off just in case that is more
                // important to them.
                //
                var line = e.slice(editPrefix.length);
                var inputText = document.getElementById("input-field");

                if (inputText.value.length > 0) {
                    lastLine = inputText.value;
                }

                inputText.value = line;
            } else {
                addText(e);
            }
        }

        connection.connect(Config.gateway);

        // Tries to stop the connection when the page is closed / navigated away
        //
        window.onunload = function() {
            connection.disconnect();
        };
    };

    window.LoadFunctions.push(this.startConnection);

    this.stopConnection = function() {
        connection.disconnect();
        connection = undefined;
    };

    /* Public-facing 'hooks';
       fairly self explanatory; will be called, in order, on the associated line of text.
       OnPlayerText() calls get to mutate the thing they're given; they should return the
       line of text, or 'false' to stop and throw it out (i.e. if you want to catch something.)
       OnMuckText() is given a DOM element for each line coming from the MUCK; it should use
       textOf(myDomElement) to find the plaintext if it wants it. Don't try to mutate the text
       coming from the MUCK: it won't work. */
    this.OnPlayerText               = [];
    this.OnMuckText                 = [];



    /* Not-public-facing things / internal logic. */

    var connection;
    var lastLines = [ ];
    var llPos = -1;       /* How far into lastLines (cmd history) has the player gone?) */
    var origTitle = document.title;
    var focus = true;
    var editPrefix = "##edit&gt ";

    var matchStrings =
        [/.*In a page-pose to .*/g,
        /.* pages, \".*\" to .*/g,
        /From afar.*/g,
        /.* whispers, \".*\" to .*/g,
        /.*has disconnected.*/g,
        /.*has connected.*/g,
        /^##.*/g];

    // Called when we get text from the MUCK -- by code down below.
    //
    function addText(text, needHighlight) {

        // Process input for ANSI color and links.
        text = ansi_up.linkify(ansi_up.ansi_to_html(ansi_up.escape_for_html(text)));

        // See if we need to highlight it.  This entails removing all HTML
        // first.  From https://stackoverflow.com/questions/5002111/javascript-how-to-strip-html-tags-from-string#5002618
        // Could also try strInputCode.replace(/<\/?[^>]+(>|$)/g, "");  In this special situation.
        //
        var el = elem("div", text, "muckRecvText");

        if (determineIfHighlight(textOf(el)) || needHighlight) {
            text = '<em>' + text + '</em>';
        }

        // Build the new DOM element.
        var newItem = document.createElement("div");
        newItem.className = "muckRecvText";
        newItem.innerHTML = text;

        /* CHANGED: Apply callbacks that want to respond to MUCK text -- includes Filter callback
           that actually puts said text in one or more display windows ... */
        var i; var cont;
        for(i = 0; i < MuckInterface.OnMuckText.length; i++) {
            cont = MuckInterface.OnMuckText[i](el);
            if(!cont) {
                break;
            }
        }

        // Enforce a limit of how many lines to keep 'in memory'.  Doesn't work: TODO would need to
        // be moved to Filter -- somewhere.
        /*var recvTextList = document.getElementsByClassName("muckRecvText");

        if (recvTextList.length > Config.maxHistoryLines) {
            for (var count = 0; count < 15; ++count) {
                outputArea.removeChild(recvTextList[0]);
            }
        } */

        // Scroll to the bottom of the window + other UI-update things.
        /*      Scrolling moved to Filters.js to fix case where new activity that didn't show up on
                the currently visible 'display' makes the window jump down anyway. */
        // window.scrollTo(0, document.body.scrollHeight);

        if (!focus) {
            document.title = "[! ACTIVITY DETECTED !] " + origTitle;

            /* Someone requested a way to play a sound when the client was in the background
               and a message arrived, so -- here we go. */
            if(should("Chime")) {
                /* Just to be sure (in case, say, the audio API isn't supported for some reason,
                   or the audio file isn't present) this won't raise an error and stop the rest
                   of something calling this function, put it into a tiny delayed callback
                   instead. */
                setTimeout(function() {
                    /* http://stackoverflow.com/questions/9419263/playing-audio-with-javascript#18628124 */
                    var audio = new Audio(Config.chimeSoundFile);
                    audio.play();
                }, 10);
            }
        }
    }

    // Returns true if the text provided should be highlighted,
    //
    function determineIfHighlight(text) {
        for (var index = 0; index < matchStrings.length; ++index) {
            if (text.match(matchStrings[index]) !== null) {
                return true;
            }
        }

        return false;
    }

    // Sends text from the input line to the websocket.
    //
    function submitText() {
        var inputText = document.getElementById("input-field");
        var text      = inputText.value;

        /* Apply 'hook' functions... */
        var i;
        for(i = 0; i < MuckInterface.OnPlayerText.length && text; i++) {
            text = MuckInterface.OnPlayerText[i](text);
        }

        if(typeof text == 'string') {    /* (make sure we don't send when a 'hook' wants us not to) */
            connection.sendLine(text);
        }

        if(text) { MuckInterface.pushToHistory(text); }

        inputText.value = "";
        /* We might have just entered a line from history again: if that's the case, let's go
           ahead and reset llPos, so we think we're at the beginning of history again. */
        llPos = -1;
    }

    /* Send arbitrary user-specified text to the websocket;
       we don't particularly want to care about 'input hooks' anyway, in this case, which would, probably,
       give some unexpected results since the input hooks were all written with actual user input in mind. */
    function sendToSocket(txt) {
        if(typeof txt === "string") {
            connection.sendLine(txt);
        }
    }

    // Puts the last submitted line back on the input line if the input line
    // is currently empty
    //
    upArrow = this.upArrow = function() {
        // Up arrow pressed
        var inputText = document.getElementById("input-field");

        if(llPos == -1 && inputText.value.length > 0) {
            /* The user has entered something, but has not yet sent it; it's still written
               in the input line, but the user wants to go back in history. Let's put
               the line they've been working on writing into the history buffer so they
               won't lose it. */
            if(MuckInterface.pushToHistory(inputText.value)) {
                llPos += 1;    /* Let's not just move up onto the very same line that we just
                                  added to history; let's move past it instead. */
            }
        }

        if(llPos + 1 < lastLines.length) {    /* llPos is 0-indexed */
            llPos += 1;
            inputText.value = lastLines[(lastLines.length - 1) - llPos]; /* We want to start
                                                    from the END of the list--where the most
                                                    recently added lines are. */
        }

        return true;
    }

    downArrow = this.downArrow = function() {
        var inputText = document.getElementById("input-field");

        /* Down arrow pressed.  Just following the way it was laid out originally
           for now. */
        if(llPos > -1) {
            llPos -= 1;
            if(llPos >= 0) {
                inputText.value = lastLines[(lastLines.length - 1) - llPos];
            } else {
                inputText.value = "";
            }
        }

        return true;
    }

    // Sends the given input line to the websocket if enter is pressed, or
    // calls upArrow() if the up arrow is pressed instead.
    //
    /* Basically, this is where we would put any custom keyboard handler stuff
       for when keys are pressed in the inputline. */
    function submitEnter(myfield,e) {
        var keycode;

        if (window.event) {
            keycode = window.event.keyCode;
        } else if (e) {
            keycode = e.keyCode;
        } else {
            return true;
        }

        if (keycode == 13) {
            // Enter pressed
            submitText();
            return false;
        } else {
            return true;
        }
    }

    function lostFocus() {
        focus = false;

        return true;
    }

    // Indicates we have focus.  Change title back to default and do not
    // update it.
    //
    function gotFocus() {
        focus = true;
        document.title = origTitle;

        return true;
    }

}) () ;
