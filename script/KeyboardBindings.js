
/* KeyboardBindings.js

   Keyboard shortcuts

   Useful to know: if one of these functions FAILS, i.e. encounters some sort of exception
   and so stops working, the key will pass through to the browser, as the function doesn't
   get a chance to return 'false'.
   
   Also useful to know: modern browsers no longer allow you to rebind certain keyboard
   shortcuts, such as those for 'new window' or 'print'. Great work, browsers! */

/* Move between filters without reaching for a mouse each time. */
Mousetrap.bindGlobal('ctrl+n', function(e) {
    if(CurrentFilter.selectorElement.nextSibling &&
            CurrentFilter.selectorElement.nextSibling.childNodes[0] &&
            CurrentFilter.selectorElement.nextSibling.childNodes[0].onclick) {
        CurrentFilter.selectorElement.nextSibling.childNodes[0].onclick(e);
    }

    return false;       /* Tells Mousetrap to not let browser catch this key. */
});

Mousetrap.bindGlobal('ctrl+p', function(e) {
    if(CurrentFilter.selectorElement.previousSibling &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0] &&
            CurrentFilter.selectorElement.previousSibling.childNodes[0].onclick) {
        CurrentFilter.selectorElement.previousSibling.childNodes[0].onclick(e);
    }

    return false;
});

/* Close a filter from the keyboard. Also wants to move to the previous filter in
   the list -- and has to not trigger click events on a non-extant close button. */
Mousetrap.bindGlobal('ctrl+w', function(e) {
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
});

/* A cheap way to set custom prefixes, i.e. on a puppet filter that
   can't detect what the prefix should be on it's own. */
Mousetrap.bindGlobal('ctrl+l', function(e) {
    CurrentFilter.commandPrepend = document.getElementById("input-field").value;
    document.getElementById("input-field").value = "";
    MuckInterface.setInputHint(CurrentFilter.commandPrepend);

    return false;
});

/* Toggle the sidebar with the keyboard. */
Mousetrap.bindGlobal('ctrl+o', function(e) {
    Sidebar.toggleVisibility();

    return false;
});

/* Clear whatever you're writing into the input history. */
Mousetrap.bindGlobal('ctrl+k', function(e) {
    field = document.getElementById("input-field");
    MuckInterface.pushToHistory(field.value);
    field.value = "";

    return false;
});

Mousetrap.bindGlobal('ctrl+u', function(e) {
    document.getElementById("input-field").value = "";

    return false;
})

/* C-m works like you would expect from tinyfugue. */
Mousetrap.bindGlobal('ctrl+m', function(e) {
    MuckInterface.submitText();

    return false;   /* C-m mutes the tab in firefox... which is just... unnecessary */
});

/* Properly bind arrow keys to history commands. */
Mousetrap.bindGlobal('up', function(e) {
    MuckInterface.upArrow();
})

Mousetrap.bindGlobal('down', function(e) {
    MuckInterface.downArrow();
})
