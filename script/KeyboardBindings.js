
/* KeyboardBindings.js

   Keyboard shortcuts

   Useful to know: if one of these functions FAILS, i.e. encounters some sort of exception
   and so stops working, the key will pass through to the browser, as the function doesn't
   get a chance to return 'false'.
   
   Also useful to know: modern browsers no longer allow you to rebind certain keyboard
   shortcuts, such as those for 'new window' or 'print'. Great work, browsers! */

var KeyboardBindings = new (function() {

    var self = this;

    this.keys = {};

    this.key = function(key, callback) {
        if(key.length !== 1) {
            throw "Keys should be a single letter";
        }

        Mousetrap.bindGlobal('ctrl+' + key, callback);
        Mousetrap.bindGlobal('alt+'  + key, callback);
        return {
            key: key,
            does: function(what) {
                self.keys[key] = what;
            }
        };
    };

}) () ;

KeyboardBindings.key('n', function(e) {
    if(CurrentFilter.selectorElement.nextSibling &&
            CurrentFilter.selectorElement.nextSibling.childNodes[0] &&
            CurrentFilter.selectorElement.nextSibling.childNodes[0].onclick) {

        CurrentFilter.selectorElement.nextSibling.childNodes[0].onclick(e);
    }

    return false;       /* Tells Mousetrap to not let browser catch this key. */
}).does('Move to the next view');

KeyboardBindings.key('p', function(e) {
    if(CurrentFilter.selectorElement.previousSibling &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0] &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0].onclick) {
        CurrentFilter.selectorElement.previousSibling.childNodes[0].onclick(e);
    }

    return false;
}).does('Move to the previous view');

KeyboardBindings.key('w', function(e) {
    var prev = false;

    if(CurrentFilter.selectorElement.previousSibling &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0] &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0].onclick) {
        prev = CurrentFilter.selectorElement.previousSibling.childNodes[0];
    }

    if(CurrentFilter.selectorCloseEl && CurrentFilter.selectorCloseEl.onclick) {
        CurrentFilter.selectorCloseEl.onclick(e);
        prev.onclick(e);
    }

    return false;
}).does('Close the current view');

KeyboardBindings.key('l', function(e) {
    CurrentFilter.commandPrepend = document.getElementById("input-field").value;
    document.getElementById("input-field").value = "";
    MuckInterface.setInputHint(CurrentFilter.commandPrepend);

    return false;
}).does('Set filter prefix');


KeyboardBindings.key('o', function(e) {
    Sidebar.toggleVisibility();

    return false;
}).does('Toggle sidebar visibility');

KeyboardBindings.key('k', function(e) {
    field = document.getElementById("input-field");
    MuckInterface.pushToHistory(field.value);
    field.value = "";

    return false;
}).does('Kill input to history');

KeyboardBindings.key('u', function(e) {
    document.getElementById("input-field").value = "";

    return false;
}).does('Destroy input');



/* C-m works like you would expect from tinyfugue. */
Mousetrap.bindGlobal('ctrl+m', function(e) {
    MuckInterface.submitText();

    return false;   /* C-m mutes the tab in firefox... which is just... unnecessary */
});

/* Properly bind arrow keys to history commands. */
Mousetrap.bindGlobal('up', function(e) {
    MuckInterface.upArrow();
});

Mousetrap.bindGlobal('down', function(e) {
    MuckInterface.downArrow();
});
