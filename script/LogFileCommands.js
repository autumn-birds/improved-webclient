
/* LogFileCommands.js

   Code that deals with offering a log for download and with writing a text file
   to the server. */

window.LoadFunctions.push(function() {
    /* Command to save a log. */
    CommandManager.register(new Command("saveLog", function(arg) {
        var lines = [];

        MuckInterface.eachLine(function(elem, text) {
            if(elem.style.display != "none") {
                lines.push(text);
            }
        }, true);   /* Second parameter -- only go over what's in CurrentFilter */

        if(arg.match(/[A-Za-z]/)) {
            saveTextFile(arg + ".txt", lines.join("\n"));
        } else {
            saveTextFile("log.txt",    lines.join("\n"));
        }
    }).understand("log")
      .explain("Attempts to offer a text file with all text seen in the current output window thus far "+
               "for download. You can specify the filename as an optional parameter to this command.")
      .click("save log"));


    if(window.File && window.FileReader) {

        /* How to write a file;
           this will prompt the user for a particular file to 'upload' and send that, one line at a time... */

        var selector = document.getElementById("fileSelectorElement");

        /* This event is fired when the file selected in the fileSelectorElement changes, or is add, or...etc. So
           this event does most of the work. */
        selector.onchange = function() {
            if(selector.files[0]) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    /* Here, reader.result gives the text of the file, when this is called due to the call just below
                       it. */

                    MuckInterface.sendBlock(reader.result);
                }

                reader.readAsText(selector.files[0]);
            }
        };

        /* ... and this turns out just to need to fire off the hidden selector element. */
        CommandManager.register(new Command("putFile", function(arg) {
            selector.click();
        }).understand("put")
          .explain("Asks for a file to upload. Make sure it's a text file. The file is broken into lines "+
                   "and sent to the server line by line. The client will insert spaces in any otherwise blank lines "+
                   "to ensure they register.")
          .click("send textfile") );

    }

});
