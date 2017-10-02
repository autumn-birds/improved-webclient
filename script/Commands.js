
/* Commands.js

   Just like in tinyfugue: /commands.

   Works from hooks in MuckInterface.js, etc. */

function Command(name, fn) {

    this.names                  = [name];

    this.execute                = fn;

    this.help                   = "(We don't know what this does.)";

    /* Add 'alias' to the list of names this command will respond to, and return the
       same object so that calls can be chained together if desired. */
    this.understand             = function(alias) {
        this.names.push(alias);
        return this;
    };

    /* Set the 'help' to argument, and return the same object so that calls can be
       chained together if desired. */
    this.explain                = function(documentation) {
        this.help = documentation;
        return this;
    };

    /* Add an element to allow this command to be called graphically, optionally
       prompting for arguments --pass the prompt in the second parameter. */
    var self = this;

    this.click                  = function(text, askForArgument, defArg) {
        /* This should, probably, really work before the 'Sidebar' part is loaded. But...
                oh well. */

        if(askForArgument) {
            Sidebar.addCmdLink(text, function() {
                var arg = prompt(askForArgument, defArg || "");

                if(typeof(arg) === "string") {
                    MuckInterface.grabInputFocus();  /* the user clicked on the link, changing focus */
                    self.execute(arg);       /* ... at least one command wants to put the focus on
                                                something else; therefore, we do this after putting
                                                focus back on the input line. */
                }
            });

        } else {
            Sidebar.addCmdLink(text, function() {
                MuckInterface.grabInputFocus();
                self.execute("");
            });
        }

        return this;
    };

}

var CommandManager = new (function() {

    var CommandList             = [];

    /* Add a command ('cmd') to the list. */
    this.register               = function(cmd) {
        if(cmd.names && cmd.execute && cmd.help) {
            CommandList.push(cmd);
        } else {
            console.log("Warning: tried to register something that didn't have a command-ish "+
                        "interface as a command...");
        }
    };


    /* The built-in 'help' command. */
    this.register(new Command("help", function(arg) {
        MuckInterface.echo(" HELP / COMMANDS LIST ");
        var i, j;

        for(i = 0; i < CommandList.length; i++) {
            /* Not really the best way to do this. */
            for(j = 0; j < CommandList[i].names.length; j++) {
                MuckInterface.echo("/" + CommandList[i].names[j]);
            }

            MuckInterface.echo("    " + CommandList[i].help);
            MuckInterface.echo(" ");
        }

    }).understand("h")
      .explain("Show help for all the commands installed.")
      .click("help"));


    /* Add a hook to detect when the user tries to call a /command, catch it and run the
       command. */
    MuckInterface.OnPlayerText.push(function(txt) {
        var i, j;

        if(txt[0] != '/') { return txt; }

        for(i = 0; i < CommandList.length; i++) {
            for(j = 0; j < CommandList[i].names.length; j++) {
                var prefix = "/" + CommandList[i].names[j];

                if(txt.indexOf(prefix) === 0) {
                    CommandList[i].execute(txt.slice(prefix.length + 1));   // +1 for the extra space

                    return false;
                }
            }
        }

        MuckInterface.echo("Command not found. Perhaps you would like to type /help?");
        return false;
    });

}) () ;
