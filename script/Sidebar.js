
/* Sidebar.js

   Controls the sidebar, and does User Interface control relating to the sidebar. (Currently
   this is used just to show the list of available Filters, but presumably you could also put
   other things in it. Maybe.)

   Side note: it might seem like ( sidebarElem.style.display = ""; ) would hide the element. It
   doesn't: it shows it. Weird, right? */

var Sidebar = new (function() {

    /* Public interface. */

    this.toggleVisibility       = function() {
        visible = !visible;

        realiseVisibility();
    };

    /* Add 'obj' to the sidebar as a selectable object/option;
       'obj' should have variable .name and a callback .selected(). .selected() will be called
       when the object's document-element is clicked. Object's variable .selectorElement will be
       set to the link used to 'select' object; the object can, thus, update the appearance of
       its link to indicate activity, etc. */
    this.add                    = function(obj, sorted) {
        sorted = sorted || true;

        /* We don't actually implement sorting yet, and might never, but...

           (One possible option: have different 'classes' of thing, and sort the selectable-objects
           according to what class they were in.  But then you have to remember what class a thing
           is in.) */

        var newItem = document.createElement("div");
        newItem.className = "listItem";
        newItem.innerHTML = obj.name;

        /*newItem.onclick = function(e) {
            obj.selected();
            e.preventDefault();
        };*/

        sidebarElem.appendChild(newItem);
        obj.selectorElement = newItem;

        obj.setupElements();

        return obj;    /* so it can be used to set CurrentFilter below */
    };

    this.remv                   = function(obj) {
        sidebarElem.removeChild(obj.selectorElement);
        obj.selectorElement = null;
    };

    this.addCmdLink             = function(txt, fn) {
        e = elem("span", txt, "listItem");
        e.onclick = fn;

        /* The linkElem is probably going to be 'undefined'....... because it hasn't
           been fetched from the document, because document not fully loaded.  SO we
           did this kind of dumb thing to queue up the requests if it hasn't been loaded.

           I suppose the alternate approach might have just been to put the scripts at
           the END of the page. So that, theoretically, everything would already have been
           loaded. */
        if(linkElem) {
            linkElem.appendChild(e);
            linkElem.appendChild(elem("span", "&nbsp;&#8226; "));
        } else {
            window.LoadFunctions.push(function() {
                linkElem.appendChild(e);
                linkElem.appendChild(elem("span", "&nbsp;&#8226; "));
            });
        }
    };

    /* Everything else: */

    var sidebarElem             = null;  /* the sidebar */
    var mainElem                = null;  /* the MUCK interface (lines + inputline) */

    var linkElem                = null;

    var toggleControl           = null;  /* control (on top of page) to turn sidebar on/off */

    var visible                 = true;

    /* Make the elements on the page conform to the 'visible' variable.  And their
       correct widths. */
    function realiseVisibility() {
        if(window.innerWidth > Config.sidebarBreakWidth) {
            toggleControl.style.display = "none";

            if(visible) {
                sidebarElem.style.display      = "";

                sidebarElem.style.width = (Config.sidebarWidth)       + "%";
                mainElem.style.width    = (98 - Config.sidebarWidth)  + "%";
            } else {
                sidebarElem.style.display      = "none";

                sidebarElem.style.width = (Config.sidebarWidth)       + "%";
                mainElem.style.width    = "100%";
            }
        /* This pretty much corresponds to the CSS @media queries we had before.  If you're
           on a small screen... window... whatever... we will make the sidebar 'float' over
           the MUCK window, rather than cutting your already narrow view in half. We also
           provide a nice thing you can click on to show it and hide it. */
        } else {
            toggleControl.style.display = "";
            mainElem.style.width        = "100%";

            sidebarElem.style.width     = (Config.sidebarWidthForSmallWindow) + "%";

            if(visible) {
                sidebarElem.style.display = "";

                toggleControl.innerHTML = "^^^";
            } else {
                sidebarElem.style.display = "none";

                toggleControl.innerHTML = "VVV";
            }
        }
    }

    window.LoadFunctions.push(function() {
        sidebarElem             = document.getElementById("sidebar-area");
        mainElem                = document.getElementById("scrollable-area");
        toggleControl           = document.getElementById("showhide-sidebar-area");
        linkElem                = document.getElementById("controlLinkContainer");  /* for custom controls/links/etc. */

        /* Add an initial '|' for balance. */
        linkElem.appendChild(elem("span", " &#8226; "));

        /* Callback for showing/hiding the sidebar;
           this matters when you have a small screen and don't want to divide it in half (on larger
           screens we don't do that, and this won't be used.) */
        toggleControl.innerHTML = "^^^";
        toggleControl.onclick = function(e) {
            e.preventDefault();

            Sidebar.toggleVisibility();
        };

        /* Hook for resizing the window ... */
        window.ResizeFunctions.push(function(e) {
            realiseVisibility();
        });

        CommandManager.register(new Command("toggleSidebar", function(txt) {
            Sidebar.toggleVisibility();
        }).understand("ts")
          .explain("Toggle the sidebar on or off."));

        /* Give things their initial widths, on startup. */
        realiseVisibility();
    });

}) () ;
