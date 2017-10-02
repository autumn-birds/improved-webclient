"use strict";

var ModalEditDialog = new (function() {

    var overlay;
    window.LoadFunctions.push(function() {
        overlay = byID("modal-overlay");

        /* Make sure the dialog is not visible in the beginning. */
        hideEl(overlay);
    });

    /* Open the dialog: used by client functions that want to have some
       extended text input or edited by the user. Provide the initial
       text to edit (which can be just "") and callbacks to handle said
       text when the user finishes editing it. If the third parameter is
       undefined, the text will just be thrown away if the user cancels.
       The functions are otherwise called with the resulting text given
       as the sole parameter. */
    this.open = function(initialT, onOK, onCANCEL) {
        byID("edit-send").onclick = function(e) {
            onOK(byID("edit-txt").value);

            byID("edit-txt").value = "";
            hideDialog("edit");
        };

        byID("edit-cancel").onclick = function(e) {
            if(onCANCEL) {
                onCANCEL(byID("edit-txt").value);
            }

            byID("edit-txt").value = "";
            hideDialog("edit");
        };

        byID("edit-txt").value = initialT || "";
        showDialog("edit");
        byID("edit-txt").focus();
    };

    function showDialog(name) {
        var dialog = byID(name + "-dialog");

        if (dialog) {
            showEl(overlay);
            showEl(dialog);
            dialog.focus();
            return true;
        } else {
            return false;
        }
    }

    function hideDialog(name) {
        var dialog = byID(name + "-dialog");

        if (dialog) {
            hideEl(dialog);
        }

        hideEl(overlay);
        MuckInterface.grabInputFocus();
    }

}) () ;

window.LoadFunctions.push(function() {
    var overlay = byID("modal-overlay");

    /* To bring it up manually... */
    CommandManager.register(new Command("edit", function(arg) {
        ModalEditDialog.open("", function(txt) {
            MuckInterface.sendBlock(txt);
        });
    }).understand("e")
      .explain("Opens an 'editor' dialog that allows a block of text comprising " +
               "multiple lines to be composed or pasted in and sent to the server.")
      .click("input+"));

    /* ... and an ugly way to use it to catch ##edit> lines (a FuzzBall feature)... */
    MuckInterface.OnMuckText.push(function(el) {
        var txt = textOf(el);
        var prefix = "##edit> ";

        if(txt.indexOf(prefix) === 0) {
            txt = txt.slice(prefix.length); /* Chop off the '##edit> ' */

            var oldText = txt;
            if(should("NlInterp")) {
                txt = txt.replace(/ ?\{nl\}/g, "\n");
            }

            ModalEditDialog.open(txt, function(txt) {
                /* This is where the user pressed 'send' after editing. */
                if(should("NlInterp")) {
                    MuckInterface.sendBlock(txt.replace(/\n/g, " {nl}"));   /* Restore the MPI {nl}s */
                } else {
                    MuckInterface.sendBlock(txt.replace(/\n/g, ""));
                }
            }, function(abort) {
                /* This is where the user pressed 'cancel' -- we need to make sure
                   to send the OLD text, because the MUCK definitely expects SOMETHING
                   to be sent, but it would be very weird for the user if pressing 'cancel'
                   sent their edited version. */
                MuckInterface.sendBlock(oldText);   /* (The old version is still retained there.) */
            });

            return false;   /* stop the text here rather than going on down the chain of callbacks--
                               it won't show up (has been 'captured') */
        } else {
            return true;
        }
    });
});
